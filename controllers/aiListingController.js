const mongoose = require("mongoose");
const Apartment = require("../models/Apartment");
const User = require("../models/user");
const { normalizePhone } = require("../utils/phone");

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

// "gemini-flash-latest" is an alias Google keeps pointed at its current
// recommended free-tier Flash model — it gets hot-swapped automatically as
// Google retires/replaces specific versions (which is what just happened:
// the pinned "gemini-2.5-flash" got closed to new API keys). Using the
// alias avoids this same error recurring every time Google rotates models.
const AI_MODEL = "gemini-flash-latest";

/**
 * Send the landlord's raw WhatsApp text to Gemini and get back structured
 * listing fields. Throws on any failure (missing key, network, bad JSON) —
 * the caller is responsible for turning that into a 400/500 response.
 */
const extractListingFromText = async (rawText, propertyTypes) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("AI parsing is not configured on the server (missing GEMINI_API_KEY)");
  }

  const systemPrompt = `You extract structured apartment listing data from a landlord's raw WhatsApp message for a Nigerian student housing site near FUTA.

Rules:
- "price" is the yearly rent in Naira as a plain number. Convert shorthand like "250k" to 250000.
- "location" is a short, clean description of where the apartment is.
- "propertyType" must be exactly one of the allowed values, or "" if you can't tell.
- "amenities" lists only concrete features actually mentioned in the text — never invent ones that weren't stated.
- "landlordWhatsapp" is a Nigerian phone number if one appears in the text, else "".
- If a field can't be determined, use "" (or 0 for price, [] for amenities). Never fabricate details.`;

  // responseSchema forces Gemini to return exactly this shape as valid JSON
  // — no markdown fences or stray text to strip, unlike a plain text prompt.
  const responseSchema = {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      price: { type: "NUMBER" },
      location: { type: "STRING" },
      propertyType: { type: "STRING", enum: propertyTypes },
      amenities: { type: "ARRAY", items: { type: "STRING" } },
      landlordWhatsapp: { type: "STRING" },
    },
    // propertyType is intentionally left out of `required` — Gemini's schema
    // validator rejects an empty string as an enum member, so there's no
    // valid way to force "I couldn't tell" through the enum itself. Leaving
    // it optional lets Gemini omit the field when unsure; the code below
    // already defaults a missing/invalid value to "".
    required: ["title", "price", "location", "amenities", "landlordWhatsapp"],
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: rawText.slice(0, 4000) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`AI parsing failed (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("AI response had no usable content");

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Could not parse the AI's response as JSON");
  }

  return {
    title: typeof parsed.title === "string" ? parsed.title.slice(0, 120) : "",
    price: Number(parsed.price) || 0,
    location: typeof parsed.location === "string" ? parsed.location.slice(0, 160) : "",
    propertyType: propertyTypes.includes(parsed.propertyType) ? parsed.propertyType : "",
    amenities: Array.isArray(parsed.amenities) ? parsed.amenities.map(String).slice(0, 20) : [],
    landlordWhatsapp: typeof parsed.landlordWhatsapp === "string" ? parsed.landlordWhatsapp : "",
  };
};

// @route   POST /api/admin/listings/ai-parse
// @desc    Admin pastes a landlord's raw WhatsApp message (plus optional
//          phone override). AI extracts the listing fields and the phone is
//          matched against a landlord account if possible — nothing is
//          created or saved here. The admin's create-listing form
//          (landlord.html) uses this to pre-fill itself so the admin
//          reviews/edits every field, attaches photos, and picks the
//          landlord in the one place that already does all of that, before
//          ever submitting.
// @access  Private (admin only)
exports.parseListingText = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    const rawText = (req.body.rawText || "").trim();
    if (!rawText) {
      return res.status(400).json({ message: "Paste the landlord's message first" });
    }

    const extracted = await extractListingFromText(
      rawText,
      Apartment.schema.path("propertyType").enumValues.filter(Boolean)
    );

    // A phone number typed directly into the form wins over whatever the AI
    // thinks it saw in the message text — the admin knows which number this
    // actually came in on.
    const rawPhone = (req.body.phone || extracted.landlordWhatsapp || "").trim();
    const normalizedPhone = normalizePhone(rawPhone);

    let matchedLandlord = null;
    if (normalizedPhone) {
      matchedLandlord = await User.findOne({
        phone: normalizedPhone,
        role: "landlord",
        disabled: { $ne: true },
      }).select("_id name email");
    }

    res.json({
      ...extracted,
      landlordWhatsapp: normalizedPhone || rawPhone,
      matchedLandlord: matchedLandlord
        ? { id: matchedLandlord._id, name: matchedLandlord.name, email: matchedLandlord.email }
        : null,
    });
  } catch (error) {
    res.status(400).json({ message: error.message || "Could not parse the message" });
  }
};
