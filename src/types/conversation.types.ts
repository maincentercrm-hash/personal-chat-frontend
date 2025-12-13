// Frontend TypeScript types for Conversation

import type { ReplyInfoDTO } from "./message.types";

// ============ Request Types ============

export interface UpdateConversationRequest {
    title?: string;
    icon_url?: string;
  }
  
  export interface CreateDirectConversationRequest {
    type: 'direct';
    member_ids: string[]; // เปลี่ยนจาก member_id เป็น member_ids เป็น array
  }
  
  export interface CreateGroupConversationRequest {
    type: 'group';
    title: string;
    icon_url?: string;
    member_ids?: string[];
  }

  export interface ConversationQueryRequest {
    limit?: number;
    offset?: number;
    before_time?: string;
    after_time?: string;
    before_id?: string;
    after_id?: string;
    type?: 'direct' | 'group';
    pinned?: boolean;
    format?: 'legacy' | 'old' | 'new';
  }
  
  export interface ConversationMessagesQueryRequest {
    limit?: number;
    offset?: number;
    before?: string;
    after?: string;
    target?: string;
    before_count?: number;
    after_count?: number;
  }
  
  export interface ConversationPinRequest {
    is_pinned: boolean;
  }
  
  export interface ConversationMuteRequest {
    is_muted: boolean;
  }
  
  // ============ Response Types ============
  
  export interface ConversationDTO {
    id: string;
    type: string;
    title?: string;
    icon_url?: string;
    created_at: string; // ISO string
    updated_at: string; // ISO string
    last_message_text?: string;
    last_message_at?: string | null; // ISO string
    creator_id?: string | null;
    is_active: boolean;
    metadata?: Record<string, unknown>;
    member_count: number;
    unread_count: number;

    // ✅ Mention notification fields (Phase 2)
    has_unread_mention?: boolean;       // มี unread mentions หรือไม่
    unread_mention_count?: number;      // จำนวน unread mentions
    last_message_has_mention?: boolean; // ข้อความล่าสุดมี mention หรือไม่

    is_pinned: boolean;
    is_muted: boolean;
    contact_info?: ContactInfoData;
  }

  export interface ContactInfoData {
    user_id: string;
    username: string;
    display_name: string;
    profile_image_url?: string | null;
  }
  
  export interface ConversationCreateResponse {
    success: boolean;
    message: string;
    conversation: ConversationDTO;
  }
  
  export interface ConversationUpdateResponse {
    success: boolean;
    message: string;
  }
  
  export interface ConversationPinResponse {
    success: boolean;
    message: string;
    data: {
      is_pinned: boolean;
    };
  }
  
  export interface ConversationMuteResponse {
    success: boolean;
    message: string;
    data: {
      is_muted: boolean;
    };
  }
  
  export interface ConversationListData {
    conversations: ConversationDTO[];
    has_more?: boolean;
    pagination: PaginationData;
  }
  
  export interface ConversationListResponse {
    success: boolean;
    message: string;
    data: ConversationListData;
  }
  
  export interface LegacyConversationListResponse {
    success: boolean;
    message: string;
    conversations: ConversationDTO[];
    pagination: PaginationData;
  }

  export interface MessageReadDTO {
    message_id: string;
    user_id: string;
    conversation_id: string;
    read_at: string;
    read_count: number; // ✅ Added: backend now sends read_count in message.read event
  }

  export interface MessageReadAllDTO {
    conversation_id: string;
    user_id: string;
    read_at: string;
    marked_count: number;
  }
  export interface MessageDTO {
    id: string;
    conversation_id: string;
    sender_id?: string | null;
    sender_type: string;
    sender_name?: string;
    sender_avatar?: string;
    message_type: string;
    content: string;
    media_url?: string;
    media_thumbnail_url?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    sticker_id?: string | null;
    sticker_set_id?: string | null;
    metadata?: Record<string, unknown>;
    created_at: string; // ISO string
    updated_at: string; // ISO string
    is_deleted: boolean;
    is_edited: boolean;
    edit_count: number;
    deleted_by?: string | null;
    deleted_at?: string | null; // ISO string
    is_read: boolean;
    read_count: number;
    read_by_ids?: string[];
    delivered_to_ids?: string[];
    reply_to_id?: string | null;
    reply_to_message?: ReplyInfoDTO | null;
    sender_info?: UserBasicDTO | null;
    temp_id?: string;
    localKey?: string; // Stable key for React/Virtuoso - never changes
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

    // Pin status
    is_pinned?: boolean;
    pinned_at?: string | null; // ISO string
    pinned_by?: string | null;
  }
  
  export interface UserBasicDTO {
    id: string;
    username: string;
    display_name: string;
    profile_image_url?: string;
  }
  
 
  
  
  
  export interface MessageContextData {
    messages: MessageDTO[];
    target_id: string;
    has_more_before: boolean;
    has_more_after: boolean;
  }

  export interface MessagesListData {
    messages: MessageDTO[];
    has_more: boolean;
    total: number;
  }
  
  export interface ConversationMessagesResponse {
    success: boolean;
    message: string;
    data: MessagesListData;
  }
  
  export interface MessageContextResponse {
    success: boolean;
    message: string;
    data: MessageContextData;
  }

  export interface PaginationData {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }


  /** add on */

  // สร้าง type ใหม่สำหรับ UI
export type ConversationType = 'direct' | 'group';

// สร้าง interface สำหรับ Conversation ที่ใช้ใน UI
export interface ConversationUI {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  type: ConversationType;
  avatar?: string;
}