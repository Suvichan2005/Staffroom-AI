// ─────────────────────────────────────────────────────────────
// middleware/errorHandler.js — Centralised Express error handler
//
// Catches both sync and async errors (via express 5+ or
// express-async-errors). Returns a consistent JSON envelope
// and NEVER leaks stack traces in production.
// ─────────────────────────────────────────────────────────────

import config from '../config/env.js';

/**
 * Map known error patterns to user-friendly status codes / messages
 * so we never expose internal details.
 */
const ERROR_MAP = [
  { match: /CORS/i,              status: 403, message: 'Origin not allowed.' },
  { match: /API key/i,           status: 500, message: 'AI service configuration error.' },
  { match: /quota/i,             status: 429, message: 'AI service quota exceeded.' },
  { match: /rate.?limit/i,       status: 429, message: 'Rate limit exceeded.' },
  { match: /timeout|ETIMEDOUT/i, status: 504, message: 'Upstream service timeout.' },
  { match: /ECONNREFUSED/i,      status: 502, message: 'Upstream service unavailable.' },
];

/**
 * Express error-handling middleware (4 args).
 * Must be the LAST middleware registered.
 */
export default function errorHandler(err, req, res, _next) {
  // Already sent headers — delegate to Express default behaviour
  if (res.headersSent) return _next(err);

  // Determine status code
  let status = err.status || err.statusCode || 500;
  let message = 'Internal server error.';

  // Check against known patterns
  const errMsg = err.message || '';
  for (const entry of ERROR_MAP) {
    if (entry.match.test(errMsg)) {
      status = entry.status;
      message = entry.message;
      break;
    }
  }

  // Use explicit message for 4xx (client errors)
  if (status >= 400 && status < 500 && err.message) {
    message = err.message;
  }

  // Log the full error server-side
  const logPayload = {
    status,
    message: errMsg,
    path: req.originalUrl,
    method: req.method,
    uid: req.user?.uid || 'anonymous',
  };

  if (status >= 500) {
    console.error('[ERROR]', logPayload, config.isProd ? '' : err.stack);
  } else {
    console.warn('[WARN]', logPayload);
  }

  // Build the response envelope
  const body = {
    error: status >= 500 ? 'Internal Server Error' : err.name || 'Error',
    message,
  };

  // Include stack only in development
  if (!config.isProd) {
    body.stack = err.stack;
  }

  return res.status(status).json(body);
}
