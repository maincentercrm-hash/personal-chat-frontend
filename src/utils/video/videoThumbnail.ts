/**
 * Video thumbnail generation utilities
 * Generate thumbnail image from video
 */

export interface ThumbnailOptions {
  timeInSeconds?: number;  // เวลาที่จะ capture (default: 2)
  maxWidth?: number;       // ความกว้างสูงสุด (default: 1280)
  maxHeight?: number;      // ความสูงสูงสุด (default: 720)
  quality?: number;        // 0-1 (default: 0.8)
}

/**
 * Generate thumbnail from video file
 */
export const generateVideoThumbnail = (
  file: File,
  options: ThumbnailOptions = {}
): Promise<Blob> => {
  const {
    timeInSeconds = 2,
    maxWidth = 1280,
    maxHeight = 720,
    quality = 0.8
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      // Seek to specified time (or middle if duration too short)
      const seekTime = Math.min(timeInSeconds, video.duration / 2);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        // Create canvas
        const canvas = document.createElement('canvas');
        let width = video.videoWidth;
        let height = video.videoHeight;

        // Resize if exceeds max dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw video frame
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        ctx.drawImage(video, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail blob'));
            }
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };
  });
};

/**
 * Generate thumbnail and get data URL (for preview)
 */
export const generateVideoThumbnailDataURL = async (
  file: File,
  options: ThumbnailOptions = {}
): Promise<string> => {
  const blob = await generateVideoThumbnail(file, options);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert thumbnail to data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
