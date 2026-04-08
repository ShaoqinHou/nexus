import { useState, useRef, useCallback, type DragEvent } from 'react';
import { Upload, X, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { apiClient } from '@web/lib/api';

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  tenantSlug: string;
  label?: string;
  aspectRatio?: '1:1' | '16:9' | '3:1';
}

const ASPECT_CLASSES: Record<string, string> = {
  '1:1': 'aspect-square',
  '16:9': 'aspect-video',
  '3:1': 'aspect-[3/1]',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface UploadResponse {
  data: { url: string };
}

export function ImageUpload({
  value,
  onChange,
  tenantSlug,
  label,
  aspectRatio = '1:1',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectClass = ASPECT_CLASSES[aspectRatio] || ASPECT_CLASSES['1:1'];

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.has(file.type)) {
      return 'Invalid file type. Allowed: JPEG, PNG, WebP.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 5MB.';
    }
    return null;
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      const result = await apiClient.upload<UploadResponse>(
        `/t/${tenantSlug}/upload`,
        file,
        (percent) => setProgress(percent),
      );
      onChange(result.data.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [tenantSlug, onChange, validateFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleUpload]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  const handleRemove = useCallback(() => {
    onChange(null);
    setError(null);
    setShowUrlInput(false);
    setUrlValue('');
  }, [onChange]);

  const handleUrlSubmit = useCallback(() => {
    const trimmed = urlValue.trim();
    if (trimmed) {
      onChange(trimmed);
      setShowUrlInput(false);
      setUrlValue('');
      setError(null);
    }
  }, [urlValue, onChange]);

  const handleClick = useCallback(() => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  }, [uploading]);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-text">{label}</label>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Choose image file"
      />

      {value ? (
        /* --- Preview state --- */
        <div className="relative group">
          <div
            className={`${aspectClass} w-full overflow-hidden rounded-lg border border-border bg-bg-muted`}
          >
            <img
              src={value}
              alt="Uploaded image"
              className="h-full w-full object-cover"
            />
          </div>
          {/* Overlay controls */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClick}
              disabled={uploading}
              className="bg-bg/90 hover:bg-bg"
            >
              <Upload className="h-3.5 w-3.5" />
              Replace
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        /* --- Empty / upload state --- */
        <div
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            `${aspectClass} w-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors`,
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-border-strong hover:bg-bg-muted',
            uploading ? 'pointer-events-none opacity-70' : '',
          ].join(' ')}
        >
          {uploading ? (
            <>
              <div className="relative h-10 w-10">
                <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    className="stroke-bg-muted"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    className="stroke-primary"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${progress * 1.005} 100.5`}
                  />
                </svg>
              </div>
              <p className="text-xs text-text-secondary">
                Uploading... {progress}%
              </p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-text-tertiary" />
              <p className="text-sm text-text-secondary">
                Click or drag an image here
              </p>
              <p className="text-xs text-text-tertiary">
                JPEG, PNG, or WebP (max 5MB)
              </p>
            </>
          )}
        </div>
      )}

      {/* Progress bar (shown below the zone during upload) */}
      {uploading && (
        <div className="h-1.5 w-full rounded-full bg-bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-200 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}

      {/* URL fallback toggle */}
      {!value && !uploading && (
        <div>
          {showUrlInput ? (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label=""
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUrlSubmit();
                    }
                  }}
                />
              </div>
              <Button
                size="sm"
                onClick={handleUrlSubmit}
                disabled={!urlValue.trim()}
              >
                Set
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowUrlInput(false);
                  setUrlValue('');
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <LinkIcon className="h-3 w-3" />
              Or enter a URL instead
            </button>
          )}
        </div>
      )}
    </div>
  );
}
