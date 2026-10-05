import crypto from 'crypto';

export interface AdminTokenPayload {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SUPERADMIN';
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'engiverse_admin_rbac_secret_key_2026_!@#$';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Cryptographically signs an administrative token with HMAC-SHA256
 */
export function signAdminToken(
  admin: { id: string; email: string; name: string; role: 'ADMIN' | 'SUPERADMIN' },
  expiresInSeconds: number = 86400 * 7 // 7 days expiration
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminTokenPayload = {
    id: admin.id,
    email: admin.email.toLowerCase(),
    name: admin.name,
    role: admin.role,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
}

/**
 * Validates token signature, expiration, and payload integrity.
 * Returns decoded payload if valid, null otherwise.
 */
export function verifyAdminToken(token: string | undefined | null): AdminTokenPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  // Constant-time signature comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payloadJson = base64UrlDecode(encodedPayload);
    const payload: AdminTokenPayload = JSON.parse(payloadJson);

    // Verify role is strictly ADMIN or SUPERADMIN
    if (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN') {
      return null;
    }

    // Verify expiration timestamp
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
