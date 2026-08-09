/**
 * Normalize a Nigerian phone number to a consistent "+234XXXXXXXXXX" form,
 * so "0801 234 5678", "+2348012345678", and "2348012345678" all resolve to
 * the same value. Used to match an incoming WhatsApp number against a
 * landlord's stored `phone` on their User account.
 *
 * Returns the normalized string, or null if the input doesn't reduce to a
 * plausible 10-digit Nigerian mobile number.
 */
const normalizePhone = (input) => {
  if (!input) return null;

  let core = String(input).replace(/[^\d+]/g, "");

  if (core.startsWith("+234")) {
    core = core.slice(4);
  } else if (core.startsWith("234")) {
    core = core.slice(3);
  } else if (core.startsWith("0")) {
    core = core.slice(1);
  } else if (core.startsWith("+")) {
    // A non-Nigerian international number — out of scope for now.
    return null;
  }

  if (!/^\d{10}$/.test(core)) return null;

  return `+234${core}`;
};

module.exports = { normalizePhone };
