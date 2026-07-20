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

// Bulk-sends independent emails (different recipient/body per entry) via
// Resend's batch endpoint, which caps each call at 100 emails. Chunks larger
// lists and pauses briefly between chunks to stay under Resend's rate limit.
// Used by the admin "send welcome back email" feature — never throws, so one
// bad batch doesn't take down the whole campaign; failures are just counted.
const BULK_BATCH_SIZE = 100;
const BULK_BATCH_DELAY_MS = 600;

const sendBulkEmails = async (emails) => {
  if (!resend) {
    console.warn(`Bulk email not sent (RESEND_API_KEY not configured): ${emails.length} recipient(s)`);
    return { sent: 0, failed: emails.length };
  }

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i += BULK_BATCH_SIZE) {
    const chunk = emails.slice(i, i + BULK_BATCH_SIZE).map((email) => ({
      from: "Off-Campus Hub <hello@offcampushub.ng>",
      to: email.to,
      subject: email.subject,
      html: email.html,
    }));

    try {
      const { error } = await resend.batch.send(chunk);
      if (error) {
        console.error("Bulk email batch failed:", error);
        failed += chunk.length;
      } else {
        sent += chunk.length;
      }
    } catch (err) {
      console.error("Bulk email batch failed:", err.message);
      failed += chunk.length;
    }

    if (i + BULK_BATCH_SIZE < emails.length) {
      await new Promise((resolve) => setTimeout(resolve, BULK_BATCH_DELAY_MS));
    }
  }

  return { sent, failed };
};

const wrapEmail = (title, bodyHtml) => `
  <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
    <h2 style="color:#17327f;">${title}</h2>
    ${bodyHtml}
    <p style="color:#7a8496;font-size:0.8rem;margin-top:24px;">
      You're receiving this because notifications are turned on in your Off-Campus Hub settings.
      You can turn them off anytime from your dashboard.
    </p>
  </div>
`;

module.exports = { sendEmail, sendNotificationEmail, sendBulkEmails, wrapEmail, escapeHtml };