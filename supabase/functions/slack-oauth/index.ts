// supabase/functions/slack-scan/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = { 
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function scoreSlackApp(scopes: string[]): { score: number; severity: string } {
  let score = 10;
  const critical = ["channels:history", "files:read", "admin", "users:read.email", "calls:read"];
  const high = ["channels:read", "groups:read", "im:read", "mpim:read", "users:read"];
  const med = ["chat:write", "reactions:read", "pins:read", "bookmarks:read"];

  for (const s of scopes) {
    if (critical.some(c => s.includes(c))) score += 22;
    else if (high.some(h => s.includes(h))) score += 14;
    else if (med.some(m => s.includes(m))) score += 7;
    else score += 3;
  }
  score = Math.min(score, 100);
  const severity = score >= 70 ? "critical" : score >= 50 ? "high" : score >= 30 ? "medium" : "low";
  return { score, severity };
}

function isHighRiskSlackScope(scope: string): boolean {
  return ["channels:history", "files:read", "admin", "users:read.email", "calls:read", "groups:history"].some(h => scope.includes(h));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { org_id, platform_id } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: tokenRow } = await supabase.from("platform_tokens").select("*").eq("org_id", org_id).eq("platform", "slack").single();
    if (!tokenRow) throw new Error("No Slack token found");

    const token = tokenRow.access_token;

    // Get all installed apps in workspace
    const appsRes = await fetch("https://slack.com/api/apps.permissions.info", {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Get workspace apps list
    const installedRes = await fetch("https://slack.com/api/admin.apps.approved.list?limit=100", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const installedData = await installedRes.json();

    // Get team info for user count
    const teamRes = await fetch("https://slack.com/api/team.info", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const teamData = await teamRes.json();

    // Get users count
    const usersRes = await fetch("https://slack.com/api/users.list?limit=1", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const usersData = await usersRes.json();
    const memberCount = usersData.response_metadata?.total_count || 0;

    // Get authorized apps via oauth.v2.access info
    const authRes = await fetch("https://slack.com/api/auth.test", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const authData = await authRes.json();

    const apps = installedData.approved_apps || [];
    const appsToUpsert = [];
    const alertsToCreate = [];

    for (const app of apps) {
      const appInfo = app.app || {};
      const scopes = (appInfo.scopes?.bot_scopes || []).concat(appInfo.scopes?.user_scopes || []);
      const { score, severity } = scoreSlackApp(scopes);

      const lastActivity = app.last_resolved_by?.date || appInfo.date_created;
      const daysSince = lastActivity ? Math.floor((Date.now() - new Date(lastActivity * 1000).getTime()) / 86400000) : 0;
      const isStale = daysSince > 90;

      appsToUpsert.push({
        org_id, platform_id,
        name: appInfo.name || "Unknown Slack App",
        publisher: appInfo.published_by?.name || "Unknown",
        verified: appInfo.is_app_directory_approved || false,
        connection_type: "OAuth",
        risk_score: score, severity,
        users_affected: memberCount,
        users_type: "users",
        is_stale: isStale,
        last_active_at: lastActivity ? new Date(lastActivity * 1000).toISOString() : new Date().toISOString(),
        connected_at: appInfo.date_created ? new Date(appInfo.date_created * 1000).toISOString() : new Date().toISOString(),
        is_revoked: false,
        notes: appInfo.description || null,
      });

      if (severity === "critical") {
        alertsToCreate.push({
          org_id, app_id: null, severity: "critical",
          title: `${appInfo.name} has critical Slack permissions`,
          detail: `This app can read ${scopes.filter(s => isHighRiskSlackScope(s)).join(", ")} across your workspace.`,
          tags: scopes.filter(s => isHighRiskSlackScope(s)).slice(0, 3),
          compliance_ref: "SOC 2", status: "open",
        });
      }
      if (!appInfo.is_app_directory_approved) {
        alertsToCreate.push({
          org_id, app_id: null, severity: "high",
          title: `Unverified app "${appInfo.name}" connected to Slack`,
          detail: `This app is not listed in the Slack App Directory and has not been verified.`,
          tags: ["Unverified publisher", `${memberCount} users affected`],
          compliance_ref: "SOC 2", status: "open",
        });
      }
    }

    // Upsert all apps
    for (const app of appsToUpsert) {
      const { data: savedApp } = await supabase.from("connected_apps").upsert(app, { onConflict: "org_id,platform_id,name" }).select().single();
      if (savedApp) {
        const scopes = (apps.find((a: any) => a.app?.name === savedApp.name)?.app?.scopes?.bot_scopes || []);
        for (const scope of scopes) {
          await supabase.from("app_permissions").upsert({ app_id: savedApp.id, scope, is_high_risk: isHighRiskSlackScope(scope) }, { onConflict: "app_id,scope" });
        }
        for (const alert of alertsToCreate) {
          if (alert.title.includes(savedApp.name)) alert.app_id = savedApp.id;
        }
      }
    }

    for (const alert of alertsToCreate) {
      if (alert.app_id) {
        const { data: existing } = await supabase.from("alerts").select("id").eq("app_id", alert.app_id).eq("title", alert.title).eq("status", "open").single();
        if (!existing) await supabase.from("alerts").insert(alert);
      }
    }

    await supabase.from("platforms").update({ last_synced_at: new Date().toISOString(), status: "active" }).eq("id", platform_id);

    return new Response(JSON.stringify({ success: true, apps_found: appsToUpsert.length, team: teamData.team?.name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});