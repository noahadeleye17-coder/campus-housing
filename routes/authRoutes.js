
const express = require("express");
const router = express.Router();

const { register, login, googleLogin } = require("../controllers/authController");
const { registerRules, loginRules, validate } = require("../middleware/validateAuth");

router.post("/register", registerRules, validate, register);
router.post("/login", loginRules, validate, login);
router.post("/google", googleLogin);

module.exports = router;
