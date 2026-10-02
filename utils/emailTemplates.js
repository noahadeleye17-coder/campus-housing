const crypto = require("crypto");
const { escapeHtml } = require("./email");

// Brand tokens — mirrored from frontend/style.css (:root) so emails match the site.
const BRAND = {
  name: "Off-Campus Hub",
  primary: "#2357d8",
  primaryDark: "#17327f",
  accent: "#0f9f8f",
  text: "#16213e",
  muted: "#596274",
  subtle: "#7a8496",
  pageBg: "#f4f0e8",
  border: "#e8e4da",
  font: "'Segoe UI', Helvetica, Arial, sans-serif",
};

const getSiteUrl = () =>
  (process.env.FRONTEND_URL || process.env.SITE_URL || "https://offcampushub.ng").replace(/\/+$/, "");

// Email clients block SVG, so the logo must be a PNG served from a public URL.
// icon-192.png already ships in frontend/icons and is served by express.static.
const getLogoUrl = () => process.env.EMAIL_LOGO_URL || `${getSiteUrl()}/icons/icon-192.png`;

// ── Unsubscribe links ───────────────────────────────────────────────────────
// Stateless: the token is an HMAC of the user id, so nothing extra is stored
// and a link can't be forged for another account without JWT_SECRET.
const unsubscribeToken = (userId) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET || "")
    .update(`unsubscribe:${String(userId)}`)
    .digest("hex");

const isValidUnsubscribeToken = (userId, token) => {
  if (!process.env.JWT_SECRET || typeof token !== "string") return false;
  const expected = Buffer.from(unsubscribeToken(userId), "hex");
  let provided;
  try {
    provided = Buffer.from(token, "hex");
  } catch {
    return false;
  }
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
};

const buildUnsubscribeUrl = (userId) =>
  `${getSiteUrl()}/api/auth/unsubscribe?uid=${encodeURIComponent(String(userId))}&token=${unsubscribeToken(userId)}`;

// ── Message text → email-safe HTML ──────────────────────────────────────────
// Admin types plain text. We escape everything first, then add the few
// conveniences back: {{name}}, **bold**, links, paragraphs and line breaks.
const linkStyle = `color:${BRAND.primary};text-decoration:underline;`;

const linkify = (escapedText) =>
  escapedText.replace(/(https?:\/\/[^\s<]+)/g, (match) => {
    const trailing = (match.match(/[.,!?;:)]+$/) || [""])[0];
    const url = trailing ? match.slice(0, -trailing.length) : match;
    return `<a href="${url}" style="${linkStyle}">${url}</a>${trailing}`;
  });

const messageToHtml = (message, userName = "") => {
  const firstName = String(userName || "").trim().split(/\s+/)[0] || "there";
  const escaped = escapeHtml(String(message || "").replace(/\r\n/g, "\n").trim())
    .replace(/\{\{\s*name\s*\}\}/gi, escapeHtml(firstName))
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  return linkify(escaped)
    .split(/\n{2,}/)
    .map(
      (para) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${BRAND.text};">${para.replace(/\n/g, "<br>")}</p>`
    )
    .join("");
};

const isHttpUrl = (value) => /^https?:\/\/[^\s"'<>]+$/i.test(String(value || "").trim());

// ── The letterhead ──────────────────────────────────────────────────────────
// Table-based layout with inline styles — the only thing that renders
// consistently across Gmail, Outlook and mobile mail apps.
const buildBroadcastEmail = ({
  message,
  userName = "",
  unsubscribeUrl = "",
  ctaText = "",
  ctaUrl = "",
  preheader = "",
}) => {
  const siteUrl = getSiteUrl();
  const year = new Date().getFullYear();

  const cta =
    ctaText && isHttpUrl(ctaUrl)
      ? `
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 8px;">
          <tr>
            <td bgcolor="${BRAND.primary}" style="border-radius:10px;">
              <a href="${escapeHtml(ctaUrl.trim())}" style="display:inline-block;padding:13px 26px;font-family:${BRAND.font};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(ctaText.trim())}</a>
            </td>
          </tr>
        </table>`
      : "";

  const unsubscribeLine = unsubscribeUrl
    ? `<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:${BRAND.subtle};text-decoration:underline;">Unsubscribe from these emails</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(BRAND.name)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.pageBg};">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BRAND.pageBg}" style="background:${BRAND.pageBg};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:${BRAND.font};">

          <!-- Brand accent bar -->
          <tr>
            <td height="5" bgcolor="${BRAND.primary}" style="height:5px;line-height:5px;font-size:0;background:${BRAND.primary};background-image:linear-gradient(90deg,${BRAND.primary},${BRAND.accent});">&nbsp;</td>
          </tr>

          <!-- Letterhead -->
          <tr>
            <td style="padding:24px 32px 18px;border-bottom:1px solid ${BRAND.border};">
              <a href="${siteUrl}" style="text-decoration:none;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:12px;vertical-align:middle;">
                      <img src="${escapeHtml(getLogoUrl())}" width="44" height="44" alt="${escapeHtml(BRAND.name)}" style="display:block;border:0;outline:none;width:44px;height:44px;">
                    </td>
                    <td style="vertical-align:middle;font-family:${BRAND.font};font-size:21px;font-weight:700;color:${BRAND.primaryDark};letter-spacing:-0.2px;">${escapeHtml(BRAND.name)}</td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding:30px 32px 18px;font-family:${BRAND.font};">
              ${messageToHtml(message, userName)}
              ${cta}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 32px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f3f6fd" style="background:#f3f6fd;border-radius:12px;">
                <tr>
                  <td align="center" style="padding:18px 20px;font-family:${BRAND.font};font-size:13px;line-height:1.7;color:${BRAND.muted};">
                    <strong style="color:${BRAND.primary};">${escapeHtml(BRAND.name)}</strong> &mdash; verified student housing &amp; roommate matching.<br>
                    <a href="${siteUrl}" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}</a>
                    &nbsp;&middot;&nbsp;
                    <a href="${siteUrl}/terms.html" style="color:${BRAND.subtle};text-decoration:underline;">Terms &amp; Privacy</a>
                    <br><span style="color:${BRAND.subtle};font-size:12px;">&copy; ${year} ${escapeHtml(BRAND.name)}</span>${unsubscribeLine}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

module.exports = {
  buildBroadcastEmail,
  messageToHtml,
  isHttpUrl,
  buildUnsubscribeUrl,
  isValidUnsubscribeToken,
  getSiteUrl,
};
