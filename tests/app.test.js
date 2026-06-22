const request = require("supertest");
const express = require("express");
const app = require("../server");
const { scoreProfile } = require("../controllers/roommateController");
const { createRateLimiter } = require("../middleware/rateLimit");
const upload = require("../upload/upload");
const uploadErrorHandler = require("../middleware/uploadErrors");
const {
  apartmentCreateRules,
  apartmentUpdateRules,
  resetPasswordRules,
  roommateProfileRules,
  validate,
} = require("../middleware/validateInput");

describe("Server", () => {
  test("GET / should return 200", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
  });

  test("returns JSON for invalid request bodies", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad json");

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid JSON in request body");
  });

  test("rejects public admin registration", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Admin User",
        email: "admin@example.com",
        password: "password123",
        role: "admin",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].msg).toBe("Invalid role");
  });

  test("returns demo apartments when database is disconnected", async () => {
    const res = await request(app).get("/api/apartments");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("protects landlord-only apartment routes", async () => {
    const res = await request(app).get("/api/apartments/mine");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, no token");
  });

  test("rejects invalid apartment ids", async () => {
    const res = await request(app).get("/api/apartments/not-a-real-id");

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid apartment ID");
  });

  test("protects roommate routes", async () => {
    const res = await request(app).get("/api/roommates/me");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, no token");
  });

  test("scores compatible roommate profiles", () => {
    const result = scoreProfile(
      {
        campus: "North Campus",
        budgetMin: 700,
        budgetMax: 1000,
        sleepSchedule: "early",
        cleanliness: "very_clean",
        noisePreference: "quiet",
        guestPreference: "sometimes",
        studyPreference: "library",
        interests: ["basketball", "music"],
      },
      {
        campus: "North Campus",
        budgetMin: 800,
        budgetMax: 1100,
        sleepSchedule: "early",
        cleanliness: "very_clean",
        noisePreference: "quiet",
        guestPreference: "rarely",
        studyPreference: "library",
        interests: ["Music", "gaming"],
      }
    );

    expect(result.score).toBeGreaterThan(70);
    expect(result.reasons).toContain("Same campus");
    expect(result.reasons).toContain("Budget ranges overlap");
  });

  test("rate limiter returns 429 after the allowed request count", async () => {
    const limitedApp = express();
    limitedApp.use(createRateLimiter({ windowMs: 60 * 1000, max: 2 }));
    limitedApp.get("/limited", (req, res) => res.json({ ok: true }));

    await request(limitedApp).get("/limited").expect(200);
    await request(limitedApp).get("/limited").expect(200);

    const res = await request(limitedApp).get("/limited").expect(429);
    expect(res.body.message).toBe("Too many requests. Please try again later.");
    expect(res.headers["retry-after"]).toBeDefined();
  });

  test("upload middleware rejects unsupported media types", async () => {
    const uploadApp = express();
    uploadApp.post(
      "/upload",
      upload.fields([{ name: "images", maxCount: 6 }, { name: "video", maxCount: 1 }]),
      (req, res) => res.json({ ok: true })
    );
    uploadApp.use(uploadErrorHandler);

    const res = await request(uploadApp)
      .post("/upload")
      .attach("images", Buffer.from("<svg></svg>"), {
        filename: "bad.svg",
        contentType: "image/svg+xml",
      })
      .expect(400);

    expect(res.body.message).toBe("Only JPEG, PNG, WebP, MP4, MOV, and WebM uploads are allowed");
  });

  test("upload middleware rejects unexpected fields", async () => {
    const uploadApp = express();
    uploadApp.post(
      "/upload",
      upload.fields([{ name: "images", maxCount: 6 }, { name: "video", maxCount: 1 }]),
      (req, res) => res.json({ ok: true })
    );
    uploadApp.use(uploadErrorHandler);

    const res = await request(uploadApp)
      .post("/upload")
      .attach("document", Buffer.from("not allowed"), {
        filename: "lease.pdf",
        contentType: "application/pdf",
      })
      .expect(400);

    expect(res.body.message).toBe("Unexpected upload field");
  });

  test("reset password validation rejects malformed input", async () => {
    const validationApp = express();
    validationApp.use(express.json());
    validationApp.post("/reset", resetPasswordRules, validate, (req, res) => res.json({ ok: true }));

    const res = await request(validationApp)
      .post("/reset")
      .send({ email: "bad-email", token: "short", password: "123" })
      .expect(400);

    expect(res.body.errors.map((error) => error.msg)).toEqual(
      expect.arrayContaining([
        "Valid email required",
        "Valid reset token required",
        "Password must be 6 to 128 characters",
      ])
    );
  });

  test("apartment create validation requires core listing fields", async () => {
    const validationApp = express();
    validationApp.use(express.urlencoded({ extended: true }));
    validationApp.post("/apartments", apartmentCreateRules, validate, (req, res) => res.json({ ok: true }));

    const res = await request(validationApp)
      .post("/apartments")
      .type("form")
      .send({ title: "", price: "-10", location: "" })
      .expect(400);

    expect(res.body.errors.map((error) => error.msg)).toEqual(
      expect.arrayContaining([
        "Title is required",
        "Price must be a positive number",
        "Location is required",
      ])
    );
  });

  test("apartment update validation allows partial valid updates", async () => {
    const validationApp = express();
    validationApp.use(express.urlencoded({ extended: true }));
    validationApp.patch("/apartments/:id", apartmentUpdateRules, validate, (req, res) => res.json({ ok: true }));

    await request(validationApp)
      .patch("/apartments/123")
      .type("form")
      .send({ price: "1200" })
      .expect(200);
  });

  test("roommate profile validation rejects invalid budgets and enum values", async () => {
    const validationApp = express();
    validationApp.use(express.json());
    validationApp.put("/roommate", roommateProfileRules, validate, (req, res) => res.json({ ok: true }));

    const res = await request(validationApp)
      .put("/roommate")
      .send({ budgetMin: 900, budgetMax: 700, gender: "everyone" })
      .expect(400);

    expect(res.body.errors.map((error) => error.msg)).toEqual(
      expect.arrayContaining([
        "Minimum budget cannot be greater than maximum budget",
        "Gender is invalid",
      ])
    );
  });
});
