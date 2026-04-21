import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
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
    const { org_id, alert_id, user_email } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Use provided email or find from org
    let email = user_email;
    let fullName = "";
    if (!email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("org_id", org_id)
        .not("email", "is", null)
        .limit(1)
        .single();
      email = profile?.email;
      fullName = profile?.full_name || "";
    }

    if (!email) throw new Error("No email found");

    // Get alert details
    const { data: alert } = await supabase
      .from("alerts")
      .select("*, app:connected_apps(name, platform:platforms(name))")
      .eq("id", alert_id)
      .single();

    const severityColor = alert?.severity === "critical" ? "#ef4444" : alert?.severity === "high" ? "#f59e0b" : "#3b82f6";
    const severityLabel = alert?.severity?.toUpperCase() || "ALERT";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:28px 32px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><span style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-.5px">🛡️ ScopeGuard</span></td>
              <td align="right"><span style="background:${severityColor};color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px">${severityLabel}</span></td>
            </tr>
          </table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#0f172a">${alert?.title || "Security Alert"}</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">${alert?.detail || "A security issue was detected in your organization."}</p>
          
          ${alert?.app?.name ? `
          <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:24px;border:1px solid #e2e8f0">
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Affected App</div>
            <div style="font-size:15px;font-weight:700;color:#0f172a">${alert.app.name}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px">${alert.app.platform?.name || "Unknown platform"}</div>
          </div>` : ""}

          <div style="margin-bottom:24px">
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Recommended Action</div>
            <div style="font-size:13px;color:#334155;line-height:1.6">Review this integration immediately and revoke access if it is no longer needed or authorized.</div>
          </div>

          <a href="https://scopguard.com" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:13px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none">View in ScopeGuard →</a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #f1f5f9">
          <p style="margin:0;font-size:11px;color:#94a3b8">You received this alert because you have email notifications enabled in ScopeGuard. <a href="https://scopguard.com" style="color:#10b981">Manage preferences</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ScopeGuard <alerts@send.scopguard.com>",
        to: [email],
        subject: `⚠️ [${severityLabel}] ${alert?.title || "Security Alert"} — ScopeGuard`,
        html,
      }),
    });

    const data = await res.json();
    console.log("Resend response:", JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Email error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});