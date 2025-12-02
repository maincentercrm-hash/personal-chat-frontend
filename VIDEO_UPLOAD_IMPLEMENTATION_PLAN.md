# Video Upload Implementation Plan

**วันที่:** 2025-11-27
**เป้าหมาย:** เพิ่มฟีเจอร์ Video Upload + Drag & Drop + Copy-Paste
**หลักการ:** ⚠️ **ไม่กระทบ UI เดิม** - เพิ่มฟีเจอร์ใหม่เท่านั้น

---

## 🎯 Overview

### ปัญหาที่แก้:
1. ❌ ลาก & วาง (Drag & Drop) ไฟล์ไม่ได้
2. ❌ Copy-Paste รูปภาพไม่ได้
3. ❌ ส่งวิดีโอไม่ได้
4. ❌ UI สับสน - ไม่รู้ปุ่มไหนทำอะไร

### แนวทางแก้:
- ✅ เพิ่มฟีเจอร์ใหม่ โดยไม่แก้ของเดิม
- ✅ ใช้ Backend API ที่มีอยู่แล้ว (R2 Storage)
- ✅ Frontend handle video processing เอง (metadata, thumbnail)
- ✅ แยก Phase ทำทีละส่วน - test ได้ทันที

---

## 📊 Implementation Phases

### **Phase 1: Utility Functions (Foundation)**
**ระยะเวลา:** 1-2 ชั่วโมง
**เป้าหมาย:** สร้าง helper functions สำหรับ video processing

**ทำอะไร:**
- สร้าง video validation
- สร้าง metadata extraction
- สร้าง thumbnail generation
- สร้าง file type detection

**ไม่กระทบ UI:** ✅ ไม่กระทบ - เป็น utility functions เท่านั้น

---

### **Phase 2: Video Upload Hook**
**ระยะเวลา:** 1-2 ชั่วโมง
**เป้าหมาย:** สร้าง custom hook สำหรับ upload video

**ทำอะไร:**
- สร้าง `useVideoUpload` hook
- รองรับ 2 วิธี upload: Direct + Presigned URL
- Progress tracking
- Error handling

**ไม่กระทบ UI:** ✅ ไม่กระทบ - เป็น hook เท่านั้น

---

### **Phase 3: Drag & Drop + Copy-Paste**
**ระยะเวลา:** 2-3 ชั่วโมง
**เป้าหมาย:** เพิ่ม Drag & Drop และ Copy-Paste ให้ MessageInput

**ทำอะไร:**
- เพิ่ม drag & drop event handlers
- เพิ่ม paste event handler
- Visual feedback (overlay)
- File validation

**กระทบ UI:** ⚠️ กระทบเล็กน้อย - แก้ MessageInput component
- แต่จะ backward compatible (ถ้าไม่ลากก็ใช้งานปกติ)

---

### **Phase 4: UI Enhancement**
**ระยะเวลา:** 2-3 ชั่วโมง
**เป้าหมาย:** ปรับปรุง Upload Button UI ให้ชัดเจน

**ทำอะไร:**
- เพิ่มไอคอนใหม่ที่ชัดเจนกว่า
- Group buttons เป็นหมวดหมู่
- เพิ่ม tooltip/label
- เพิ่มปุ่ม "วิดีโอ" (ถ้าจำเป็น)

**กระทบ UI:** ⚠️ กระทบปานกลาง - แก้ FileUpload components
- แต่จะรักษา functionality เดิมไว้

---

### **Phase 5: Video Message Display**
**ระยะเวลา:** 1-2 ชั่วโมง
**เป้าหมาย:** แสดง video message ใน chat

**ทำอะไร:**
- สร้าง VideoMessage component
- Video player with controls
- Thumbnail display
- Duration/Size info

**กระทบ UI:** ⚠️ กระทบเล็กน้อย - แก้ MessageItem component
- เพิ่ม case ใหม่สำหรับ video message

---

### **Phase 6: Testing & Bug Fixes**
**ระยะเวลา:** 2-3 ชั่วโมง
**เป้าหมาย:** ทดสอบและแก้ bug

---

## 📂 File Structure

