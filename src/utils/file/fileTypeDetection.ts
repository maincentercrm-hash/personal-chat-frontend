/**
 * File type detection utilities
 * Detect file type from MIME type or extension
 */

export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'other';

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
] as const;

export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska'
] as const;

export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm'
] as const;

export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
] as const;

/**
 * Detect file category from MIME type
 */
export const detectFileCategory = (mimeType: string): FileCategory => {
  if (IMAGE_MIME_TYPES.includes(mimeType as any)) return 'image';
  if (VIDEO_MIME_TYPES.includes(mimeType as any)) return 'video';
  if (AUDIO_MIME_TYPES.includes(mimeType as any)) return 'audio';
  if (DOCUMENT_MIME_TYPES.includes(mimeType as any)) return 'document';
  return 'other';
};

/**
 * Get file category from file
 */
export const getFileCategory = (file: File): FileCategory => {
  return detectFileCategory(file.type);
};

/**
 * Check if file is specific category
 */
export const isImage = (file: File): boolean => getFileCategory(file) === 'image';
export const isVideo = (file: File): boolean => getFileCategory(file) === 'video';
export const isAudio = (file: File): boolean => getFileCategory(file) === 'audio';
export const isDocument = (file: File): boolean => getFileCategory(file) === 'document';

/**
 * Get icon name for file type (for UI)
 */
export const getFileIcon = (file: File): string => {
  const category = getFileCategory(file);
  switch (category) {
    case 'image': return 'image';
    case 'video': return 'video';
    case 'audio': return 'audio';
    case 'document': return 'file-text';
    default: return 'file';
  }
};
