const mongoose = require("mongoose");
const User = require("../models/user");
const { escapeHtml } = require("../utils/email");
const { isValidUnsubscribeToken, getSiteUrl } = require("../utils/emailTemplates");

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const page = (title, bodyHtml) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${escapeHtml(title)} · Off-Campus Hub</title>
</head>
<body style="margin:0;background:#f4f0e8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#16213e;">
  <div style="max-width:460px;margin:12vh auto 0;padding:0 16px;">
    <div style="background:#fff;border-radius:16px;padding:32px 28px;box-shadow:0 12px 28px rgba(16,24,40,0.08);text-align:center;">
      <img src="/icons/icon-192.png" width="56" height="56" alt="Off-Campus Hub" style="display:block;margin:0 auto 12px;">
      <h1 style="margin:0 0 10px;font-size:1.3rem;color:#17327f;">${escapeHtml(title)}</h1>
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;

const buttonStyle =
  "display:inline-block;margin-top:18px;padding:12px 24px;border:0;border-radius:10px;background:#2357d8;color:#fff;font-size:1rem;font-weight:700;cursor:pointer;text-decoration:none;";

const invalidLink = (res) =>
  res
    .status(400)
    .type("html")
    .send(
      page(
        "Link not valid",
        `<p style="color:#596274;line-height:1.6;">This unsubscribe link isn't valid or has expired. You can also turn emails off any time from your dashboard settings.</p>
         <a href="${getSiteUrl()}" style="${buttonStyle}">Go to Off-Campus Hub</a>`
      )
    );

// @route   GET /api/auth/unsubscribe?uid=...&token=...
// @desc    Confirmation page. Deliberately does NOT unsubscribe on GET — mail
//          scanners and link previewers fetch URLs automatically and would
//          silently opt people out. The button below POSTs instead.
exports.showUnsubscribe = (req, res) => {
  const { uid, token } = req.query;
  if (!mongoose.Types.ObjectId.isValid(uid) || !isValidUnsubscribeToken(uid, token)) {
    return invalidLink(res);
  }

  res.type("html").send(
    page(
      "Unsubscribe from emails?",
      `<p style="color:#596274;line-height:1.6;">You'll stop receiving announcements and notification emails from Off-Campus Hub.</p>
       <form method="POST" action="/api/auth/unsubscribe?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}">
         <button type="submit" style="${buttonStyle}">Yes, unsubscribe me</button>
       </form>`
    )
  );
};

// @route   POST /api/auth/unsubscribe?uid=...&token=...
// @desc    Performs the unsubscribe. Also serves as the RFC 8058 one-click
//          endpoint (List-Unsubscribe-Post), which mail apps call directly.
exports.confirmUnsubscribe = async (req, res) => {
  const { uid, token } = req.query;
  if (!mongoose.Types.ObjectId.isValid(uid) || !isValidUnsubscribeToken(uid, token)) {
    return invalidLink(res);
  }

  try {
    if (!isDatabaseConnected()) {
      return res.status(503).type("html").send(page("Try again shortly", `<p style="color:#596274;">We couldn't reach the server. Please try again in a moment.</p>`));
    }

    await User.updateOne({ _id: uid }, { notificationsEnabled: false });

    res.type("html").send(
      page(
        "You're unsubscribed",
        `<p style="color:#596274;line-height:1.6;">You won't get any more emails from us. Changed your mind? Turn them back on any time in your dashboard settings.</p>
         <a href="${getSiteUrl()}" style="${buttonStyle}">Back to Off-Campus Hub</a>`
      )
    );
  } catch (error) {
    res.status(500).type("html").send(page("Something went wrong", `<p style="color:#596274;">Please try again later.</p>`));
  }
};
