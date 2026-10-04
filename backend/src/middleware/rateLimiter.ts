import { Request, Response, NextFunction } from 'express';

// ============================================================================
// CONFIGURABLE RATE LIMITING SYSTEM
// ============================================================================

interface RateLimitConfig {
  authWindowMs: number;
  authMaxAttempts: number;
  authBackoffBaseSec: number;
  authMaxBackoffSec: number;
  publicWindowMs: number;
  publicMaxRequests: number;
  userWindowMs: number;
  userMaxRequests: number;
}

function loadConfig(): RateLimitConfig {
  return {
    authWindowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 15 * 60 * 1000, // 15 mins
    authMaxAttempts: Number(process.env.RATE_LIMIT_AUTH_MAX_ATTEMPTS) || 5, // 5 attempts before backoff
    authBackoffBaseSec: Number(process.env.RATE_LIMIT_AUTH_BACKOFF_BASE_SEC) || 2, // 2s base
    authMaxBackoffSec: Number(process.env.RATE_LIMIT_AUTH_MAX_BACKOFF_SEC) || 300, // 5 mins cap
    publicWindowMs: Number(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS) || 60 * 1000, // 1 min
    publicMaxRequests: Number(process.env.RATE_LIMIT_PUBLIC_MAX) || 60, // 60 req/min
    userWindowMs: Number(process.env.RATE_LIMIT_USER_WINDOW_MS) || 60 * 1000, // 1 min
    userMaxRequests: Number(process.env.RATE_LIMIT_USER_MAX) || 180, // 180 req/min
  };
}

// ----------------------------------------------------------------------------
// Client IP Extraction Helper (handles proxies / Cloudflare / Render)
// ----------------------------------------------------------------------------
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

// ----------------------------------------------------------------------------
// In-Memory Sliding Window & Exponential Backoff Stores
// ----------------------------------------------------------------------------
interface AuthAttemptRecord {
  failures: number;
  firstAttemptTime: number;
  lastAttemptTime: number;
  blockedUntil: number;
}

interface WindowBucket {
  tokens: number[];
}

const authIpStore = new Map<string, AuthAttemptRecord>();
const authAccountStore = new Map<string, AuthAttemptRecord>();
const publicStore = new Map<string, WindowBucket>();
const userStore = new Map<string, WindowBucket>();

// Periodic garbage collection every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const cfg = loadConfig();

  for (const [key, record] of authIpStore.entries()) {
    if (now - record.lastAttemptTime > cfg.authWindowMs && record.blockedUntil < now) {
      authIpStore.delete(key);
    }
  }
  for (const [key, record] of authAccountStore.entries()) {
    if (now - record.lastAttemptTime > cfg.authWindowMs && record.blockedUntil < now) {
      authAccountStore.delete(key);
    }
  }
  for (const [key, bucket] of publicStore.entries()) {
    bucket.tokens = bucket.tokens.filter(t => now - t < cfg.publicWindowMs);
    if (bucket.tokens.length === 0) publicStore.delete(key);
  }
  for (const [key, bucket] of userStore.entries()) {
    bucket.tokens = bucket.tokens.filter(t => now - t < cfg.userWindowMs);
    if (bucket.tokens.length === 0) userStore.delete(key);
  }
}, 5 * 60 * 1000);

// ============================================================================
// 1. AUTH RATE LIMITER (PER-IP + PER-ACCOUNT WITH EXPONENTIAL BACKOFF)
// ============================================================================

