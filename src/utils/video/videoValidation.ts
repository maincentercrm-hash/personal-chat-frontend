/**
 * Video validation utilities
 * ใช้ validate video file ก่อน upload
 */

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',      // MOV
  'video/x-msvideo',      // AVI
  'video/x-matroska',     // MKV
  'video/x-ms-wmv',       // WMV
  'video/x-flv',          // FLV
  'video/3gpp',           // 3GP
  'video/3gpp2',          // 3G2
  'video/mpeg',           // MPEG/MPG
  'video/x-mpeg'          // MPEG variant
] as const;

export const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB
export const MIN_VIDEO_SIZE = 1024; // 1KB

export interface VideoValidationError {
  type: 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'FILE_TOO_SMALL' | 'INVALID_FILE';
  message: string;
}

export interface VideoValidationResult {
  valid: boolean;
  error?: VideoValidationError;
}

/**
 * ตรวจสอบว่าไฟล์เป็น video หรือไม่
 */
export const isVideoFile = (file: File): boolean => {
  return ALLOWED_VIDEO_TYPES.includes(file.type as any);
};

/**
 * Validate video file
 */
export const validateVideoFile = (file: File): VideoValidationResult => {
  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: {
        type: 'INVALID_FILE',
        message: 'No file provided'
      }
    };
  }

  // Check file type
  if (!isVideoFile(file)) {
    return {
      valid: false,
      error: {
        type: 'INVALID_TYPE',
        message: `Invalid video format. Allowed: ${ALLOWED_VIDEO_TYPES.join(', ')}`
      }
    };
  }

  // Check file size - too large
  if (file.size > MAX_VIDEO_SIZE) {
    const sizeMB = Math.round(MAX_VIDEO_SIZE / 1024 / 1024);
    return {
      valid: false,
      error: {
        type: 'FILE_TOO_LARGE',
        message: `Video exceeds ${sizeMB}MB limit`
      }
    };
  }

  // Check file size - too small
  if (file.size < MIN_VIDEO_SIZE) {
    return {
      valid: false,
      error: {
        type: 'FILE_TOO_SMALL',
        message: 'Video file is too small or corrupted'
      }
    };
  }

  return { valid: true };
};

/**
 * Format file size to human readable
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
};

/**
 * Get video file extension
 */
export const getVideoExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};
