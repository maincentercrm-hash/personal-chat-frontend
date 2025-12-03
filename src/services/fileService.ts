// src/services/fileService.ts
import apiService from './apiService';
import { FILE_API, MESSAGE_API } from '@/constants/api/standardApiConstants';
import type {
  PrepareUploadRequest,
  PrepareUploadResponse,
  ConfirmUploadRequest,
  ConfirmUploadResponse,
  SingleFileUploadResult,
  FileCategory,
  BulkMessageRequest,
  BulkMessageResponse,
} from '@/types/file.types';

/**
 * Service สำหรับจัดการ File Upload ด้วย Direct Upload to R2
 */
const fileService = {
  /**
   * ขอ Presigned URL สำหรับอัปโหลดไฟล์
   */
  prepareUpload: async (
    filename: string,
    contentType: string,
    size: number,
    folder: string = 'photos'
  ): Promise<PrepareUploadResponse['data']> => {
    const request: PrepareUploadRequest = {
      filename,
      content_type: contentType,
      size,
      folder,
    };

    const response = await apiService.post<PrepareUploadResponse>(
      FILE_API.PREPARE_UPLOAD,
      request
    );

    return response.data;
  },

  /**
   * Upload ไฟล์ตรงไปที่ R2 ด้วย Presigned URL
   */
  uploadToR2: async (file: File, uploadUrl: string, contentType: string): Promise<void> => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`R2 upload failed: ${response.statusText}`);
    }
  },

  /**
   * ยืนยันว่า Upload สำเร็จ
   */
  confirmUpload: async (uploadId: string): Promise<ConfirmUploadResponse['data']> => {
    const request: ConfirmUploadRequest = {
      upload_id: uploadId,
    };

    const response = await apiService.post<ConfirmUploadResponse>(
      FILE_API.CONFIRM_UPLOAD,
      request
    );

    return response.data;
  },

  /**
   * Upload ผ่าน Backend (Legacy method - ใช้เมื่อ Direct Upload มีปัญหา CORS)
   * @param file - ไฟล์ที่จะอัปโหลด
   * @param folder - ชื่อโฟลเดอร์
   * @returns ผลลัพธ์การอัปโหลด
   */
  uploadViaBackend: async (
    file: File,
    folder: string = 'photos'
  ): Promise<SingleFileUploadResult> => {
    const formData = new FormData();
    const isImage = file.type.startsWith('image/');

    if (isImage) {
      formData.append('image', file);
    } else {
      formData.append('file', file);
    }
    formData.append('folder', folder);

    const endpoint = isImage ? FILE_API.UPLOAD_IMAGE : FILE_API.UPLOAD_FILE;

    console.log('[fileService] Uploading via backend:', {
      file: file.name,
      type: file.type,
      isImage,
      endpoint,
    });

    const response = await apiService.post<any>(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('[fileService] Backend upload response:', response);

    // Parse response - Backend อาจ return format ต่างกัน
    // ตรวจสอบทั้ง response.data และ response.data.data
    const data = response.data?.data || response.data;

    const url = data.url || data.URL || data.media_url;
    const thumbnailUrl = data.thumbnail_url || data.URL || data.url;

    if (!url) {
      console.error('[fileService] No URL in response:', response);
      throw new Error('Upload failed: No URL in response');
    }

    return {
      url: url,
      thumbnail_url: thumbnailUrl,
      path: data.path || data.Path || '',
      size: data.size || data.Size || file.size,
      upload_id: 'legacy',
    };
  },

  /**
   * อัปโหลดไฟล์เดียวด้วย Direct Upload (พร้อม fallback)
   * @param file - ไฟล์ที่จะอัปโหลด
   * @param folder - ชื่อโฟลเดอร์ใน R2
   * @param useDirectUpload - ใช้ Direct Upload หรือไม่ (default: false เพราะ CORS issue)
   * @returns ผลลัพธ์การอัปโหลด
   */
  uploadSingleFile: async (
    file: File,
    folder: string = 'photos',
    useDirectUpload: boolean = false
  ): Promise<SingleFileUploadResult> => {
    // ⚠️ ชั่วคราวใช้ upload ผ่าน backend เนื่องจาก R2 CORS ยังไม่ได้ตั้งค่า
    if (!useDirectUpload) {
      return fileService.uploadViaBackend(file, folder);
    }

    // Direct Upload to R2 (เมื่อ CORS ได้รับการแก้ไขแล้ว)
    try {
      // 1. เตรียม upload (ขอ presigned URL)
      const prepared = await fileService.prepareUpload(
        file.name,
        file.type,
        file.size,
        folder
      );

      // 2. Upload ตรงไปที่ R2
      await fileService.uploadToR2(file, prepared.upload_url, file.type);

      // 3. ยืนยันว่า upload สำเร็จ
      await fileService.confirmUpload(prepared.upload_id);

      // 4. Return ผลลัพธ์
      return {
        url: prepared.public_url,
        path: prepared.path,
        size: file.size,
        upload_id: prepared.upload_id,
      };
    } catch (error) {
      // Fallback to backend upload if Direct Upload fails
      console.warn('[fileService] Direct Upload failed, falling back to backend upload:', error);
      return fileService.uploadViaBackend(file, folder);
    }
  },

  /**
   * อัปโหลดหลายไฟล์แบบ Parallel
   * @param files - ไฟล์ทั้งหมดที่จะอัปโหลด
   * @param folder - ชื่อโฟลเดอร์ใน R2
   * @param onProgress - callback สำหรับติดตามความคืบหน้า
   * @returns ผลลัพธ์การอัปโหลดทั้งหมด
   */
  uploadMultipleFiles: async (
    files: File[],
    folder: string = 'photos',
    onProgress?: (uploaded: number, total: number) => void
  ): Promise<SingleFileUploadResult[]> => {
    let uploadedCount = 0;

    // Upload แบบ parallel
    const uploadPromises = files.map(async (file) => {
      const result = await fileService.uploadSingleFile(file, folder);
      uploadedCount++;
      onProgress?.(uploadedCount, files.length);
      return result;
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    return uploadedFiles;
  },

  /**
   * ส่ง Bulk Messages API
   * @param conversationId - ID ของ conversation
   * @param messages - ข้อมูล messages ที่จะส่ง
   * @param caption - ข้อความแนบ (optional)
   * @returns Response จาก API
   */
  sendBulkMessages: async (
    conversationId: string,
    messages: BulkMessageRequest['messages'],
    caption?: string
  ): Promise<BulkMessageResponse> => {
    const request: BulkMessageRequest = {
      caption: caption || undefined, // ให้เป็น undefined ถ้าไม่มี caption
      messages,
    };

    // Debug: Log request ก่อนส่ง
    console.log('[fileService] Sending bulk messages:', {
      conversationId,
      request,
      messagesCount: messages.length,
    });

    try {
      const response = await apiService.post<BulkMessageResponse>(
        MESSAGE_API.SEND_BULK_MESSAGES(conversationId),
        request
      );

      console.log('[fileService] Bulk messages response:', response);
      return response;
    } catch (error: any) {
      console.error('[fileService] Bulk messages error:', {
        error,
        status: error.response?.status,
        data: error.response?.data,
        request: request,
      });
      throw error;
    }
  },

  /**
   * Helper: ตรวจสอบประเภทของไฟล์
   */
  getFileCategory: (file: File): FileCategory => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'file';
  },

  /**
   * Helper: Validate ขนาดไฟล์
   */
  validateFileSize: (file: File, maxSizeMB: number = 1024): boolean => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
  },

  /**
   * Helper: Validate หลายไฟล์
   */
  validateFiles: (files: File[]): { valid: boolean; error?: string } => {
    if (files.length === 0) {
      return { valid: false, error: 'กรุณาเลือกไฟล์' };
    }

    if (files.length > 10) {
      return { valid: false, error: 'สามารถเลือกได้สูงสุด 10 ไฟล์' };
    }

    for (const file of files) {
      if (!fileService.validateFileSize(file, 1024)) {
        return { valid: false, error: `ไฟล์ ${file.name} มีขนาดใหญ่เกิน 1GB` };
      }
    }

    return { valid: true };
  },
};

export default fileService;
