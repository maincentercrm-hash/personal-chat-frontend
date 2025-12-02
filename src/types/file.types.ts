// Frontend TypeScript types for File Upload

// ============ Request Types ============

export interface FileUploadRequest {
    folder?: string;
    // file will be handled by FormData
  }
  
  // ============ Response Types ============
  
  export interface FileUploadDTO {
    id: string;
    file_name: string;
    file_size: number;
    file_type: string;
    mime_type: string;
    url: string;
    path: string;
    folder: string;
    storage_type: string;
    uploaded_at: string; // ISO string
    expires_at?: string | null; // ISO string
    metadata?: Record<string, unknown>;
    
    // For images specifically
    width?: number | null;
    height?: number | null;
    thumbnail_url?: string | null;
  }
  
  export interface FileUploadResponse {
    success: boolean;
    message: string;
    data: FileUploadDTO;
  }
  
  export interface FileError {
    code: string;
    message: string;
    detail?: string;
  }
  
  export interface FileErrorResponse {
    success: boolean;
    message: string;
    error: FileError;
  }
  
  export interface FilesListDTO {
    files: FileUploadDTO[];
    total: number;
    limit: number;
    offset: number;
  }
  
  export interface FilesListResponse {
    success: boolean;
    message: string;
    data: FilesListDTO;
  }

// ============ Direct Upload to R2 (Presigned URL) ============

/**
 * Request สำหรับการขอ Presigned URL
 */
export interface PrepareUploadRequest {
  filename: string;
  content_type: string;
  size: number;
  folder?: string;
}

/**
 * Response จาก prepare-upload API
 */
export interface PrepareUploadResponse {
  success: boolean;
  message: string;
  data: {
    upload_id: string;
    upload_url: string;
    method: string;
    path: string;
    public_url: string;
    expires_at: string;
    headers: {
      'Content-Type': string;
    };
  };
}

/**
 * Request สำหรับการยืนยันว่า Upload สำเร็จ
 */
export interface ConfirmUploadRequest {
  upload_id: string;
}

/**
 * Response จาก confirm-upload API
 */
export interface ConfirmUploadResponse {
  success: boolean;
  message: string;
  data: {
    url: string;
    path: string;
    size: number;
  };
}

/**
 * ผลลัพธ์จากการอัปโหลดไฟล์เดียว
 */
export interface SingleFileUploadResult {
  url: string;
  thumbnail_url?: string;
  path: string;
  size: number;
  upload_id: string;
}

/**
 * ประเภทของไฟล์
 */
export type FileCategory = 'image' | 'video' | 'file';

/**
 * ข้อมูลไฟล์ที่จะส่งใน Bulk Message
 */
export interface BulkMessageFileItem {
  message_type: 'image' | 'video' | 'file';
  media_url: string;
  media_thumbnail_url?: string;
  caption?: string;
  file_name?: string; // ✅ เพิ่ม - ชื่อไฟล์ต้นฉบับ
  file_size?: number; // ✅ เพิ่ม - ขนาดไฟล์ (bytes)
}

/**
 * Request สำหรับ Bulk Messages API
 */
export interface BulkMessageRequest {
  caption?: string;
  messages: BulkMessageFileItem[];
}

/**
 * Response จาก Bulk Messages API
 * ✅ NEW FORMAT: Backend ส่งกลับ 1 message ที่มี type "album"
 */
export interface BulkMessageResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    conversation_id: string;
    sender_id?: string;
    sender_type: string;
    message_type: 'album'; // ✅ ต้องเป็น "album"
    content?: string;
    album_files: Array<{
      id: string;
      file_type: 'image' | 'video' | 'file';
      media_url: string;
      media_thumbnail_url?: string;
      position: number;
      file_name?: string;
      file_size?: number;
      file_type_ext?: string;
      duration?: number;
      width?: number;
      height?: number;
    }>;
    metadata?: {
      album_total?: number;
      [key: string]: unknown;
    };
    status: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    is_edited: boolean;
    edit_count: number;
    is_pinned?: boolean;
    is_forwarded?: boolean;
  };
}

/**
 * Progress สำหรับการอัปโหลดหลายไฟล์
 */
export interface BulkUploadProgress {
  stage: 'validating' | 'uploading' | 'creating_messages' | 'completed' | 'error';
  filesUploaded: number;
  totalFiles: number;
  currentFile?: string;
  overallProgress: number; // 0-100
  errorMessage?: string;
}