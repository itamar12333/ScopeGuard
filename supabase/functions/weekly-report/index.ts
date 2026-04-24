import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get all orgs with profiles that have emails
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, org_id")
    .not("email", "is", null);

  if (!profiles?.length) return new Response(JSON.stringify({ sent: 0 }), { headers: cors });

  let sent = 0;
  for (const profile of profiles) {
    try {
      // Get apps for this org
      const { data: apps } = await supabase
        .from("connected_apps")
        .select("*")
        .eq("org_id", profile.org_id)
        .eq("is_revoked", false);

      const { data: alerts } = await supabase
        .from("alerts")
        .select("*")
        .eq("org_id", profile.org_id)
        .eq("status", "open");

      const { data: platforms } = await supabase
        .from("platforms")
        .select("name")
        .eq("org_id", profile.org_id);

      if (!apps?.length && !alerts?.length) continue;

      const totalApps = apps?.length || 0;
      const criticalCount = apps?.filter(a => a.severity === "critical").length || 0;
      const highCount = apps?.filter(a => a.severity === "high").length || 0;
      const openAlerts = alerts?.length || 0;

      // Calculate score
      let score = 100;
      score -= criticalCount * 15;
      score -= highCount * 8;
      score -= openAlerts * 5;
      score = Math.max(score, 0);

      const scoreColor = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
      const scoreLabel = score >= 80 ? "Good" : score >= 60 ? "Fair" : "At Risk";

      const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:28px 32px">
    <table width="100%"><tr>
      <td><span style="font-size:20px;font-weight:900;color:#fff">🛡️ ScopeGuard</span><br><span style="font-size:12px;color:rgba(255,255,255,.5);margin-top:4px;display:block">Weekly Security Report</span></td>
      <td align="right"><span style="font-size:11px;color:rgba(255,255,255,.4)">${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</span></td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:32px">
    <h2 style="margin:0 0 6px;font-size:18px;font-weight:800;color:#0f172a">Hi ${profile.full_name || "there"} 👋</h2>
    <p style="margin:0 0 28px;font-size:13px;color:#64748b">Here's your weekly security snapshot.</p>

    <!-- Score -->
    <div style="background:#f8fafc;border-radius:14px;padding:20px;margin-bottom:20px;text-align:center;border:1px solid #e2e8f0">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Security Score</div>
      <div style="font-size:56px;font-weight:900;color:${scoreColor};line-height:1">${score}</div>
      <div style="font-size:13px;font-weight:700;color:${scoreColor};margin-top:4px">${scoreLabel}</div>
    </div>

    <!-- Stats grid -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
    <tr>
      <td width="33%" style="padding:0 4px 0 0">
        <div style="background:#f8fafc;border-radius:12px;padding:16px;text-align:center;border:1px solid #e2e8f0">
          <div style="font-size:28px;font-weight:900;color:#0f172a">${totalApps}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">Connected Apps</div>
        </div>
      </td>
      <td width="33%" style="padding:0 2px">
        <div style="background:${criticalCount > 0 ? "rgba(239,68,68,.06)" : "#f8fafc"};border-radius:12px;padding:16px;text-align:center;border:1px solid ${criticalCount > 0 ? "rgba(239,68,68,.2)" : "#e2e8f0"}">
          <div style="font-size:28px;font-weight:900;color:${criticalCount > 0 ? "#ef4444" : "#0f172a"}">${criticalCount}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">Critical Risks</div>
        </div>
      </td>
      <td width="33%" style="padding:0 0 0 4px">
        <div style="background:${openAlerts > 0 ? "rgba(245,158,11,.06)" : "#f8fafc"};border-radius:12px;padding:16px;text-align:center;border:1px solid ${openAlerts > 0 ? "rgba(245,158,11,.2)" : "#e2e8f0"}">
          <div style="font-size:28px;font-weight:900;color:${openAlerts > 0 ? "#f59e0b" : "#0f172a"}">${openAlerts}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">Open Alerts</div>
        </div>
      </td>
    </tr>
    </table>

    ${criticalCount > 0 ? `
    <div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="font-size:12px;font-weight:700;color:#ef4444;margin-bottom:6px">⚠️ Action Required</div>
      <div style="font-size:12px;color:#334155">You have ${criticalCount} critical risk app${criticalCount>1?"s":""} that need immediate review. Log in to revoke access.</div>
    </div>` : `
    <div style="background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.2);border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="font-size:12px;font-weight:700;color:#10b981;margin-bottom:6px">✅ All Clear</div>
      <div style="font-size:12px;color:#334155">No critical risks detected this week. Keep up the great work!</div>
    </div>`}

    <a href="https://scopguard.com" style="display:block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:13px;font-weight:700;padding:14px;border-radius:10px;text-decoration:none;text-align:center">View Full Report →</a>
  </td></tr>

  <tr><td style="padding:20px 32px;border-top:1px solid #f1f5f9">
    <p style="margin:0;font-size:11px;color:#94a3b8">Connected platforms: ${platforms?.map(p=>p.name).join(", ") || "None"} · <a href="https://scopguard.com" style="color:#10b981">Manage settings</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "ScopeGuard <alerts@scopguard.com>",
          to: [profile.email],
          subject: `📊 Your Weekly Security Report — Score: ${score}/100`,
          html,
        }),
      });
      sent++;
    } catch(e) { console.error("Error sending to", profile.email, e); }
  }

  return new Response(JSON.stringify({ success: true, sent }), {
    headers: { ...cors, "Content-Type": "application/json" }
  });
});