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
      .select("access_token").eq("org_id", org_id).eq("platform", "slack").single();
    if (!tokenRow) throw new Error("No Slack token");

    const token = tokenRow.access_token;
    const h = { Authorization: `Bearer ${token}` };

    // Get bots (installed apps show as bots)
    const botsRes = await fetch("https://slack.com/api/users.list?types=bot&limit=200", { headers: h });
    const botsData = await botsRes.json();
    const bots = (botsData.members || []).filter((m: any) => m.is_bot && !m.deleted && m.name !== "slackbot");

    // Get team info
    const teamRes = await fetch("https://slack.com/api/team.info", { headers: h });
    const teamData = await teamRes.json();
    const teamName = teamData.team?.name || "Slack";

    // Get member count
    const usersRes = await fetch("https://slack.com/api/users.list?limit=1", { headers: h });
    const usersData = await usersRes.json();
    const memberCount = usersData.response_metadata?.total_count || 1;

    const appsToSave = [];
    for (const bot of bots) {
      const isVerified = !!bot.profile?.api_app_id;
      const score = isVerified ? 35 : 60;
      appsToSave.push({
        org_id, platform_id,
        name: bot.real_name || bot.name,
        publisher: "Slack Bot",
        verified: isVerified,
        connection_type: "Slack Bot",
        risk_score: score,
        severity: score >= 60 ? "high" : "medium",
        users_affected: memberCount,
        users_type: "users",
        is_stale: false,
        is_revoked: false,
        last_active_at: new Date().toISOString(),
        connected_at: new Date().toISOString(),
        notes: `Workspace: ${teamName}`,
      });
    }

    for (const app of appsToSave) {
      await supabase.from("connected_apps").upsert(app, { onConflict: "org_id,platform_id,name" });
    }

    await supabase.from("platforms")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", platform_id);

    return new Response(JSON.stringify({ success: true, apps_found: appsToSave.length }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});