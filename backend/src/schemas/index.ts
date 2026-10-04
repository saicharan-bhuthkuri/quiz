import { z } from 'zod';

// ============================================================================
// STRICT VALIDATION SCHEMAS (TYPE, LENGTH, FORMAT, UNKNOWN KEYS REJECTED)
// ============================================================================

// Standard sanitization/regex helpers
const SAFE_TEXT_REGEX = /^[\p{L}\p{N}\s.,_\-–—'’"()@#/:;+*&!?]+$/u;
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;
const UUID_OR_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

// ----------------------------------------------------------------------------
// 1. Authentication Schemas
// ----------------------------------------------------------------------------
export const registerUserSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters long' })
    .max(100, { message: 'Name cannot exceed 100 characters' })
    .regex(SAFE_TEXT_REGEX, { message: 'Name contains invalid characters' }),
  email: z.string()
    .trim()
    .email({ message: 'Must be a valid email address' })
    .max(255, { message: 'Email cannot exceed 255 characters' })
    .toLowerCase(),
  mobile: z.string()
    .trim()
    .regex(PHONE_REGEX, { message: 'Mobile number must be a valid format (7-20 digits)' }),
  branch: z.string()
    .trim()
    .min(2, { message: 'Engineering branch must be at least 2 characters' })
    .max(100, { message: 'Engineering branch cannot exceed 100 characters' }),
  year: z.string()
    .trim()
    .min(1, { message: 'Academic year is required' })
    .max(50, { message: 'Academic year cannot exceed 50 characters' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(128, { message: 'Password cannot exceed 128 characters' }),
  avatar: z.string()
    .trim()
    .max(500, { message: 'Avatar reference cannot exceed 500 characters' })
    .optional()
    .default('')
}).strict(); // Reject any undeclared fields

export const loginSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: 'Must be a valid email address' })
    .max(255, { message: 'Email cannot exceed 255 characters' })
    .toLowerCase(),
  password: z.string()
    .min(1, { message: 'Password is required' })
    .max(128, { message: 'Password cannot exceed 128 characters' })
}).strict();

export const socialAuthSchema = z.object({
  provider: z.enum(['github', 'google']),
  name: z.string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters long' })
    .max(100, { message: 'Name cannot exceed 100 characters' }),
  email: z.string()
    .trim()
    .email({ message: 'Must be a valid email address' })
    .max(255, { message: 'Email cannot exceed 255 characters' })
    .toLowerCase(),
  avatar: z.string()
    .trim()
    .max(500, { message: 'Avatar reference cannot exceed 500 characters' })
    .optional()
    .default(''),
  discipline: z.string()
    .trim()
    .max(100)
    .optional()
    .default('Computer Science')
}).strict();

// ----------------------------------------------------------------------------
// 2. Quiz Attempt Schema
// ----------------------------------------------------------------------------
export const quizAttemptSchema = z.object({
  userEmail: z.string()
    .trim()
    .email({ message: 'Valid user email required' })
    .max(255)
    .toLowerCase(),
  userName: z.string()
    .trim()
    .min(2)
    .max(100)
    .regex(SAFE_TEXT_REGEX),
  score: z.number()
    .int({ message: 'Score must be an integer' })
    .min(0, { message: 'Score cannot be negative' })
    .max(10000, { message: 'Score exceeds upper limit' }),
  totalQuestions: z.number()
    .int()
    .min(1, { message: 'Total questions must be at least 1' })
    .max(200, { message: 'Total questions cannot exceed 200' }),
  xpEarned: z.number()
    .int()
    .min(0)
    .max(100000),
  accuracy: z.number()
    .int()
    .min(0)
    .max(100),
  rankTitle: z.string()
    .trim()
    .min(1)
    .max(100)
    .default('Novice Engineer'),
  category: z.string()
    .trim()
    .max(100)
    .optional()
}).strict();

// ----------------------------------------------------------------------------
// 3. Event & Live Match Schemas
// ----------------------------------------------------------------------------
export const eventRegisterSchema = z.object({
  eventId: z.string()
    .trim()
    .regex(UUID_OR_ID_REGEX, { message: 'Invalid event identifier' })
    .max(64),
  userName: z.string()
    .trim()
    .min(2)
    .max(100),
  userEmail: z.string()
    .trim()
    .email()
    .max(255)
    .toLowerCase()
}).strict();

// ----------------------------------------------------------------------------
// 4. UptimeRobot Config & Action Schemas
// ----------------------------------------------------------------------------
export const uptimeConfigSchema = z.object({
  apiKey: z.string()
    .trim()
    .min(10, { message: 'API key must be at least 10 characters' })
    .max(128, { message: 'API key cannot exceed 128 characters' })
    .regex(/^[a-zA-Z0-9_\-]+$/, { message: 'API key contains invalid characters' }),
  monitorId: z.string()
    .trim()
    .regex(/^[0-9]+$/, { message: 'Monitor ID must be numeric' })
    .max(32)
    .optional()
}).strict();

export const uptimePingSchema = z.object({
  url: z.string()
    .trim()
    .url({ message: 'Must be a valid HTTP/HTTPS URL' })
    .max(500)
    .refine((val) => val.startsWith('http://') || val.startsWith('https://'), {
      message: 'Only HTTP and HTTPS protocols are permitted'
    })
    .optional()
}).strict();

export const uptimeActionSchema = z.object({
  action: z.enum(['pause', 'resume'], { message: 'Action must be either "pause" or "resume"' }),
  monitorId: z.string()
    .trim()
    .regex(/^[0-9]+$/, { message: 'Monitor ID must be numeric' })
    .max(32)
    .optional()
}).strict();

// ----------------------------------------------------------------------------
// 5. File / Avatar Upload Schemas
// ----------------------------------------------------------------------------
export const avatarUploadSchema = z.object({
  dataUrl: z.string()
    .trim()
    .max(5 * 1024 * 1024, { message: 'Image data URL exceeds maximum size (5MB)' })
    .regex(/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/, {
      message: 'Image must be a valid PNG, JPEG, or WEBP Base64 data URL'
    })
}).strict();
