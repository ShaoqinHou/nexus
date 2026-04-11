# Image Optimization Feature

## Feature Description

Add automatic image processing to the upload route to resize, compress, and generate multiple sizes of uploaded images. This improves performance for mobile users and reduces bandwidth costs.

## User Stories

- As a restaurant owner, I want uploaded menu item photos to be automatically optimized so they load quickly on mobile devices
- As a customer, I want menu images to load quickly on my phone without consuming too much data
- As a developer, I want the system to generate responsive image sizes automatically so I don't have to manually create thumbnails

## Behavioral Specifications

### Given/When/Then Scenarios

**Scenario 1: Upload large JPEG**
- Given a restaurant owner uploads a 4000×3000px JPEG (5MB)
- When the upload completes
- Then the system should:
  - Resize to max 1920px width (maintain aspect ratio)
  - Compress to quality 85
  - Generate thumbnail at 400px width
  - Store both optimized versions
  - Return URLs for both sizes

**Scenario 2: Upload PNG menu photo**
- Given a restaurant owner uploads a 2000×2000px PNG (3MB)
- When the upload completes
- Then the system should:
  - Convert to JPEG for better compression (unless transparency is needed)
  - Resize to max 1920px width
  - Generate thumbnail at 400px width
  - Reduce file size by ~60-80%

**Scenario 3: Upload small image**
- Given a restaurant owner uploads a 300×200px image (50KB)
- When the upload completes
- Then the system should:
  - Not resize (already small)
  - Generate thumbnail at 200px width
  - Still compress if possible

## API Contracts

### POST /api/t/:tenantSlug/upload

**Request:** (unchanged)
- Multipart form data with `file` field
- Accepts: JPEG, PNG, WebP up to 5MB

**Response:** (modified)
```typescript
{
  data: {
    url: string,          // Original/full size image
    thumbnailUrl: string, // Thumbnail version (400px width)
    width: number,        // Optimized image width
    height: number,       // Optimized image height
    size: number,         // Optimized file size in bytes
    originalSize: number  // Original file size in bytes
  }
}
```

### GET /api/uploads/:tenantId/:filename

**Response:** (unchanged)
- Serves the optimized image file
- Content-Type based on file extension
- Cache-Control: 1 year

## Component Hierarchy and Data Flow

### Backend Flow

```
POST /upload
  → Validate file (size, MIME type, magic bytes)
  → Read buffer
  → Process with Sharp:
      → Resize to max 1920px width (maintain aspect ratio)
      → Compress to quality 85
      → Generate thumbnail 400px width
  → Save both versions to disk:
      → {nanoid}.jpg (optimized)
      → {nanoid}-thumb.jpg (thumbnail)
  → Return URLs
```

### File Storage Structure

```
data/uploads/{tenantId}/
  ├── {nanoid}.jpg          # Optimized full-size (max 1920px)
  └── {nanoid}-thumb.jpg    # Thumbnail (400px wide)
```

## Tenant Isolation Requirements

- Each tenant's uploads stored in separate directory: `data/uploads/{tenantId}/`
- No cross-tenant file access
- URLs include tenantId for isolation
- File serving validates tenantId parameter

## Implementation Plan

### Phase 1: Install Sharp
```bash
npm install sharp
```

### Phase 2: Add Image Processing to Upload Route

Modify `packages/api/src/routes/upload.ts`:
- Import sharp
- Add processing after magic bytes validation
- Generate optimized and thumbnail versions
- Return both URLs

### Phase 3: Update Frontend Image Component

Modify `packages/web/src/components/ui/ImageUpload.tsx`:
- Support displaying optimized vs thumbnail
- Pass both URLs to parent component

## Performance Targets

- **File size reduction:** 60-80% for typical uploads
- **Max dimensions:** 1920px width (maintains aspect ratio)
- **Thumbnail size:** 400px width
- **Quality:** 85 (good balance of quality/size)
- **Format:** Prefer WebP or JPEG for compression

## Security Considerations

- Sharp validates image metadata (protects against malicious images)
- File size limits still apply (5MB max upload)
- Magic byte validation still required
- Sanitized filenames prevent directory traversal
- Processing happens server-side (client can't bypass optimization)

## Testing Requirements

### Layer 1: Unit Tests
- Test image processing function with various inputs
- Test that aspect ratio is maintained
- Test file size reduction

### Layer 2: Integration Tests
- Test upload endpoint returns both URLs
- Test that both files are created on disk
- Test that processed images are valid

### Layer 3: Behavioral Tests
- Upload actual image via form
- Verify both URLs work
- Check file sizes are reduced
- Verify images load in browser

### Layer 4: Output Verification
- Verify optimized image dimensions
- Verify thumbnail dimensions
- Verify file sizes match expectations
- Verify images are valid JPEG/WebP files

## Rollout Plan

1. Install sharp dependency
2. Add image processing to upload route
3. Update tests to verify optimization
4. Update frontend to use thumbnail URLs where appropriate
5. Deploy and monitor for errors

## Success Metrics

- Average upload file size reduced by 60-80%
- Page load times improve by 20-30% on mobile
- No increase in upload errors
- Images still look good quality-wise