export function authRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const config = loadConfig();
  const now = Date.now();
  const ip = getClientIp(req);
  const account = typeof req.body?.email === 'string'
    ? req.body.email.trim().toLowerCase()
    : (typeof req.body?.identifier === 'string' ? req.body.identifier.trim().toLowerCase() : null);

  // Check IP backoff
  const ipRecord = authIpStore.get(ip);
  if (ipRecord && ipRecord.blockedUntil > now) {
    const retryAfterSec = Math.ceil((ipRecord.blockedUntil - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({
      success: false,
      error: `Too many authentication attempts from this IP. Please wait ${retryAfterSec} seconds before retrying.`,
      retryAfter: retryAfterSec
    });
    return;
  }

  // Check Account backoff
  if (account) {
    const accRecord = authAccountStore.get(account);
    if (accRecord && accRecord.blockedUntil > now) {
      const retryAfterSec = Math.ceil((accRecord.blockedUntil - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        success: false,
        error: `Too many failed attempts for this account. Please wait ${retryAfterSec} seconds before retrying.`,
        retryAfter: retryAfterSec
      });
      return;
    }
  }

  next();
}

/**
 * Record a failed authentication attempt to apply exponential backoff
 */
export function recordAuthFailure(req: Request): void {
  const config = loadConfig();
  const now = Date.now();
  const ip = getClientIp(req);
  const account = typeof req.body?.email === 'string'
    ? req.body.email.trim().toLowerCase()
    : (typeof req.body?.identifier === 'string' ? req.body.identifier.trim().toLowerCase() : null);

  // Helper to apply backoff calculation: base * 2^(excessFailures)
  function applyFailure(store: Map<string, AuthAttemptRecord>, key: string) {
    let rec = store.get(key);
    if (!rec || (now - rec.firstAttemptTime > config.authWindowMs && rec.blockedUntil < now)) {
      rec = { failures: 1, firstAttemptTime: now, lastAttemptTime: now, blockedUntil: 0 };
    } else {
      rec.failures += 1;
      rec.lastAttemptTime = now;
    }

    if (rec.failures >= config.authMaxAttempts) {
      const excess = rec.failures - config.authMaxAttempts;
      // Exponential backoff: baseSec * 2^excess (capped at authMaxBackoffSec)
      const backoffSec = Math.min(
        config.authMaxBackoffSec,
        config.authBackoffBaseSec * Math.pow(2, excess)
      );
      rec.blockedUntil = now + (backoffSec * 1000);
    }
    store.set(key, rec);
  }

  applyFailure(authIpStore, ip);
  if (account) {
    applyFailure(authAccountStore, account);
  }
}

/**
 * Reset failure tracking on successful authentication
 */
export function recordAuthSuccess(req: Request): void {
  const ip = getClientIp(req);
  const account = typeof req.body?.email === 'string'
    ? req.body.email.trim().toLowerCase()
    : (typeof req.body?.identifier === 'string' ? req.body.identifier.trim().toLowerCase() : null);

  authIpStore.delete(ip);
  if (account) {
    authAccountStore.delete(account);
  }
}

// ============================================================================
// 2. PUBLIC ENDPOINT RATE LIMITER (MODERATE LIMITS)
// ============================================================================

export function publicRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const config = loadConfig();
  const now = Date.now();
  const ip = getClientIp(req);

  let bucket = publicStore.get(ip);
  if (!bucket) {
    bucket = { tokens: [] };
    publicStore.set(ip, bucket);
  }

  // Remove timestamps outside sliding window
  bucket.tokens = bucket.tokens.filter(t => now - t < config.publicWindowMs);

  const remaining = Math.max(0, config.publicMaxRequests - bucket.tokens.length);
  res.setHeader('X-RateLimit-Limit', String(config.publicMaxRequests));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + config.publicWindowMs) / 1000)));

  if (bucket.tokens.length >= config.publicMaxRequests) {
    const oldestToken = bucket.tokens[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldestToken + config.publicWindowMs - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({
      success: false,
      error: `Too many requests on public endpoints. Please slow down and retry in ${retryAfterSec} seconds.`
    });
    return;
  }

  bucket.tokens.push(now);
  next();
}

// ============================================================================
// 3. AUTHENTICATED USER ACTION RATE LIMITER (LOOSER LIMITS)
// ============================================================================

export function userRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const config = loadConfig();
  const now = Date.now();
  // Identify by user ID header / token / session if provided, fallback to IP
  const userIdentifier = req.headers['x-user-id'] as string ||
                         (req as any).user?.id ||
                         getClientIp(req);

  let bucket = userStore.get(userIdentifier);
  if (!bucket) {
    bucket = { tokens: [] };
    userStore.set(userIdentifier, bucket);
  }

  bucket.tokens = bucket.tokens.filter(t => now - t < config.userWindowMs);

  const remaining = Math.max(0, config.userMaxRequests - bucket.tokens.length);
  res.setHeader('X-RateLimit-Limit', String(config.userMaxRequests));
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  if (bucket.tokens.length >= config.userMaxRequests) {
    const oldestToken = bucket.tokens[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldestToken + config.userWindowMs - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({
      success: false,
      error: `Rate limit exceeded for user actions. Please retry in ${retryAfterSec} seconds.`
    });
    return;
  }

  bucket.tokens.push(now);
  next();
}
