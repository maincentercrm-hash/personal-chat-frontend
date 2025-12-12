// src/services/messageService.ts
import apiService from './apiService';
import { MESSAGE_API, MESSAGE_READ_API, FILE_API } from '@/constants/api/standardApiConstants';
import type {
  TextMessageRequest,
  StickerMessageRequest,
  ImageMessageRequest,
  FileMessageRequest,
  EditMessageRequest,
  ReplyMessageRequest,
  MessageResponse,
  MessageEditHistoryResponse,
  MessageDeleteHistoryResponse,
  MessageDeleteResponse,

} from '@/types/message.types';

import type {
  MarkMessageAsReadResponse,
  GetMessageReadsResponse,
  MarkAllMessagesAsReadResponse,
  GetUnreadCountResponse
} from '@/types/message-read.types';

import type {
  UploadImageResponse,
  UploadFileResponse,
  UploadResult
} from '@/types/upload.types';

/**
 * Service สำหรับจัดการข้อความในการสนทนา
 */
const messageService = {
  /**
   * ส่งข้อความแบบข้อความ
   */
  sendTextMessage: async (conversationId: string, content: string, metadata?: Record<string, unknown>): Promise<MessageResponse> => {
    const data: TextMessageRequest = {
      content,
      metadata
    };
    
    return await apiService.post<MessageResponse>(
      MESSAGE_API.SEND_TEXT_MESSAGE(conversationId),
      data
    );
  },

  /**
   * ส่งข้อความแบบสติกเกอร์
   */
  sendStickerMessage: async (
    conversationId: string,
    stickerId: string,
    stickerSetId: string,
    mediaUrl: string,
    mediaThumbnailUrl?: string,
    metadata?: Record<string, unknown>
  ): Promise<MessageResponse> => {
    const data: StickerMessageRequest = {
      sticker_id: stickerId,
      sticker_set_id: stickerSetId,
      media_url: mediaUrl,
      media_thumbnail_url: mediaThumbnailUrl,
      metadata
    };
    
    return await apiService.post<MessageResponse>(
      MESSAGE_API.SEND_STICKER_MESSAGE(conversationId),
      data
    );
  },

  /**
   * ส่งข้อความแบบรูปภาพ (ต้องมี URL แล้ว)
   */
  sendImageMessage: async (
    conversationId: string,
    mediaUrl: string,
    mediaThumbnailUrl?: string,
    caption?: string,
    metadata?: Record<string, unknown>
  ): Promise<MessageResponse> => {
    const data: ImageMessageRequest = {
      media_url: mediaUrl,
      media_thumbnail_url: mediaThumbnailUrl,
      caption,
      metadata
    };
    
    return await apiService.post<MessageResponse>(
      MESSAGE_API.SEND_IMAGE_MESSAGE(conversationId),
      data
    );
  },

  /**
   * ส่งข้อความแบบไฟล์ (ต้องมี URL แล้ว)
   */
  sendFileMessage: async (
    conversationId: string,
    mediaUrl: string,
    fileName: string,
    fileSize: number,
    fileType: string,
    metadata?: Record<string, unknown>
  ): Promise<MessageResponse> => {
    const data: FileMessageRequest = {
      media_url: mediaUrl,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
      metadata
    };
    
    return await apiService.post<MessageResponse>(
      MESSAGE_API.SEND_FILE_MESSAGE(conversationId),
      data
    );
  },

  /**
   * อัพโหลดรูปภาพเท่านั้น
   */
  uploadImage: async (file: File, folder: string = 'images'): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);
    
    const response = await apiService.post<UploadImageResponse>(
      FILE_API.UPLOAD_IMAGE, // /api/v1/upload/image
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    // Normalize response ให้ตรงกับ interface ที่เราต้องการ
    return {
      url: response.data.URL,
      thumbnail_url: response.data.URL, // ใช้ URL เดียวกันสำหรับ thumbnail
      file_size: response.data.Size,
      file_type: response.data.Format,
      public_id: response.data.PublicID,
      format: response.data.Format
    };
  },

  /**
   * อัพโหลดไฟล์เท่านั้น
   */
  uploadFile: async (file: File, folder: string = 'files'): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    
    const response = await apiService.post<UploadFileResponse>(
      FILE_API.UPLOAD_FILE, // /api/v1/upload/file
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    // Normalize response ให้ตรงกับ interface ที่เราต้องการ
    return {
      url: response.data.URL,
      file_name: file.name, // ใช้ชื่อไฟล์ต้นฉบับ
      file_size: response.data.Size,
      file_type: file.type, // ใช้ MIME type ของไฟล์
      public_id: response.data.PublicID,
      format: response.data.Format
    };
  },

  /**
   * อัพโหลดรูปภาพและส่งข้อความ (แยกเป็น 2 steps)
   */
  uploadAndSendImage: async (
    conversationId: string,
    file: File,
    caption?: string,
    metadata?: Record<string, unknown>
  ): Promise<MessageResponse> => {
    try {
      // Step 1: อัพโหลดรูปภาพก่อน
      const uploadResult = await messageService.uploadImage(file, 'chat-images');
      
      // Step 2: ส่งข้อความด้วย URL ที่ได้จากการอัพโหลด
      return await messageService.sendImageMessage(
        conversationId,
        uploadResult.url,
        uploadResult.thumbnail_url,
        caption,
        {
          ...metadata,
          public_id: uploadResult.public_id,
          format: uploadResult.format,
          file_size: uploadResult.file_size
        }
      );
    } catch (error) {
      console.error('Error in uploadAndSendImage:', error);
      throw error;
    }
  },

  /**
   * อัพโหลดไฟล์และส่งข้อความ (แยกเป็น 2 steps)
   */
  uploadAndSendFile: async (
    conversationId: string,
    file: File,
    metadata?: Record<string, unknown>
  ): Promise<MessageResponse> => {
    try {
      // Step 1: อัพโหลดไฟล์ก่อน
      const uploadResult = await messageService.uploadFile(file, 'chat-files');
      
      // Step 2: ส่งข้อความด้วย URL และข้อมูลไฟล์ที่ได้จากการอัพโหลด
      return await messageService.sendFileMessage(
        conversationId,
        uploadResult.url,
        uploadResult.file_name || file.name,
        uploadResult.file_size,
        uploadResult.file_type,
        {
          ...metadata,
          public_id: uploadResult.public_id,
          format: uploadResult.format
        }
      );
    } catch (error) {
      console.error('Error in uploadAndSendFile:', error);
      throw error;
    }
  },

  /**
   * แก้ไขข้อความ
   */
  editMessage: async (messageId: string, content: string, metadata?: Record<string, unknown>): Promise<MessageResponse> => {
    const data: EditMessageRequest = {
      content,
      metadata
    };

    return await apiService.patch<MessageResponse>(
      MESSAGE_API.EDIT_MESSAGE(messageId),
      data
    );
  },

  /**
   * ลบข้อความ
   */
  deleteMessage: async (messageId: string): Promise<MessageDeleteResponse> => {
    return await apiService.delete<MessageDeleteResponse>(
      MESSAGE_API.DELETE_MESSAGE(messageId)
    );
  },

  /**
   * ดูประวัติการแก้ไขข้อความ
   */
  getMessageEditHistory: async (messageId: string): Promise<MessageEditHistoryResponse> => {
    return await apiService.get<MessageEditHistoryResponse>(
      MESSAGE_API.GET_MESSAGE_EDIT_HISTORY(messageId)
    );
  },

  /**
   * ดูประวัติการลบข้อความ
   */
  getMessageDeleteHistory: async (messageId: string): Promise<MessageDeleteHistoryResponse> => {
    return await apiService.get<MessageDeleteHistoryResponse>(
      MESSAGE_API.GET_MESSAGE_DELETE_HISTORY(messageId)
    );
  },

  /**
   * ตอบกลับข้อความ
   */
  replyToMessage: async (
    messageId: string,
    messageType: 'text' | 'image' | 'file' | 'sticker',
    content?: string,
    mediaUrl?: string,
    mediaThumbnailUrl?: string,
    metadata?: Record<string, unknown>
  ): Promise<MessageResponse> => {
    const data: ReplyMessageRequest = {
      message_type: messageType,
      content,
      media_url: mediaUrl,
      media_thumbnail_url: mediaThumbnailUrl,
      metadata
    };
    
    return await apiService.post<MessageResponse>(
      MESSAGE_API.REPLY_TO_MESSAGE(messageId),
      data
    );
  },

  /**
   * มาร์คข้อความว่าอ่านแล้ว
   */
  markMessageAsRead: async (messageId: string): Promise<MarkMessageAsReadResponse> => {
    return await apiService.post<MarkMessageAsReadResponse>(
      MESSAGE_READ_API.MARK_MESSAGE_AS_READ(messageId)
    );
  },

  /**
   * ดูรายชื่อผู้ที่อ่านข้อความแล้ว
   */
  getMessageReads: async (messageId: string): Promise<GetMessageReadsResponse> => {
    return await apiService.get<GetMessageReadsResponse>(
      MESSAGE_READ_API.GET_MESSAGE_READS(messageId)
    );
  },

  /**
   * มาร์คข้อความทั้งหมดในการสนทนาว่าอ่านแล้ว
   */
  markAllMessagesAsRead: async (conversationId: string): Promise<MarkAllMessagesAsReadResponse> => {
    return await apiService.post<MarkAllMessagesAsReadResponse>(
      MESSAGE_READ_API.MARK_ALL_MESSAGES_AS_READ(conversationId)
    );
  },

  /**
   * ดูจำนวนข้อความที่ยังไม่ได้อ่านในการสนทนา
   */
  getUnreadCount: async (conversationId: string): Promise<GetUnreadCountResponse> => {
    return await apiService.get<GetUnreadCountResponse>(
      MESSAGE_READ_API.GET_UNREAD_COUNT(conversationId)
    );
  }
};

export default messageService;