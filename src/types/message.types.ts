// Frontend TypeScript types for Message

// ============ Request Types ============

export interface TextMessageRequest {
    content: string;
    metadata?: Record<string, unknown>;
  }
  
  export interface StickerMessageRequest {
    sticker_id: string;
    sticker_set_id: string;
    media_url: string;
    media_thumbnail_url?: string;
    metadata?: Record<string, unknown>;
  }
  
  export interface ImageMessageRequest {
    media_url: string;
    media_thumbnail_url?: string;
    caption?: string;
    metadata?: Record<string, unknown>;
  }
  
  export interface FileMessageRequest {
    media_url: string;
    file_name: string;
    file_size: number;
    file_type: string;
    metadata?: Record<string, unknown>;
  }
  
  export interface EditMessageRequest {
    content: string;
  }
  
  export interface ReplyMessageRequest {
    message_type: 'text' | 'image' | 'file' | 'sticker';
    content?: string;
    media_url?: string;
    media_thumbnail_url?: string;
    metadata?: Record<string, unknown>;
  }
  
  export interface BusinessTextMessageRequest {
    content: string;
    metadata?: Record<string, unknown>;
    reply_to_id?: string | null;
  }
  
  export interface BusinessStickerMessageRequest {
    sticker_id: string;
    sticker_set_id: string;
    media_url: string;
    media_thumbnail_url?: string;
    metadata?: Record<string, unknown>;
    reply_to_id?: string | null;
  }
  
  export interface BusinessImageMessageRequest {
    media_url: string;
    media_thumbnail_url?: string;
    caption?: string;
    metadata?: Record<string, unknown>;
    reply_to_id?: string | null;
  }
  
  export interface BusinessFileMessageRequest {
    media_url: string;
    file_name: string;
    file_size: number;
    file_type: string;
    metadata?: Record<string, unknown>;
    reply_to_id?: string | null;
  }
  
  // ============ Response Types ============
  
  export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

  // ✅ NEW: Album file structure for new Backend API
  export interface AlbumFileDTO {
    id: string;
    file_type: 'image' | 'video' | 'file'; // ✅ เพิ่ม 'file' ตาม Backend
    media_url: string;
    media_thumbnail_url?: string;
    position: number;

    // สำหรับ file type
    file_name?: string;
    file_size?: number;
    file_type_ext?: string; // เช่น "pdf", "docx"

    // สำหรับ video
    duration?: number; // seconds

    // สำหรับ image/video
    width?: number;
    height?: number;
  }

  export interface MessageMetadata {
    file_name?: string;
    file_size?: number;
    file_type?: string;
    format?: string;
    public_id?: string;
    sender_id?: string;
    tempId?: string;

    // เพิ่มฟิลด์ใหม่สำหรับธุรกิจ
    admin_id?: string;
    admin_display_name?: string;
    admin_role?: string;
    business_id?: string;
    reply_to_id?: string;
    sticker_id?: string;
    sticker_set_id?: string;

    // ⚠️ OLD FORMAT: Will be deprecated after Backend migration
    album_id?: string;
    album_position?: number;
    album_total?: number;

    // ✅ NEW: Mentions support
    mentions?: Array<{
      user_id: string;
      username: string;
      start_index: number;
      length: number;
    }>;

    [key: string]: unknown; // รองรับ metadata อื่นๆ
  }

  export interface ForwardedFromDTO {
    message_id: string;
    sender_id: string;
    sender_name?: string;
    conversation_id: string;
    original_timestamp: string;
  }

  export interface MessageDTO {
    id: string;
    conversation_id: string;
    sender_id?: string | null;
    sender_type: string; // user, business, system
    sender_name?: string;
    sender_avatar?: string;
    message_type: string; // text, image, file, sticker, album
    content: string;
    media_url?: string;
    media_thumbnail_url?: string;

    // Additional data for files
    file_name?: string;
    file_size?: number;
    file_type?: string;
    file_url?: string;

    // Additional data for stickers
    sticker_id?: string | null;
    sticker_set_id?: string | null;
    sticker_url?: string;

    // ✅ NEW: Album files for new Backend API format
    album_files?: AlbumFileDTO[];

    // ✅ NEW: Forwarded message metadata
    is_forwarded?: boolean;
    forwarded_from?: ForwardedFromDTO;

    // Core data
    metadata?: MessageMetadata;
    created_at: string; // ISO string
    updated_at: string; // ISO string

    // Message status
    is_deleted: boolean;
    is_edited: boolean;
    edit_count: number;
    deleted_by?: string | null;
    deleted_at?: string | null; // ISO string

    // Read status
    is_read: boolean;
    read_count: number;
    read_by_ids?: string[];
    delivered_to_ids?: string[];

    // Reply info
    reply_to_id?: string | null;
    reply_to_message?: ReplyInfoDTO | null;

    // Business info
    business_id?: string | null;
    admin_id?: string | null;

    // Additional context
    sender_info?: UserBasicDTO | null;
    business_info?: BusinessBasicDTO | null;
    admin_info?: UserBasicDTO | null;

    temp_id?: string;
    status?: MessageStatus;

  }
  
  export interface UserBasicDTO {
    id: string;
    username: string;
    display_name: string;
    profile_image_url?: string;
  }
  
  export interface BusinessBasicDTO {
    id: string;
    name: string;
    display_name: string;
    logo_url?: string;
  }

  
  export interface MessageEditHistoryDTO {
    id: string;
    message_id: string;
    content: string;
    edited_by: string;
    editor_info?: UserBasicDTO | null;
    edited_at: string; // ISO string
  }
  
  export interface MessageDeleteHistoryDTO {
    id: string;
    message_id: string;
    deleted_by: string;
    deleter_info?: UserBasicDTO | null;
    deleted_at: string; // ISO string
    reason?: string;
  }
  
  export interface MessageEditHistoryListDTO {
    message_id: string;
    history: MessageEditHistoryDTO[];
  }
  
  export interface MessageDeleteHistoryListDTO {
    message_id: string;
    history: MessageDeleteHistoryDTO[];
  }
  
  export interface MessageResponse {
    success: boolean;
    message: string;
    data: MessageDTO;
  }
  
  export interface MessageEditHistoryResponse {
    success: boolean;
    message: string;
    data: MessageEditHistoryListDTO;
  }
  
  export interface MessageDeleteHistoryResponse {
    success: boolean;
    message: string;
    data: MessageDeleteHistoryListDTO;
  }
  
  export interface MessageDeleteResponse {
    success: boolean;
    message: string;
  }
  
  export interface ReplyInfoDTO {
    id: string;
    message_type: string;
    content: string;
    sender_id?: string | null;
    sender_name?: string;
  }