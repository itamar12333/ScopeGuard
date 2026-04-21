// supabase/functions/slack-oauth/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SLACK_CLIENT_ID = Deno.env.get("SLACK_CLIENT_ID")!;
const SLACK_CLIENT_SECRET = Deno.env.get("SLACK_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let code, orgId, userId;

    if (req.method === "GET") {
      code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (state) {
        const decoded = JSON.parse(atob(state));
        orgId = decoded.org_id;
        userId = decoded.user_id;
      }
    } else {
      const body = await req.json();
      code = body.code;
      orgId = body.org_id;
      userId = body.user_id;
    }

    if (!code || !orgId) {
      if (req.method === "GET") return Response.redirect(`https://scopguard.com/?error=missing_params`, 302);
      return new Response(JSON.stringify({ error: "Missing params" }), { status: 400, headers: corsHeaders });
    }

    // Exchange code for token
    const redirectUri = `https://uqrqfwhvchpcmzrfqoyd.supabase.co/functions/v1/slack-oauth`;
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: SLACK_CLIENT_ID, client_secret: SLACK_CLIENT_SECRET, code, redirect_uri: redirectUri }),
    });
    const tokenData = await tokenRes.json();
    console.log("Slack token response:", JSON.stringify(tokenData));
    if (!tokenData.ok) throw new Error(`Slack OAuth error: ${tokenData.error}`);

    const accessToken = tokenData.access_token;
    const teamId = tokenData.team?.id;
    const teamName = tokenData.team?.name;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: platform, error: platErr } = await supabase.from("platforms").upsert({
      org_id: orgId, name: "Slack", status: "active",
      last_synced_at: new Date().toISOString(),
    }, { onConflict: "org_id,name" }).select().single();
    console.log("Platform upsert error:", JSON.stringify(platErr));

    const { error: tokenErr } = await supabase.from("platform_tokens").upsert({
      org_id: orgId, platform: "slack", access_token: accessToken,
      meta: { team_id: teamId, team_name: teamName },
      updated_at: new Date().toISOString(),
    }, { onConflict: "org_id,platform" });
    console.log("Token upsert error:", JSON.stringify(tokenErr));

    if (req.method === "GET") {
      return Response.redirect(`https://scopguard.com/?connected=slack`, 302);
    }

    return new Response(JSON.stringify({ success: true, team: teamName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("slack-oauth error:", (err as Error).message);
    if (req.method === "GET") {
      return Response.redirect(`https://scopguard.com/?error=${encodeURIComponent((err as Error).message)}`, 302);
    }
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});