require("dotenv").config({ path: "config.env" });
const mongoose = require("mongoose");
const RoommateProfile = require("./models/RoommateProfile");

const demos = [
  {
    bio: "Easy going and tidy. Love cooking and late night study sessions.",
    campus: "Computer Science",
    preferredLocation: "North Gate",
    budgetMin: 150000, budgetMax: 250000,
    gender: "male", educationLevel: "300",
    sleepSchedule: "late", cleanliness: "moderate",
    noisePreference: "quiet", guestPreference: "rarely",
    studyPreference: "home", interests: ["coding", "cooking", "chess"],
    visible: true,
  },
  {
    bio: "Very clean and organized. Early bird who loves the gym.",
    campus: "Medicine",
    preferredLocation: "South Gate",
    budgetMin: 200000, budgetMax: 350000,
    gender: "female", educationLevel: "400",
    sleepSchedule: "early", cleanliness: "very_clean",
    noisePreference: "quiet", guestPreference: "sometimes",
    studyPreference: "library", interests: ["fitness", "reading", "music"],
    visible: true,
  },
  {
    bio: "Chill roommate. I mind my business and respect your space.",
    campus: "Law",
    preferredLocation: "East Side",
    budgetMin: 100000, budgetMax: 200000,
    gender: "male", educationLevel: "200",
    sleepSchedule: "flexible", cleanliness: "relaxed",
    noisePreference: "moderate", guestPreference: "sometimes",
    studyPreference: "mixed", interests: ["football", "movies", "basketball"],
    visible: true,
  },
  {
    bio: "Friendly and social. Love having people over on weekends.",
    campus: "Business Admin",
    preferredLocation: "West End",
    budgetMin: 180000, budgetMax: 300000,
    gender: "female", educationLevel: "300",
    sleepSchedule: "flexible", cleanliness: "moderate",
    noisePreference: "lively", guestPreference: "often",
    studyPreference: "home", interests: ["fashion", "cooking", "dancing"],
    visible: true,
  },
  {
    bio: "Quiet student focused on academics. Need a peaceful environment.",
    campus: "Engineering",
    preferredLocation: "North Gate",
    budgetMin: 120000, budgetMax: 220000,
    gender: "male", educationLevel: "500",
    sleepSchedule: "early", cleanliness: "very_clean",
    noisePreference: "quiet", guestPreference: "rarely",
    studyPreference: "library", interests: ["robotics", "chess", "running"],
    visible: true,
  },
];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    for (const d of demos) {
      d.user = new mongoose.Types.ObjectId();
      await RoommateProfile.create(d);
      console.log(`Created profile: ${d.campus}`);
    }
    console.log("✅ 5 demo profiles created successfully");
    mongoose.disconnect();
  })
  .catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
  });