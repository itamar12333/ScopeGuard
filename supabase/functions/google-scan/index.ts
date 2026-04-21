import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { org_id, platform_id } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: tokenRow } = await supabase.from("platform_tokens")
      .select("*").eq("org_id", org_id).eq("platform", "google").single();
    if (!tokenRow) throw new Error("No Google token");

    const token = tokenRow.access_token;
    const h = { Authorization: `Bearer ${token}` };
    const appsToSave: any[] = [];

    // Get authorized apps via Google OAuth2 token info
    const tokenInfoRes = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
    const tokenInfo = await tokenInfoRes.json();
    console.log("Token info:", JSON.stringify(tokenInfo));

    // Add the OAuth connection itself
    const scopes = (tokenInfo.scope || "").split(" ").filter(Boolean);
    let score = 20;
    if (scopes.some((s: string) => s.includes("admin"))) score += 40;
    if (scopes.some((s: string) => s.includes("drive"))) score += 20;
    if (scopes.some((s: string) => s.includes("gmail"))) score += 20;

    appsToSave.push({
      org_id, platform_id,
      name: "Google OAuth Connection",
      publisher: "Google",
      verified: true,
      connection_type: "OAuth",
      risk_score: Math.min(score, 100),
      severity: score >= 70 ? "critical" : score >= 50 ? "high" : score >= 30 ? "medium" : "low",
      users_affected: 1, users_type: "users",
      is_stale: false, is_revoked: false,
      last_active_at: new Date().toISOString(),
      connected_at: new Date().toISOString(),
      notes: `Scopes: ${scopes.join(", ")} | Email: ${tokenInfo.email || "unknown"}`,
    });

    // Try to get Google Workspace apps (requires admin.googleapis.com)
    const appsRes = await fetch("https://admin.googleapis.com/admin/reports/v1/activity/users/all/applications/token?maxResults=100", { headers: h });
    if (appsRes.ok) {
      const appsData = await appsRes.json();
      const activities = appsData.items || [];
      const seen = new Set<string>();
      for (const item of activities) {
        const events = item.events || [];
        for (const event of events) {
          const params = event.parameters || [];
          const appName = params.find((p: any) => p.name === "app_name")?.value;
          const clientId = params.find((p: any) => p.name === "client_id")?.value;
          if (appName && !seen.has(appName)) {
            seen.add(appName);
            appsToSave.push({
              org_id, platform_id,
              name: appName,
              publisher: "Google Workspace",
              verified: true,
              connection_type: "Google OAuth App",
              risk_score: 45, severity: "medium",
              users_affected: 1, users_type: "users",
              is_stale: false, is_revoked: false,
              last_active_at: item.id?.time || new Date().toISOString(),
              connected_at: item.id?.time || new Date().toISOString(),
              notes: `Client ID: ${clientId || "unknown"}`,
            });
          }
        }
      }
    }

    for (const app of appsToSave) {
      await supabase.from("connected_apps").upsert(app, { onConflict: "org_id,platform_id,name" });
    }

    await supabase.from("platforms")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", platform_id);

    return new Response(JSON.stringify({ success: true, apps_found: appsToSave.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("google-scan error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});