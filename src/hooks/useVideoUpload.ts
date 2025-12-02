/**
 * Hook สำหรับ upload video
 * รองรับ 2 วิธี: Direct Upload + Presigned URL
 */

import { useState, useCallback } from 'react';
import { validateVideoFile } from '@/utils/video/videoValidation';
import { extractVideoMetadata, type VideoMetadata } from '@/utils/video/videoMetadata';
import { generateVideoThumbnail } from '@/utils/video/videoThumbnail';

export interface VideoUploadResult {
  videoUrl: string;
  thumbnailUrl: string;
  metadata: VideoMetadata & {
    size: number;
    format: string;
  };
}

export interface VideoUploadProgress {
  stage: 'validating' | 'metadata' | 'thumbnail' | 'uploading' | 'completed' | 'error';
  progress: number;  // 0-100
  message?: string;
}

export interface UseVideoUploadOptions {
  onProgress?: (progress: VideoUploadProgress) => void;
  onError?: (error: Error) => void;
  onSuccess?: (result: VideoUploadResult) => void;
  usePresignedUrl?: boolean;  // true สำหรับไฟล์ใหญ่
}

export const useVideoUpload = (options: UseVideoUploadOptions = {}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<VideoUploadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const updateProgress = useCallback((newProgress: VideoUploadProgress) => {
    setProgress(newProgress);
    options.onProgress?.(newProgress);
  }, [options]);

  /**
   * Upload video - Main function
   */
  const uploadVideo = useCallback(async (file: File): Promise<VideoUploadResult> => {
    try {
      setUploading(true);
      setError(null);

      // 1. Validate
      updateProgress({ stage: 'validating', progress: 10, message: 'Validating video...' });
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        throw new Error(validation.error?.message);
      }

      // 2. Extract metadata
      updateProgress({ stage: 'metadata', progress: 30, message: 'Extracting metadata...' });
      const metadata = await extractVideoMetadata(file);

      // 3. Generate thumbnail
      updateProgress({ stage: 'thumbnail', progress: 50, message: 'Generating thumbnail...' });
      const thumbnailBlob = await generateVideoThumbnail(file);

      // 4. Upload video
      updateProgress({ stage: 'uploading', progress: 60, message: 'Uploading video...' });
      const videoUrl = await uploadVideoFile(file, (uploadProgress) => {
        const progressPercent = 60 + (uploadProgress * 0.3); // 60-90%
        updateProgress({
          stage: 'uploading',
          progress: progressPercent,
          message: `Uploading... ${Math.round(uploadProgress)}%`
        });
      });

      // 5. Upload thumbnail
      updateProgress({ stage: 'uploading', progress: 90, message: 'Uploading thumbnail...' });
      const thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' });
      const thumbnailUrl = await uploadThumbnailFile(thumbnailFile);

      // 6. Complete
      const result: VideoUploadResult = {
        videoUrl,
        thumbnailUrl,
        metadata: {
          ...metadata,
          size: file.size,
          format: file.type
        }
      };

      updateProgress({ stage: 'completed', progress: 100, message: 'Upload completed!' });
      options.onSuccess?.(result);

      setUploading(false);
      return result;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');
      setError(error);
      updateProgress({ stage: 'error', progress: 0, message: error.message });
      options.onError?.(error);
      setUploading(false);
      throw error;
    }
  }, [updateProgress, options]);

  /**
   * Upload video file to backend
   */
  const uploadVideoFile = async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    // TODO: Implement based on backend API
    // Option 1: Direct upload
    // Option 2: Presigned URL

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'videos');

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            onProgress(percent);
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.data.url);
        } else {
          reject(new Error('Upload failed'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));

      xhr.open('POST', '/api/v1/files/file');
      xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
      xhr.send(formData);
    });
  };

  /**
   * Upload thumbnail file to backend
   */
  const uploadThumbnailFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', 'thumbnails');

    const response = await fetch('/api/v1/files/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload thumbnail');
    }

    const result = await response.json();
    return result.data.url;
  };

  /**
   * Get auth token (you need to implement this based on your auth system)
   */
  const getToken = (): string => {
    // TODO: Get token from your auth store/context
    return localStorage.getItem('token') || '';
  };

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    uploadVideo,
    uploading,
    progress,
    error,
    reset
  };
};
