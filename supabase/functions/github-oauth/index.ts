// supabase/functions/github-oauth/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GITHUB_CLIENT_ID = Deno.env.get("GITHUB_CLIENT_ID")!;
const GITHUB_CLIENT_SECRET = Deno.env.get("GITHUB_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let code, orgId, userId;

    if (req.method === "GET") {
      // Direct callback from GitHub
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
      console.log("Missing params - code:", !!code, "orgId:", !!orgId, "state:", state);
      return Response.redirect(`https://scopguard.com/?error=missing_params`, 302);
    }

    console.log("Got code and orgId:", orgId);

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
    });
    const tokenData = await tokenRes.json();
    console.log("Token response:", JSON.stringify(tokenData));
    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error(`No access token: ${JSON.stringify(tokenData)}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log("Supabase URL:", SUPABASE_URL);
    console.log("Has service key:", !!SUPABASE_SERVICE_KEY);

    const { data: platform, error: platErr } = await supabase.from("platforms").upsert({
      org_id: orgId, name: "GitHub", status: "active",
      last_synced_at: new Date().toISOString(),
    }, { onConflict: "org_id,name" }).select().single();
    console.log("Platform upsert:", JSON.stringify(platform), "error:", JSON.stringify(platErr));

    const { error: tokenErr } = await supabase.from("platform_tokens").upsert({
      org_id: orgId, platform: "github", access_token: accessToken,
      meta: { github_user: "github" },
      updated_at: new Date().toISOString(),
    }, { onConflict: "org_id,platform" });
    console.log("Token upsert error:", JSON.stringify(tokenErr));

    // Redirect back to app with success
    if (req.method === "GET") {
      return Response.redirect(`https://scopguard.com/?connected=github`, 302);
    }

    return new Response(JSON.stringify({ success: true, user: githubUser.login }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (req.method === "GET") {
      return Response.redirect(`https://scopguard.com/?error=${encodeURIComponent(err.message)}`, 302);
    }
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});