```
src/
├── utils/
│   ├── video/
│   │   ├── videoValidation.ts      # ✨ ไฟล์ใหม่
│   │   ├── videoMetadata.ts        # ✨ ไฟล์ใหม่
│   │   ├── videoThumbnail.ts       # ✨ ไฟล์ใหม่
│   │   └── videoUtils.ts           # ✨ ไฟล์ใหม่
│   │
│   └── file/
│       ├── fileValidation.ts       # 🔄 อาจต้องแก้ (เพิ่ม video types)
│       └── fileTypeDetection.ts    # ✨ ไฟล์ใหม่
│
├── hooks/
│   ├── useVideoUpload.ts           # ✨ ไฟล์ใหม่
│   ├── useFileUpload.ts            # 📖 อ่านอย่างเดียว (reference)
│   └── useDragAndDrop.ts           # ✨ ไฟล์ใหม่
│
├── components/
│   ├── shared/
│   │   ├── MessageInput.tsx            # 🔄 แก้ (+ Drag & Drop, Paste)
│   │   ├── MessageInputArea.tsx        # 🔄 แก้ (+ Drag & Drop overlay)
│   │   └── message/
│   │       ├── VideoMessage.tsx        # ✨ ไฟล์ใหม่
│   │       ├── FileMessage.tsx         # 📖 อ่าน (reference)
│   │       └── ...
│   │
│   └── chat/ (ถ้ามี)
│       ├── FileUploadButton.tsx        # 🔄 แก้ (ปรับ UI)
│       ├── VideoUploadButton.tsx       # ✨ ไฟล์ใหม่ (optional)
│       └── DragDropOverlay.tsx         # ✨ ไฟล์ใหม่
│
├── types/
│   └── video.types.ts              # ✨ ไฟล์ใหม่
│
└── services/
    └── uploadService.ts            # 🔄 แก้ (เพิ่ม video endpoints)
```

**สัญลักษณ์:**
- ✨ = ไฟล์ใหม่ (ไม่กระทบของเดิม)
- 🔄 = แก้ไฟล์เดิม (เพิ่ม feature)
- 📖 = อ่านอย่างเดียว (ไม่แก้)

---

## 🎯 Phase 1: Utility Functions (Detail)

### 1.1 Video Validation

**ไฟล์:** `src/utils/video/videoValidation.ts`

**สร้างใหม่ทั้งหมด - ไม่กระทบของเดิม** ✅

```typescript
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
  'video/x-matroska'      // MKV
] as const;

export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
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
```

---

### 1.2 Video Metadata Extraction

**ไฟล์:** `src/utils/video/videoMetadata.ts`

**สร้างใหม่ทั้งหมด - ไม่กระทบของเดิม** ✅

```typescript
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
export const getQualityLabel = (width: number, height: number): string => {
  if (height >= 2160) return '4K';
  if (height >= 1440) return '2K';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  return '360p';
};
```

---

### 1.3 Video Thumbnail Generation

**ไฟล์:** `src/utils/video/videoThumbnail.ts`

**สร้างใหม่ทั้งหมด - ไม่กระทบของเดิม** ✅

```typescript
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
```

---

### 1.4 File Type Detection

**ไฟล์:** `src/utils/file/fileTypeDetection.ts`

**สร้างใหม่ทั้งหมด - ไม่กระทบของเดิม** ✅

```typescript
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
```

---

## 🎯 Phase 2: Video Upload Hook (Detail)

### 2.1 useVideoUpload Hook

**ไฟล์:** `src/hooks/useVideoUpload.ts`

**สร้างใหม่ทั้งหมด - ไม่กระทบของเดิม** ✅

```typescript
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
```

---

## 🎯 Phase 3: Drag & Drop (Detail)

### 3.1 useDragAndDrop Hook

**ไฟล์:** `src/hooks/useDragAndDrop.ts`

**สร้างใหม่ทั้งหมด - ไม่กระทบของเดิม** ✅

```typescript
/**
 * Hook สำหรับ Drag & Drop functionality
 */

import { useState, useCallback, DragEvent } from 'react';

export interface UseDragAndDropOptions {
  onDrop: (files: File[]) => void;
  onError?: (error: Error) => void;
  accept?: string[];  // MIME types to accept
  maxFiles?: number;  // Maximum number of files
  maxSize?: number;   // Maximum file size in bytes
}

export const useDragAndDrop = (options: UseDragAndDropOptions) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(false);
    setDragCounter(0);

    const { files: droppedFiles } = e.dataTransfer;
    if (!droppedFiles || droppedFiles.length === 0) return;

    try {
      // Convert FileList to Array
      const filesArray = Array.from(droppedFiles);

      // Check max files
      if (options.maxFiles && filesArray.length > options.maxFiles) {
        throw new Error(`Maximum ${options.maxFiles} files allowed`);
      }

      // Filter by accept types
      let validFiles = filesArray;
      if (options.accept && options.accept.length > 0) {
        validFiles = filesArray.filter(file =>
          options.accept!.some(type => {
            if (type.endsWith('/*')) {
              const category = type.split('/')[0];
              return file.type.startsWith(category + '/');
            }
            return file.type === type;
          })
        );

        if (validFiles.length === 0) {
          throw new Error('File type not supported');
        }
      }

      // Check file sizes
      if (options.maxSize) {
        const oversizedFiles = validFiles.filter(file => file.size > options.maxSize!);
        if (oversizedFiles.length > 0) {
          throw new Error(`File size exceeds ${(options.maxSize / 1024 / 1024).toFixed(0)}MB limit`);
        }
      }

      options.onDrop(validFiles);
    } catch (error) {
      options.onError?.(error instanceof Error ? error : new Error('Drop failed'));
    }
  }, [options]);

  return {
    isDragging,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop
    }
  };
};
```

