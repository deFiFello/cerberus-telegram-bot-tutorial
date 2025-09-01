import rateLimit from "express-rate-limit";
export const perIpLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ code: "RATE_LIMIT", msg: "Too many requests" })
});