// ─────────────────────────────────────────────────────────────
// config/cors.js — Strict CORS configuration
// Uses an exact-match allowlist. No .includes() or regex.
// ─────────────────────────────────────────────────────────────

import config from './env.js';

/**
 * Build the cors options object for the `cors` package.
 *
 * origin — function that checks every incoming Origin header against
 *          the exact allowlist from CORS_ALLOWED_ORIGINS.
 *          Requests with no Origin (e.g. server-to-server, curl)
 *          are allowed through so health-checks work.
 */
const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no Origin header (curl, server‑to‑server, Postman)
    if (!origin) return callback(null, true);

    if (config.cors.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 h preflight cache
  optionsSuccessStatus: 204,
};

export default corsOptions;
