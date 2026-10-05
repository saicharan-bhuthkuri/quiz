import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken, AdminTokenPayload } from '../utils/adminToken.js';
import { db } from '../db.js';

// Extend Express Request declaration to include verified admin
declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

/**
 * Enforces Role-Based Access Control (RBAC) on administrative endpoints.
 * Requires a valid HMAC-signed admin token and verifies account status against the database.
 * 
 * @param allowedRoles List of roles permitted to access this endpoint (defaults to ['ADMIN', 'SUPERADMIN'])
 */
export function requireAdminAuth(allowedRoles: ('ADMIN' | 'SUPERADMIN')[] = ['ADMIN', 'SUPERADMIN']) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Extract token from Authorization header or x-admin-token header
      const authHeader = req.headers['authorization'];
      let token: string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      } else if (req.headers['x-admin-token']) {
        token = String(req.headers['x-admin-token']).trim();
      }

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Administrative authentication token required. Access restricted.'
        });
      }

      // 2. Cryptographically verify signature and expiry
      const payload = verifyAdminToken(token);
      if (!payload) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Invalid or expired administrator session. Please sign in again.'
        });
      }

      // 3. Verify admin account against active database or env credentials
      const envAdminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
      let activeRole: 'ADMIN' | 'SUPERADMIN' = payload.role;

      if (payload.id === 'adm_primary_super' || (envAdminEmail && payload.email === envAdminEmail)) {
        activeRole = 'SUPERADMIN';
      } else {
        const adminCheck = await db.execute({
          sql: 'SELECT id, email, role FROM admins WHERE id = ? LIMIT 1;',
          args: [payload.id]
        });

        if (adminCheck.rows.length === 0) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized: Administrator account not found in database or has been deactivated.'
          });
        }

        const dbRole = String(adminCheck.rows[0].role || 'ADMIN').toUpperCase();
        if (dbRole === 'SUPERADMIN' || dbRole === 'ADMIN') {
          activeRole = dbRole as 'ADMIN' | 'SUPERADMIN';
        }
      }

      // 4. Role-based Access Control Check
      if (!allowedRoles.includes(activeRole)) {
        return res.status(403).json({
          success: false,
          error: `Forbidden: Access restricted. Role '${activeRole}' does not possess required administrative permissions.`
        });
      }

      req.admin = {
        ...payload,
        role: activeRole
      };

      next();
    } catch (err: any) {
      console.error('[AdminAuth Middleware Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal authorization error'
      });
    }
  };
}
