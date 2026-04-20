// supabase/functions/slack-oauth/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SLACK_CLIENT_ID = Deno.env.get("SLACK_CLIENT_ID")!;
const SLACK_CLIENT_SECRET = Deno.env.get("SLACK_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const userId = url.searchParams.get("user_id");
    const orgId = url.searchParams.get("org_id");

    if (!code || !userId || !orgId) {
      return new Response(JSON.stringify({ error: "Missing params" }), { status: 400, headers: corsHeaders });
    }

    // Exchange code for token
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: SLACK_CLIENT_ID, client_secret: SLACK_CLIENT_SECRET, code }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.ok) throw new Error(`Slack OAuth error: ${tokenData.error}`);

    const accessToken = tokenData.access_token;
    const teamId = tokenData.team?.id;
    const teamName = tokenData.team?.name;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Save platform
    const { data: platform } = await supabase.from("platforms").upsert({
      org_id: orgId, name: "Slack", status: "active",
      last_synced_at: new Date().toISOString(),
    }, { onConflict: "org_id,name" }).select().single();

    // Save token
    await supabase.from("platform_tokens").upsert({
      org_id: orgId, platform: "slack", access_token: accessToken,
      meta: { team_id: teamId, team_name: teamName },
      updated_at: new Date().toISOString(),
    }, { onConflict: "org_id,platform" });

    // Trigger scan
    await supabase.functions.invoke("slack-scan", { body: { org_id: orgId, platform_id: platform?.id } });

    return new Response(JSON.stringify({ success: true, platform: "slack", team: teamName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});