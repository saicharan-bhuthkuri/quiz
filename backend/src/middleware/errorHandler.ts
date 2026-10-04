import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Attach unique trace/request ID to all incoming requests
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  (req as any).id = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
}

// Centralized error handler that masks internal errors and prevents leakage
export function centralizedErrorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const reqId = (req as any).id || 'unknown';
  const timestamp = new Date().toISOString();

  // Full error logging on server-side only
  console.error(`[INTERNAL_ERROR][${timestamp}][ReqID: ${reqId}] ${req.method} ${req.originalUrl}`);
  if (err.stack) {
    console.error(err.stack);
  } else {
    console.error(err);
  }

  // Determine appropriate client status code
  let statusCode = 500;
  if (typeof err.status === 'number' && err.status >= 400 && err.status < 600) {
    statusCode = err.status;
  } else if (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600) {
    statusCode = err.statusCode;
  }

  // Never return raw SQL, table names, file paths, or stack traces
  const safeMessage = statusCode === 400
    ? (err.isCustom ? err.message : 'Invalid request payload')
    : statusCode === 404
      ? 'The requested resource was not found'
      : statusCode === 429
        ? 'Rate limit exceeded'
        : 'An internal server error occurred. Our engineering team has been notified.';

  res.status(statusCode).json({
    success: false,
    error: safeMessage,
    requestId: reqId
  });
}
