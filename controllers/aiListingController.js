const mongoose = require("mongoose");
const Apartment = require("../models/Apartment");
const User = require("../models/user");
const { buildApartmentData } = require("./apartmentController");
const { cleanupProcessedMedia } = require("../upload/ResizeImage");
const { normalizePhone } = require("../utils/phone");

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

// Free-tier model — no billing required. See:
// https://ai.google.dev/gemini-api/docs/pricing
const AI_MODEL = "gemini-2.5-flash";

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
      propertyType: { type: "STRING", enum: [...propertyTypes, ""] },
      amenities: { type: "ARRAY", items: { type: "STRING" } },
      landlordWhatsapp: { type: "STRING" },
    },
    required: ["title", "price", "location", "propertyType", "amenities", "landlordWhatsapp"],
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

// @route   POST /api/admin/listings/ai-draft
// @desc    Admin pastes a landlord's raw WhatsApp message (plus optional
//          phone override, images, video). AI extracts the listing fields,
//          the phone is matched against a landlord account if possible, and
//          a DRAFT listing is created — nothing is public until an admin
//          reviews and publishes it (see the `status` handling in
//          apartmentController.buildApartmentData).
// @access  Private (admin only)
exports.createAiDraft = async (req, res) => {
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

    // A phone number typed directly into the Inbox form wins over whatever
    // the AI thinks it saw in the message text — the admin knows which
    // number this actually came in on.
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

    // Reuses the exact same field-building logic as the manual create form
    // — including the images/video pipeline via req.processedImages/Video
    // — by populating req.body with the AI's output before calling it.
    req.body.title = extracted.title;
    req.body.price = extracted.price;
    req.body.location = extracted.location;
    req.body.propertyType = extracted.propertyType;
    req.body.amenities = extracted.amenities;
    req.body.landlordWhatsapp = normalizedPhone || rawPhone;

    const data = await buildApartmentData(req);
    data.status = "draft";
    data.landlord = matchedLandlord ? matchedLandlord._id : null;

    const apartment = await Apartment.create(data);

    res.status(201).json({
      apartment,
      matchedLandlord: matchedLandlord
        ? { id: matchedLandlord._id, name: matchedLandlord.name, email: matchedLandlord.email }
        : null,
    });
  } catch (error) {
    cleanupProcessedMedia(req);
    res.status(400).json({ message: error.message || "Could not create AI draft" });
  }
};
