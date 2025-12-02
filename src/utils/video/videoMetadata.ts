/**
 * Video metadata extraction utilities
 * Extract duration, width, height จาก video file
 */

export interface VideoMetadata {
  duration: number;      // วินาที
  width: number;         // pixels
  height: number;        // pixels
  aspectRatio?: string;  // เช่น "16:9"
  fps?: number;          // frames per second (ถ้าได้)
}

/**
 * Extract metadata from video file
 */
export const extractVideoMetadata = (file: File): Promise<VideoMetadata> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    // Create object URL
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      // Clean up
      URL.revokeObjectURL(url);

      // Calculate aspect ratio
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(video.videoWidth, video.videoHeight);
      const aspectRatio = `${video.videoWidth / divisor}:${video.videoHeight / divisor}`;

      resolve({
        duration: Math.round(video.duration),
        width: video.videoWidth,
        height: video.videoHeight,
        aspectRatio
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video metadata'));
    };
  });
};

/**
 * Format duration to MM:SS
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Get video quality label from resolution
 */
export const getQualityLabel = (_width: number, height: number): string => {
  if (height >= 2160) return '4K';
  if (height >= 1440) return '2K';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  return '360p';
};
