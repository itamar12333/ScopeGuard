import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

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
      code = body.code; orgId = body.org_id; userId = body.user_id;
    }

    if (!code || !orgId) {
      if (req.method === "GET") return Response.redirect(`https://scopguard.com/?error=missing_params`, 302);
      return new Response(JSON.stringify({ error: "Missing params" }), { status: 400, headers: cors });
    }

    const redirectUri = `https://uqrqfwhvchpcmzrfqoyd.supabase.co/functions/v1/google-oauth`;

    // Exchange code for token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    console.log("Google token response:", JSON.stringify({ ...tokenData, access_token: "***" }));

    if (!tokenData.access_token) throw new Error(`No access token: ${JSON.stringify(tokenData)}`);

    // Get user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userRes.json();
    console.log("Google user:", userInfo.email);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    await supabase.from("platforms").upsert({
      org_id: orgId, name: "Google Workspace", status: "active",
      last_synced_at: new Date().toISOString(),
    }, { onConflict: "org_id,name" });

    await supabase.from("platform_tokens").upsert({
      org_id: orgId, platform: "google", access_token: tokenData.access_token,
      meta: { email: userInfo.email, name: userInfo.name, refresh_token: tokenData.refresh_token },
      updated_at: new Date().toISOString(),
    }, { onConflict: "org_id,platform" });

    if (req.method === "GET") {
      return Response.redirect(`https://scopguard.com/?connected=google`, 302);
    }

    return new Response(JSON.stringify({ success: true, email: userInfo.email }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("google-oauth error:", (err as Error).message);
    if (req.method === "GET") {
      return Response.redirect(`https://scopguard.com/?error=${encodeURIComponent((err as Error).message)}`, 302);
    }
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});