const { Resend } = require("resend");

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Same escaping used for user-generated text elsewhere in the app (see
// server.js) — names/messages get interpolated into email HTML below, so
// they need the same treatment to avoid a malicious name/message breaking
// the email markup.
const escapeHtml = (str = "") =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Base wrapper around Resend. Kept generic (not roommate/apartment-specific)
// so any feature can send an email through it. Failures are swallowed and
// logged rather than thrown — a failed notification email should never break
// the request that triggered it (e.g. accepting a roommate request should
// still succeed even if the email fails to send).
const sendEmail = async ({ to, subject, html }) => {
  if (!resend) {
    console.warn("Email not sent (RESEND_API_KEY not configured):", subject);
    return false;
  }
  try {
    await resend.emails.send({
      from: "Off-Campus Hub <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email:", error.message);
    return false;
  }
};

// Sends only if the recipient hasn't turned notification emails off.
// `user` should be a User doc (or plain object) with `email` and
// `notificationsEnabled`. Missing/undefined notificationsEnabled defaults to
// "on", matching the model's default and the dashboard toggle's own logic.
const sendNotificationEmail = async (user, { subject, html }) => {
  if (!user || !user.email) return false;
  if (user.notificationsEnabled === false) return false;
  return sendEmail({ to: user.email, subject, html });
};

// Publicly reachable URL for the logo shown in the email header. Email
// clients can't load local files, so this has to point at the deployed
// site (not a relative path). Falls back to the live domain if the env
// var isn't set.
const SITE_URL = process.env.SITE_URL || "https://offcampushub.ng";
const LOGO_URL = `${SITE_URL}/icons/icon-512.png`;

const wrapEmail = (title, bodyHtml) => `
  <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
    <div style="text-align:center;margin-bottom:20px;">
      <img src="${LOGO_URL}" alt="Off-Campus Hub" width="56" height="56" style="border-radius:12px;display:inline-block;" />
    </div>
    <h2 style="color:#17327f;">${title}</h2>
    ${bodyHtml}
    <p style="color:#7a8496;font-size:0.8rem;margin-top:24px;">
      You're receiving this because notifications are turned on in your Off-Campus Hub settings.
      You can turn them off anytime from your dashboard.
    </p>
  </div>
`;

module.exports = { sendEmail, sendNotificationEmail, wrapEmail, escapeHtml };