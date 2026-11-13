const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const app = require("../server");
const User = require("../models/user");
const { protect } = require("../middleware/authmiddleware");
const { escapeRegex } = require("../utils/regex");
const { apartmentCreateRules, validate } = require("../middleware/validateInput");

describe("review fixes", () => {
  test("search input is escaped before it reaches $regex", () => {
    expect(escapeRegex("(a+)+$")).toBe("\\(a\\+\\)\\+\\$");
    expect(new RegExp(escapeRegex("north (gate)")).test("north (gate)")).toBe(true);
  });

  test("app trusts one proxy hop so rate limits are per visitor, not per load balancer", () => {
    expect(app.get("trust proxy")).toBe(1);
  });

  test("blocked CORS origins get a JSON 403, not an HTML 500", async () => {
    const res = await request(app).get("/api/health").set("Origin", "https://evil.example");
    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Not allowed by CORS");
  });

  test("listings above the old ₦1,000,000 cap are accepted", async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.post("/", apartmentCreateRules, validate, (req, res) => res.json({ ok: true }));
    const res = await request(testApp).post("/").send({
      title: "2 Bedroom flat", price: 1500000, location: "South Gate", landlordWhatsapp: "08031234567",
    });
    expect(res.status).toBe(200);
  });

  describe("tokens issued before a password change are rejected", () => {
    const secret = "test-secret";
    let testApp;
    beforeAll(() => {
      process.env.JWT_SECRET = secret;
      testApp = express();
      testApp.get("/", protect, (req, res) => res.json({ ok: true }));
    });
    afterEach(() => jest.restoreAllMocks());

    const mockUser = (user) =>
      jest.spyOn(User, "findById").mockReturnValue({ select: () => Promise.resolve(user) });

    test("old token -> 401", async () => {
      const oldToken = jwt.sign({ id: "u1", iat: Math.floor(Date.now() / 1000) - 3600 }, secret);
      mockUser({ _id: "u1", disabled: false, passwordChangedAt: new Date(Date.now() - 60 * 1000) });
      const res = await request(testApp).get("/").set("Authorization", `Bearer ${oldToken}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/token/);
    });

    test("token issued after the change -> allowed", async () => {
      const freshToken = jwt.sign({ id: "u1" }, secret);
      mockUser({ _id: "u1", disabled: false, passwordChangedAt: new Date(Date.now() - 1000) });
      const res = await request(testApp).get("/").set("Authorization", `Bearer ${freshToken}`);
      expect(res.status).toBe(200);
    });
  });
});
