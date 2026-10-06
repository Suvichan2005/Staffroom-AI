// ─────────────────────────────────────────────────────────────
// config/env.js — Environment variable validation & export
// Fails fast on missing required secrets.
// ─────────────────────────────────────────────────────────────

const REQUIRED = ['GEMINI_API_KEY'];

const OPTIONAL_WITH_DEFAULTS = {
  PORT: '8080',
  NODE_ENV: 'production',
  CORS_ALLOWED_ORIGINS: 'https://staffroom-ai.web.app,https://staffroom-ai.firebaseapp.com,http://localhost:5173',
  REDIS_URL: '',
  RATE_LIMIT_MAX: '60',
  RATE_LIMIT_WINDOW_MS: '60000',
};

const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[FATAL] Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

function env(key, fallback) {
  return process.env[key] || OPTIONAL_WITH_DEFAULTS[key] || fallback || '';
}

const config = Object.freeze({
  port: parseInt(env('PORT', '8080'), 10),
  nodeEnv: env('NODE_ENV', 'production'),
  isProd: env('NODE_ENV', 'production') === 'production',

  cors: {
    allowedOrigins: env('CORS_ALLOWED_ORIGINS')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },

  redis: { url: env('REDIS_URL') },

  rateLimit: {
    max: parseInt(env('RATE_LIMIT_MAX', '60'), 10),
    windowMs: parseInt(env('RATE_LIMIT_WINDOW_MS', '60000'), 10),
  },

  gemini: { apiKey: process.env.GEMINI_API_KEY },
});

export default config;
