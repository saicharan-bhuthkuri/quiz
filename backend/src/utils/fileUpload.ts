import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ============================================================================
// FILE UPLOAD SAFETY & ISOLATION SYSTEM
// ============================================================================

// Dedicated storage path OUTSIDE the public web root
export const UPLOAD_DIR = path.resolve(process.cwd(), 'storage', 'secure_uploads');

// Ensure directory exists with restricted permissions
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o750 });
}

// Magic bytes signatures for allowed image file formats
const MAGIC_SIGNATURES: Record<string, { bytes: number[]; mask?: number[]; mime: string; ext: string }> = {
  jpeg: {
    bytes: [0xFF, 0xD8, 0xFF],
    mime: 'image/jpeg',
    ext: 'jpg'
  },
  png: {
    bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    mime: 'image/png',
    ext: 'png'
  },
  webp: {
    // RIFF....WEBP (first 4 bytes RIFF, bytes 8-11 WEBP)
    bytes: [0x52, 0x49, 0x46, 0x46],
    mime: 'image/webp',
    ext: 'webp'
  },
  gif: {
    bytes: [0x47, 0x49, 0x46, 0x38], // GIF8
    mime: 'image/gif',
    ext: 'gif'
  }
};

export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB limit

export interface ValidatedFileResult {
  valid: boolean;
  mime?: string;
  ext?: string;
  buffer?: Buffer;
  error?: string;
}

/**
 * Validates buffer content by inspecting magic numbers (actual binary bytes),
 * NOT relying on client-supplied file extensions or MIME headers.
 */
export function validateFileBuffer(buffer: Buffer): ValidatedFileResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Empty file buffer received' };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB` };
  }

  // Check magic byte signatures
  for (const [key, sig] of Object.entries(MAGIC_SIGNATURES)) {
    if (buffer.length < sig.bytes.length) continue;

    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      // Special secondary check for WebP
      if (key === 'webp') {
        if (buffer.length < 12) continue;
        const webpTag = buffer.subarray(8, 12).toString('ascii');
        if (webpTag !== 'WEBP') continue;
      }

      return {
        valid: true,
        mime: sig.mime,
        ext: sig.ext,
        buffer
      };
    }
  }

  return {
    valid: false,
    error: 'File content verification failed: format must be a valid JPEG, PNG, or WEBP image.'
  };
}

/**
 * Validates base64 data URLs (e.g. for avatar updates), verifies magic bytes,
 * and saves to isolated storage.
 */
export function processAndSaveBase64Image(dataUrl: string): { success: boolean; filename?: string; mime?: string; error?: string } {
  try {
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return { success: false, error: 'Malformed Base64 image data URL' };
    }

    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const validation = validateFileBuffer(buffer);
    if (!validation.valid || !validation.ext || !validation.mime) {
      return { success: false, error: validation.error || 'Invalid file content' };
    }

    // Generate non-guessable, sanitized UUID filename
    const safeFilename = `${crypto.randomUUID()}.${validation.ext}`;
    const targetPath = path.join(UPLOAD_DIR, safeFilename);

    // Verify path cannot escape UPLOAD_DIR (path traversal protection)
    if (!targetPath.startsWith(UPLOAD_DIR)) {
      return { success: false, error: 'Path traversal violation detected' };
    }

    // Write file with non-executable permissions (0o644)
    fs.writeFileSync(targetPath, buffer, { mode: 0o644 });

    return {
      success: true,
      filename: safeFilename,
      mime: validation.mime
    };
  } catch (err: any) {
    return { success: false, error: `Failed to process image: ${err.message}` };
  }
}

/**
 * Safely retrieve an uploaded file while strictly preventing path traversal
 * and enforcing secure delivery headers.
 */
export function getSafeFilePath(filename: string): { exists: boolean; fullPath?: string; mime?: string } {
  // Reject filenames containing path navigation
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { exists: false };
  }

  const sanitized = path.basename(filename);
  const fullPath = path.join(UPLOAD_DIR, sanitized);

  if (!fullPath.startsWith(UPLOAD_DIR) || !fs.existsSync(fullPath)) {
    return { exists: false };
  }

  const ext = path.extname(sanitized).toLowerCase().replace('.', '');
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif'
  };

  return {
    exists: true,
    fullPath,
    mime: mimeMap[ext] || 'application/octet-stream'
  };
}