---

## 📋 Implementation Checklist

### Phase 1: Utility Functions
- [ ] สร้าง `videoValidation.ts`
- [ ] สร้าง `videoMetadata.ts`
- [ ] สร้าง `videoThumbnail.ts`
- [ ] สร้าง `fileTypeDetection.ts`
- [ ] ทดสอบ utility functions

### Phase 2: Upload Hook
- [ ] สร้าง `useVideoUpload.ts`
- [ ] ทดสอบ direct upload
- [ ] ทดสอบ presigned URL upload (optional)
- [ ] ทดสอบ progress tracking
- [ ] ทดสอบ error handling

### Phase 3: Drag & Drop
- [ ] สร้าง `useDragAndDrop.ts`
- [ ] แก้ `MessageInput.tsx` - เพิ่ม drag handlers
- [ ] แก้ `MessageInputArea.tsx` - เพิ่ม overlay
- [ ] สร้าง `DragDropOverlay.tsx` (ถ้าต้องการ)
- [ ] ทดสอบ drag & drop รูปภาพ
- [ ] ทดสอบ drag & drop วิดีโอ
- [ ] ทดสอบ drag & drop หลายไฟล์

### Phase 4: Copy-Paste
- [ ] แก้ `MessageInput.tsx` - เพิ่ม paste handler
- [ ] ทดสอบ paste รูปภาพจาก clipboard
- [ ] ทดสอบ paste screenshot
- [ ] ทดสอบ paste ข้อความปกติ (ไม่เกิด error)

### Phase 5: UI Enhancement
- [ ] แก้ `FileUploadButton.tsx` - ปรับ UI
- [ ] เพิ่มไอคอนใหม่
- [ ] เพิ่ม tooltip/label
- [ ] ทดสอบ UI ใหม่

### Phase 6: Video Display
- [ ] สร้าง `VideoMessage.tsx`
- [ ] แก้ `MessageItem.tsx` - เพิ่ม video case
- [ ] ทดสอบแสดงวิดีโอ
- [ ] ทดสอบ video player controls

### Phase 7: Types & Services
- [ ] สร้าง `video.types.ts`
- [ ] แก้ `uploadService.ts` - เพิ่ม video endpoints
- [ ] อัพเดท message types

### Phase 8: Testing
- [ ] Integration testing
- [ ] Bug fixes
- [ ] Performance testing
- [ ] Cross-browser testing

---

## ⚠️ ข้อควรระวัง

### 1. Backward Compatibility
- ✅ UI เดิมต้องใช้งานได้ปกติ
- ✅ ถ้าไม่ลาก/paste ก็ต้องใช้งานแบบเดิมได้
- ✅ Message types เดิมต้องแสดงผลได้

### 2. Performance
- ⚠️ Video processing ใช้ memory เยอะ - ต้องจำกัดขนาดไฟล์
- ⚠️ Thumbnail generation อาจช้า - ต้องมี loading state
- ⚠️ Upload ไฟล์ใหญ่ - ต้องมี progress bar

### 3. Error Handling
- ⚠️ ต้อง handle errors ทุก stage
- ⚠️ แสดง error message ที่เข้าใจง่าย
- ⚠️ Cleanup resources (URL.revokeObjectURL)

### 4. Browser Compatibility
- ⚠️ Video API อาจไม่ทำงานในบาง browsers
- ⚠️ Clipboard API ต้อง HTTPS
- ⚠️ ทดสอบใน Chrome, Firefox, Safari

---

## 📊 Estimated Time

| Phase | Task | Time | Total |
|-------|------|------|-------|
| 1 | Utility Functions | 1-2h | 2h |
| 2 | Upload Hook | 1-2h | 2h |
| 3 | Drag & Drop | 2-3h | 3h |
| 4 | Copy-Paste | 1h | 1h |
| 5 | UI Enhancement | 2-3h | 3h |
| 6 | Video Display | 1-2h | 2h |
| 7 | Types & Services | 1h | 1h |
| 8 | Testing & Fixes | 2-3h | 3h |
| **Total** | | | **17h** |

**แบ่งทำ 3 วัน:**
- วันที่ 1: Phase 1-2 (4h)
- วันที่ 2: Phase 3-5 (7h)
- วันที่ 3: Phase 6-8 (6h)

---

## 🎯 Priority Order

**ถ้าต้องการทำทีละส่วน - แนะนำลำดับนี้:**

1. **Phase 1** - Utility Functions (Foundation)
2. **Phase 2** - Upload Hook (Core functionality)
3. **Phase 6** - Video Display (เห็นผลลัพธ์)
4. **Phase 3** - Drag & Drop (UX improvement)
5. **Phase 4** - Copy-Paste (UX improvement)
6. **Phase 5** - UI Enhancement (Polish)

---

**สร้างโดย:** Claude Code
**วันที่:** 2025-11-27
**Status:** 📋 Planning Phase
