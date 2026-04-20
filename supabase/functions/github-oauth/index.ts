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
    // Accept params from URL (GET callback) or body (POST)
    const url = new URL(req.url);
    let code, orgId;

    if (req.method === "GET") {
      code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (state) {
        const decoded = JSON.parse(atob(state));
        orgId = decoded.org_id;
      }
    } else {
      const body = await req.json();
      code = body.code;
      orgId = body.org_id;
      // Also check state
      if (!orgId && body.state) {
        const decoded = JSON.parse(atob(body.state));
        orgId = decoded.org_id;
      }
    }

    if (!code || !orgId) {
      return new Response(JSON.stringify({ error: "Missing params", code: !!code, orgId: !!orgId }), { status: 400, headers: corsHeaders });
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error(`No access token: ${JSON.stringify(tokenData)}`);

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "ScopeGuard" },
    });
    const githubUser = await userRes.json();

    const orgsRes = await fetch("https://api.github.com/user/orgs", {
      headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "ScopeGuard" },
    });
    const orgs = await orgsRes.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: platform } = await supabase.from("platforms").upsert({
      org_id: orgId, name: "GitHub", status: "active",
      last_synced_at: new Date().toISOString(),
    }, { onConflict: "org_id,name" }).select().single();

    await supabase.from("platform_tokens").upsert({
      org_id: orgId, platform: "github", access_token: accessToken,
      meta: { github_user: githubUser.login, orgs: Array.isArray(orgs) ? orgs.map((o: any) => o.login) : [] },
      updated_at: new Date().toISOString(),
    }, { onConflict: "org_id,platform" });

    if (platform?.id) {
      await supabase.functions.invoke("github-scan", { body: { org_id: orgId, platform_id: platform.id } });
    }

    return new Response(JSON.stringify({ success: true, user: githubUser.login }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});