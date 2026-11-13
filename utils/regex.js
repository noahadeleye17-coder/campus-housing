// Escape user input before dropping it into a MongoDB $regex. Without this,
// a search like "(" makes Mongo throw (500 for the visitor), and patterns
// like "(a+)+$" let anyone burn database CPU with catastrophic backtracking.
const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { escapeRegex };
