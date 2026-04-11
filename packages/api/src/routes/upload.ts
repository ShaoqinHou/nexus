import { Hono } from 'hono';
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nanoid } from 'nanoid';
import sharp from 'sharp';
import type { DrizzleDB } from '../db/client.js';
import type { AuthEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, '..', '..');
const UPLOADS_ROOT = resolve(apiRoot, 'data', 'uploads');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Magic bytes for server-side file type validation (don't trust client Content-Type)
function detectMimeType(buffer: Uint8Array): string | null {
  if (buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }

  // WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

const MIME_TO_CONTENT_TYPE: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

// Image processing configuration
const MAX_IMAGE_WIDTH = 1920;
const THUMBNAIL_WIDTH = 400;
const IMAGE_QUALITY = 85;

// Process image: resize and compress, return optimized and thumbnail buffers
async function processImage(buffer: Buffer, mimeType: string): Promise<{
  optimized: Buffer;
  thumbnail: Buffer;
  width: number;
  height: number;
  format: string;
}> {
  const image = sharp(buffer);

  // Get metadata for dimensions
  const metadata = await image.metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  // Determine output format (prefer JPEG for compression, keep WebP if uploaded)
  const outputFormat = mimeType === 'image/webp' ? 'webp' : 'jpeg';

  // Process optimized version (max 1920px width, quality 85)
  const optimized = await image
    .resize(MAX_IMAGE_WIDTH, null, {
      withoutEnlargement: true,
      fit: 'inside',
    })
    .toFormat(outputFormat, { quality: IMAGE_QUALITY })
    .toBuffer();

  // Get optimized dimensions
  const optimizedMetadata = await sharp(optimized).metadata();

  // Generate thumbnail (400px width, quality 85)
  const thumbnail = await sharp(buffer)
    .resize(THUMBNAIL_WIDTH, null, {
      withoutEnlargement: true,
      fit: 'inside',
    })
    .toFormat(outputFormat, { quality: IMAGE_QUALITY })
    .toBuffer();

  return {
    optimized,
    thumbnail,
    width: optimizedMetadata.width || originalWidth,
    height: optimizedMetadata.height || originalHeight,
    format: outputFormat,
  };
}

// --- Tenant-scoped upload routes (mounted under /api/t/:tenantSlug/upload) ---

export function uploadRoutes(db: DrizzleDB) {
  const router = new Hono<AuthEnv>();

  // POST /upload — requires staff auth
  router.post('/', authMiddleware(db), async (c) => {
    const tenantId = c.var.tenantId;

    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided. Send a "file" field in multipart form data.' }, 400);
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: `File too large. Maximum size is 5MB.` }, 400);
    }

    // Check declared MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return c.json({ error: `Invalid file type "${file.type}". Allowed: JPEG, PNG, WebP.` }, 400);
    }

    // Read file buffer and validate magic bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const detectedMime = detectMimeType(new Uint8Array(arrayBuffer));
    if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
      return c.json({ error: 'File content does not match an allowed image type (JPEG, PNG, WebP).' }, 400);
    }

    // Process image: resize, compress, generate thumbnail
    const processed = await processImage(buffer, detectedMime);

    // Use the processed format for the extension
    const ext = MIME_TO_EXT[`image/${processed.format}` as keyof typeof MIME_TO_EXT] || '.jpg';
    const filename = `${nanoid()}${ext}`;
    const thumbFilename = `${nanoid()}-thumb${ext}`;

    // Ensure tenant upload directory exists
    const tenantUploadDir = join(UPLOADS_ROOT, tenantId);
    if (!existsSync(tenantUploadDir)) {
      mkdirSync(tenantUploadDir, { recursive: true });
    }

    // Write both files to disk
    const filePath = join(tenantUploadDir, filename);
    const thumbPath = join(tenantUploadDir, thumbFilename);
    writeFileSync(filePath, processed.optimized);
    writeFileSync(thumbPath, processed.thumbnail);

    const url = `/api/uploads/${tenantId}/${filename}`;
    const thumbnailUrl = `/api/uploads/${tenantId}/${thumbFilename}`;

    return c.json({
      data: {
        url,
        thumbnailUrl,
        width: processed.width,
        height: processed.height,
        size: processed.optimized.length,
        originalSize: buffer.length,
      },
    }, 201);
  });

  return router;
}

// --- Public static file serving (mounted at /api/uploads/:tenantId/:filename) ---

export function uploadServeRoutes() {
  const router = new Hono();

  router.get('/:tenantId/:filename', (c) => {
    const tenantId = c.req.param('tenantId');
    const filename = c.req.param('filename');

    // Sanitize: only allow alphanumeric, hyphens, underscores, dots
    if (!/^[\w.-]+$/.test(tenantId) || !/^[\w.-]+$/.test(filename)) {
      return c.json({ error: 'Invalid path' }, 400);
    }

    // Prevent directory traversal
    if (tenantId.includes('..') || filename.includes('..')) {
      return c.json({ error: 'Invalid path' }, 400);
    }

    const filePath = join(UPLOADS_ROOT, tenantId, filename);

    if (!existsSync(filePath)) {
      return c.json({ error: 'File not found' }, 404);
    }

    const ext = extname(filename).toLowerCase();
    const contentType = MIME_TO_CONTENT_TYPE[ext] || 'application/octet-stream';

    const fileBuffer = readFileSync(filePath);
    const stat = statSync(filePath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year — filename has nanoid
        'X-Content-Type-Options': 'nosniff',
      },
    });
  });

  return router;
}
