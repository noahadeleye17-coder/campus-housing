const { body, validationResult } = require("express-validator");

const optionalText = (field, max, label) => {
  return body(field)
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max })
    .withMessage(`${label} must be ${max} characters or less`);
};

const optionalEnum = (field, values, label) => {
  return body(field)
    .optional({ values: "falsy" })
    .isIn(values)
    .withMessage(`${label} is invalid`);
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const forgotPasswordRules = [
  body("email").trim().isEmail().withMessage("Valid email required").normalizeEmail(),
];

const resetPasswordRules = [
  body("email").trim().isEmail().withMessage("Valid email required").normalizeEmail(),
  body("token").trim().isLength({ min: 32, max: 128 }).withMessage("Valid reset token required"),
  body("password").isLength({ min: 6, max: 128 }).withMessage("Password must be 6 to 128 characters"),
];

const apartmentOptionalIdentityRules = [
  body("title").optional({ values: "falsy" }).trim().isLength({ max: 120 }).withMessage("Title must be 120 characters or less"),
  body("price").optional({ values: "falsy" }).isFloat({ min: 0, max: 1000000 }).withMessage("Price must be a positive number"),
  body("location").optional({ values: "falsy" }).trim().isLength({ max: 160 }).withMessage("Location must be 160 characters or less"),
];

const apartmentOptionalDetailRules = [
  body("distanceFromCampus")
    .optional({ values: "falsy" })
    .isFloat({ min: 0, max: 500 })
    .withMessage("Distance from campus must be between 0 and 500"),
  body("latitude")
    .optional({ values: "falsy" })
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),
  body("longitude")
    .optional({ values: "falsy" })
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),
  body("amenities").optional({ values: "falsy" }).custom((value) => {
    const items = Array.isArray(value) ? value : String(value).split(",");
    if (items.length > 30) {
      throw new Error("Amenities must include 30 items or less");
    }
    if (items.some((item) => String(item).trim().length > 60)) {
      throw new Error("Each amenity must be 60 characters or less");
    }
    return true;
  }),
];

const apartmentCreateRules = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 120 }).withMessage("Title must be 120 characters or less"),
  body("price").isFloat({ min: 0, max: 1000000 }).withMessage("Price must be a positive number"),
  body("location").trim().notEmpty().withMessage("Location is required").isLength({ max: 160 }).withMessage("Location must be 160 characters or less"),
  body("landlordWhatsapp")
    .trim()
    .notEmpty()
    .withMessage("WhatsApp number is required so students can reach you about this listing")
    .matches(/^(\+234|0)[7-9][0-1]\d{8}$/)
    .withMessage("Enter a valid Nigerian WhatsApp number (e.g. 080XXXXXXXX or +234XXXXXXXXXX)"),
  ...apartmentOptionalDetailRules,
];

const apartmentUpdateRules = [
  ...apartmentOptionalIdentityRules,
  body("landlordWhatsapp")
    .optional({ values: "falsy" })
    .trim()
    .matches(/^(\+234|0)[7-9][0-1]\d{8}$/)
    .withMessage("Enter a valid Nigerian WhatsApp number (e.g. 080XXXXXXXX or +234XXXXXXXXXX)"),
  ...apartmentOptionalDetailRules,
];

const roommateProfileRules = [
  optionalText("bio", 500, "Bio"),
  optionalText("campus", 120, "Campus"),
  optionalText("preferredLocation", 160, "Preferred location"),
  body("budgetMin").optional({ values: "falsy" }).isFloat({ min: 0, max: 1000000 }).withMessage("Minimum budget must be a positive number"),
  body("budgetMax").optional({ values: "falsy" }).isFloat({ min: 0, max: 1000000 }).withMessage("Maximum budget must be a positive number"),
  body("budgetMax").custom((value, { req }) => {
    if (value === undefined || value === "" || req.body.budgetMin === undefined || req.body.budgetMin === "") {
      return true;
    }
    if (Number(req.body.budgetMin) > Number(value)) {
      throw new Error("Minimum budget cannot be greater than maximum budget");
    }
    return true;
  }),
  body("moveInDate").optional({ values: "falsy" }).isISO8601().withMessage("Move-in date must be a valid date"),
  body("whatsappNumber")
    .trim()
    .notEmpty()
    .withMessage("WhatsApp number is required so matched roommates can reach you")
    .matches(/^(\+234|0)[7-9][0-1]\d{8}$/)
    .withMessage("Enter a valid Nigerian WhatsApp number (e.g. 080XXXXXXXX or +234XXXXXXXXXX)"),
  optionalEnum("gender", ["male", "female"], "Gender"),
  optionalEnum("educationLevel", ["100", "200", "300", "400", "500"], "Education level"),
  optionalEnum("sleepSchedule", ["early", "flexible", "late"], "Sleep schedule"),
  optionalEnum("cleanliness", ["relaxed", "moderate", "very_clean"], "Cleanliness"),
  optionalEnum("noisePreference", ["quiet", "moderate", "lively"], "Noise preference"),
  optionalEnum("guestPreference", ["rarely", "sometimes", "often"], "Guest preference"),
  optionalEnum("studyPreference", ["home", "library", "mixed"], "Study preference"),
  body("visible").optional().isBoolean().withMessage("Visible must be true or false"),
  body("interests").optional().custom((value) => {
    const items = Array.isArray(value) ? value : String(value).split(",");
    if (items.length > 20) {
      throw new Error("Interests must include 20 items or less");
    }
    if (items.some((item) => String(item).trim().length > 40)) {
      throw new Error("Each interest must be 40 characters or less");
    }
    return true;
  }),
];

const roommateRequestRules = [
  optionalText("message", 300, "Message"),
];

const roommateRequestStatusRules = [
  body("status").isIn(["accepted", "declined"]).withMessage("Status must be accepted or declined"),
];

const updateProfileRules = [
  optionalText("name", 80, "Name"),
];

module.exports = {
  validate,
  forgotPasswordRules,
  resetPasswordRules,
  apartmentCreateRules,
  apartmentUpdateRules,
  roommateProfileRules,
  roommateRequestRules,
  roommateRequestStatusRules,
  updateProfileRules,
};