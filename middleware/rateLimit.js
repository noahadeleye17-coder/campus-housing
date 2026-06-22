const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getClientIp = (req) => {
  return req.ip || req.socket?.remoteAddress || "unknown";
};

const normalizeEmail = (email) => {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
};

const createRateLimiter = ({
  windowMs,
  max,
  message = "Too many requests. Please try again later.",
  keyGenerator = getClientIp,
}) => {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req);
    const current = hits.get(key);

    if (!current || current.resetAt <= now) {
      const resetAt = now + windowMs;
      hits.set(key, { count: 1, resetAt });
      res.set("RateLimit-Limit", String(max));
      res.set("RateLimit-Remaining", String(max - 1));
      res.set("RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
      return next();
    }

    current.count += 1;
    const remaining = Math.max(max - current.count, 0);
    const retryAfter = Math.ceil((current.resetAt - now) / 1000);

    res.set("RateLimit-Limit", String(max));
    res.set("RateLimit-Remaining", String(remaining));
    res.set("RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));

    if (current.count > max) {
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ message });
    }

    next();
  };
};

const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: parsePositiveInt(process.env.API_RATE_LIMIT_MAX, 300),
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 10),
  message: "Too many authentication attempts. Please try again later.",
  keyGenerator: (req) => `${getClientIp(req)}:${normalizeEmail(req.body?.email)}`,
});

const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: parsePositiveInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX, 5),
  message: "Too many password reset attempts. Please try again later.",
  keyGenerator: (req) => `${getClientIp(req)}:${normalizeEmail(req.body?.email)}`,
});

const writeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: parsePositiveInt(process.env.WRITE_RATE_LIMIT_MAX, 60),
  message: "Too many changes submitted. Please slow down and try again later.",
});

const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: parsePositiveInt(process.env.UPLOAD_RATE_LIMIT_MAX, 20),
  message: "Too many upload attempts. Please try again later.",
});

module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  writeLimiter,
  uploadLimiter,
};
