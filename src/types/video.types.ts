/**
 * Video-related type definitions
 */

export interface VideoMetadata {
  duration: number;      // seconds
  width: number;         // pixels
  height: number;        // pixels
  aspectRatio: string;   // e.g., "16:9"
  size: number;          // bytes
  format: string;        // MIME type
}

export interface VideoMessage {
  id: string;
  type: 'video';
  videoUrl: string;
  thumbnailUrl: string;
  metadata: VideoMetadata;
  caption?: string;
  timestamp: number;
}

export interface VideoUploadState {
  uploading: boolean;
  progress: number;      // 0-100
  stage: 'validating' | 'metadata' | 'thumbnail' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  metadata?: VideoMetadata;
  autoPlay?: boolean;
  controls?: boolean;
  className?: string;
}

export interface VideoThumbnailProps {
  videoUrl: string;
  thumbnailUrl: string;
  metadata?: VideoMetadata;
  onClick?: () => void;
  className?: string;
}
