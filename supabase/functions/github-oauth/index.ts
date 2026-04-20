// supabase/functions/github-scan/index.ts
// Scans GitHub for all OAuth apps and installations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = { 
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Risk scoring logic
function scoreGithubApp(scopes: string[]): { score: number; severity: string } {
  let score = 10;
  const highRisk = ["repo", "admin:org", "delete_repo", "admin:enterprise", "write:org"];
  const medRisk = ["workflow", "packages", "read:org", "gist"];

  for (const s of scopes) {
    if (highRisk.some(h => s.includes(h))) score += 25;
    else if (medRisk.some(m => s.includes(m))) score += 12;
    else score += 5;
  }
  score = Math.min(score, 100);
  const severity = score >= 70 ? "critical" : score >= 50 ? "high" : score >= 30 ? "medium" : "low";
  return { score, severity };
}

function isHighRiskScope(scope: string): boolean {
  return ["repo", "admin:org", "delete_repo", "admin:enterprise", "write:org", "workflow"].some(h => scope.includes(h));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { org_id, platform_id } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get stored token
    const { data: tokenRow } = await supabase.from("platform_tokens").select("*").eq("org_id", org_id).eq("platform", "github").single();
    if (!tokenRow) throw new Error("No GitHub token found");

    const token = tokenRow.access_token;
    const headers = { Authorization: `Bearer ${token}`, "User-Agent": "ScopeGuard", Accept: "application/vnd.github+json" };

    // Get authorized OAuth apps (tokens the user has granted)
    const authRes = await fetch("https://api.github.com/user/installations", { headers });
    const authData = await authRes.json();
    const installations = authData.installations || [];

    // Get orgs to scan their OAuth apps
    const orgsRes = await fetch("https://api.github.com/user/orgs", { headers });
    const orgs = await orgsRes.json();

    const appsToUpsert = [];
    const permissionsToUpsert = [];
    const alertsToCreate = [];

    // Process GitHub App installations
    for (const install of installations) {
      const appName = install.app_slug || install.app_id?.toString() || "Unknown GitHub App";
      const scopes = Object.keys(install.permissions || {});
      const { score, severity } = scoreGithubApp(scopes);

      const lastActive = install.updated_at || install.created_at;
      const daysSince = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);
      const isStale = daysSince > 90;

      appsToUpsert.push({
        org_id, platform_id, name: appName,
        publisher: install.account?.login || "GitHub",
        verified: true, connection_type: "GitHub App",
        risk_score: score, severity,
        users_affected: install.target_type === "Organization" ? (orgs.length || 1) : 1,
        users_type: "users", is_stale: isStale,
        last_active_at: lastActive,
        connected_at: install.created_at,
        is_revoked: false,
        notes: `GitHub App installation ID: ${install.id}`,
      });

      // Permissions
      for (const [perm, level] of Object.entries(install.permissions || {})) {
        permissionsToUpsert.push({ scope: `${perm}:${level}`, is_high_risk: isHighRiskScope(perm) });
      }

      // Auto-generate alerts
      if (severity === "critical") {
        alertsToCreate.push({
          org_id, app_id: null, severity: "critical",
          title: `${appName} has critical GitHub permissions`,
          detail: `This app holds ${scopes.filter(s => isHighRiskScope(s)).join(", ")} permissions on your GitHub organization.`,
          tags: scopes.filter(s => isHighRiskScope(s)).slice(0, 3),
          compliance_ref: "SOC 2", status: "open",
        });
      }
      if (isStale) {
        alertsToCreate.push({
          org_id, app_id: null, severity: "high",
          title: `${appName} token unused for ${daysSince} days`,
          detail: `This GitHub app has not been active for ${daysSince} days but still holds active permissions.`,
          tags: [`${daysSince} days inactive`, "Stale token"],
          compliance_ref: "SOC 2", status: "open",
        });
      }
    }

    // Upsert apps
    for (const app of appsToUpsert) {
      const { data: savedApp } = await supabase.from("connected_apps").upsert(app, { onConflict: "org_id,platform_id,name" }).select().single();
      if (savedApp) {
        for (const perm of permissionsToUpsert) {
          await supabase.from("app_permissions").upsert({ app_id: savedApp.id, ...perm }, { onConflict: "app_id,scope" });
        }
        // Fix alert app_id
        for (const alert of alertsToCreate) {
          if (alert.title.includes(savedApp.name)) alert.app_id = savedApp.id;
        }
      }
    }

    // Save alerts (avoid duplicates)
    for (const alert of alertsToCreate) {
      if (alert.app_id) {
        const { data: existing } = await supabase.from("alerts").select("id").eq("app_id", alert.app_id).eq("title", alert.title).eq("status", "open").single();
        if (!existing) await supabase.from("alerts").insert(alert);
      }
    }

    // Update platform sync time
    await supabase.from("platforms").update({ last_synced_at: new Date().toISOString(), status: "active" }).eq("id", platform_id);

    return new Response(JSON.stringify({ success: true, apps_found: appsToUpsert.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});