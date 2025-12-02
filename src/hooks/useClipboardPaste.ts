// src/hooks/useClipboardPaste.ts
import { useCallback } from 'react';

interface UseClipboardPasteOptions {
  onFilesDetected: (files: File[]) => void;
  onError?: (error: Error) => void;
  maxFileSize?: number; // bytes
  allowedTypes?: string[]; // MIME types
}

/**
 * Hook สำหรับจัดการ Clipboard Paste
 * รองรับ:
 * - Copy image from browser → Paste
 * - Screenshot (Win+Shift+S) → Paste
 * - รักษา text paste ไว้ (ไม่ block)
 */
export function useClipboardPaste({
  onFilesDetected,
  onError,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
}: UseClipboardPasteOptions) {

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;

    const files: File[] = [];
    let hasImage = false;

    console.log('[ClipboardPaste] Processing clipboard items:', clipboardItems.length);

    // Loop through clipboard items
    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];

      // ตรวจสอบว่าเป็นไฟล์รูปภาพหรือไม่
      if (item.type.startsWith('image/')) {
        hasImage = true;
        const file = item.getAsFile();

        if (file) {
          console.log('[ClipboardPaste] Image detected:', {
            name: file.name,
            type: file.type,
            size: `${(file.size / 1024).toFixed(2)} KB`
          });

          // Validate file type
          if (!allowedTypes.includes(file.type)) {
            const error = new Error(`ไฟล์ประเภท ${file.type} ไม่รองรับ`);
            console.error('[ClipboardPaste] Invalid file type:', file.type);
            onError?.(error);
            continue;
          }

          // Validate file size
          if (file.size > maxFileSize) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            const maxMB = (maxFileSize / 1024 / 1024).toFixed(0);
            const error = new Error(`ไฟล์ใหญ่เกินไป: ${sizeMB}MB (สูงสุด ${maxMB}MB)`);
            console.error('[ClipboardPaste] File too large:', sizeMB, 'MB');
            onError?.(error);
            continue;
          }

          // ✅ Generate proper filename for screenshots/clipboard images
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          const extension = file.type.split('/')[1] || 'png';

          // ตรวจจับว่าเป็น screenshot หรือไม่
          const isScreenshot = file.name === 'image.png' || file.name === 'screenshot.png' || file.name === 'blob';

          const fileName = isScreenshot
            ? `Screenshot-${timestamp}.${extension}`
            : file.name;

          const renamedFile = new File([file], fileName, { type: file.type });

          console.log('[ClipboardPaste] File processed:', {
            originalName: file.name,
            newName: fileName,
            isScreenshot
          });

          files.push(renamedFile);
        }
      }
    }

    // ✅ ถ้ามีรูป → ป้องกันการ paste ข้อความ และส่งไฟล์ไป
    if (hasImage && files.length > 0) {
      console.log('[ClipboardPaste] ✅ Preventing default paste, sending files:', files.length);
      e.preventDefault();
      onFilesDetected(files);
    } else {
      console.log('[ClipboardPaste] ℹ️ No images found, allowing normal text paste');
    }

    // ✅ ถ้าไม่มีรูป → ปล่อยให้ paste ข้อความปกติ (ไม่ preventDefault)
  }, [onFilesDetected, onError, maxFileSize, allowedTypes]);

  return { handlePaste };
}
