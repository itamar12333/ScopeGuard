// supabase/functions/github-scan/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function scoreApp(scopes: string[]): { score: number; severity: string } {
  let score = 10;
  for (const s of scopes) {
    if (["admin:org","delete_repo","write:org","admin:enterprise"].some(h => s.includes(h))) score += 25;
    else if (["repo","workflow","packages","read:org"].some(h => s.includes(h))) score += 12;
    else score += 5;
  }
  score = Math.min(score, 100);
  return { score, severity: score >= 70 ? "critical" : score >= 50 ? "high" : score >= 30 ? "medium" : "low" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { org_id, platform_id } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: tokenRow } = await supabase.from("platform_tokens")
      .select("*").eq("org_id", org_id).eq("platform", "github").single();
    if (!tokenRow) throw new Error("No GitHub token found");

    const token = tokenRow.access_token;
    const headers = { Authorization: `Bearer ${token}`, "User-Agent": "ScopeGuard", Accept: "application/vnd.github+json" };

    const appsToUpsert: any[] = [];

    // Get repos
    const reposRes = await fetch("https://api.github.com/user/repos?per_page=100&type=all", { headers });
    const repos = await reposRes.json();

    if (Array.isArray(repos)) {
      for (const repo of repos.slice(0, 20)) {
        // Webhooks
        const hooksRes = await fetch(`https://api.github.com/repos/${repo.full_name}/hooks`, { headers });
        if (hooksRes.ok) {
          const hooks = await hooksRes.json();
          if (Array.isArray(hooks)) {
            for (const hook of hooks) {
              const url = hook.config?.url || "Unknown";
              let domain = url;
              try { domain = new URL(url).hostname; } catch {}
              const daysSince = Math.floor((Date.now() - new Date(hook.updated_at || hook.created_at).getTime()) / 86400000);
              const { score, severity } = scoreApp(hook.events || []);
              appsToUpsert.push({
                org_id, platform_id,
                name: `Webhook: ${domain}`,
                publisher: domain,
                verified: hook.active,
                connection_type: "Webhook",
                risk_score: score, severity,
                users_affected: 1, users_type: "repos",
                is_stale: daysSince > 90,
                last_active_at: hook.updated_at || hook.created_at,
                connected_at: hook.created_at,
                is_revoked: false,
                notes: `Repo: ${repo.full_name}, Events: ${(hook.events || []).join(", ")}`,
              });
            }
          }
        }

        // Deploy keys
        const keysRes = await fetch(`https://api.github.com/repos/${repo.full_name}/keys`, { headers });
        if (keysRes.ok) {
          const keys = await keysRes.json();
          if (Array.isArray(keys)) {
            for (const key of keys) {
              const daysSince = Math.floor((Date.now() - new Date(key.created_at).getTime()) / 86400000);
              appsToUpsert.push({
                org_id, platform_id,
                name: `Deploy Key: ${key.title || "Unnamed"}`,
                publisher: "GitHub", verified: true,
                connection_type: "Deploy Key",
                risk_score: key.read_only ? 20 : 55,
                severity: key.read_only ? "low" : "high",
                users_affected: 1, users_type: "repos",
                is_stale: daysSince > 180,
                last_active_at: key.created_at,
                connected_at: key.created_at,
                is_revoked: false,
                notes: `Repo: ${repo.full_name}, Read only: ${key.read_only}`,
              });
            }
          }
        }
      }
    }

    // OAuth token scopes
    const userRes = await fetch("https://api.github.com/user", { headers });
    const tokenScopes = userRes.headers.get("x-oauth-scopes") || "";
    const scopes = tokenScopes.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (scopes.length > 0) {
      const { score, severity } = scoreApp(scopes);
      appsToUpsert.push({
        org_id, platform_id,
        name: "ScopeGuard OAuth Token",
        publisher: "ScopeGuard", verified: true,
        connection_type: "OAuth Token",
        risk_score: score, severity,
        users_affected: 1, users_type: "users",
        is_stale: false,
        last_active_at: new Date().toISOString(),
        connected_at: new Date().toISOString(),
        is_revoked: false,
        notes: `Scopes: ${scopes.join(", ")}`,
      });
    }

    // Upsert all
    for (const app of appsToUpsert) {
      await supabase.from("connected_apps")
        .upsert(app, { onConflict: "org_id,platform_id,name" });
    }

    await supabase.from("platforms")
      .update({ last_synced_at: new Date().toISOString(), status: "active" })
      .eq("id", platform_id);

    return new Response(JSON.stringify({ success: true, apps_found: appsToUpsert.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("github-scan error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});