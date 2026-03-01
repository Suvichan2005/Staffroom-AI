// ─────────────────────────────────────────────────────────────
// middleware/rateLimiter.js — Redis-backed per-user rate limiter
//
// Uses express-rate-limit + rate-limit-redis for distributed,
// cold-start-resistant limiting. Falls back to in-memory store
// when Redis is unavailable so the server still boots in dev.
// ─────────────────────────────────────────────────────────────

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';
import config from '../config/env.js';

// ── Redis client (lazy, singleton) ──────────────────────────
let redisClient = null;
let redisReady = false;

function getRedisClient() {
  if (redisClient) return redisClient;
  if (!config.redis.url) return null;

  redisClient = new Redis(config.redis.url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
  });

  redisClient.on('ready', () => {
    redisReady = true;
    console.log('[rateLimiter] Redis connected');
  });
  redisClient.on('error', (err) => {
    redisReady = false;
    console.warn('[rateLimiter] Redis error (falling back to memory):', err.message);
  });

  // Non-blocking connect — failures are handled via event
  redisClient.connect().catch(() => {});

  return redisClient;
}

// ── Key generator — per-user, not per-IP ────────────────────
function keyGenerator(req) {
  // After requireAuth, req.user.uid is available.
  // Fallback to IP only for unauthenticated health-check routes.
  if (req.user?.uid) return `rl:${req.user.uid}`;
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  return `rl:ip:${ip}`;
}

// ── Build the store ─────────────────────────────────────────
function buildStore() {
  const client = getRedisClient();
  if (!client) return undefined; // express-rate-limit uses MemoryStore

  return new RedisStore({
    // `call` is compatible with ioredis
    sendCommand: (...args) => client.call(...args),
    prefix: 'staffroom-rl:',
  });
}

// ── Exported limiter middleware ─────────────────────────────

/**
 * Default per-user rate limiter.
 * 60 requests / minute (configurable via env).
 */
export const aiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: 'draft-7',  // RateLimit-* headers (IETF draft)
  legacyHeaders: false,
  keyGenerator,
  store: buildStore(),
  message: {
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Maximum ${config.rateLimit.max} requests per minute.`,
  },
  skip: (req) => req.method === 'OPTIONS',  // never count preflights
});

/**
 * Strict limiter for expensive operations (transcription, voice tokens).
 * 15 requests / minute.
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator,
  store: buildStore(),
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded for this resource. Max 15 requests per minute.',
  },
  skip: (req) => req.method === 'OPTIONS',
});

/**
 * Cleanup — call on graceful shutdown.
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit().catch(() => {});
    redisClient = null;
    redisReady = false;
  }
}
