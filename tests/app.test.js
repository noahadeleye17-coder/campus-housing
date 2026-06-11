const request = require("supertest");
const app = require("../server");
const { scoreProfile } = require("../controllers/roommateController");

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
});
