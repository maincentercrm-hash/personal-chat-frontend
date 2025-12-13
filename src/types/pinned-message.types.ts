// src/types/pinned-message.types.ts
import type { MessageDTO } from './message.types';

// Pin types
export type PinType = 'personal' | 'public';

// Request types
export interface PinMessageRequest {
  pin_type: PinType;
}

export interface UnpinMessageRequest {
  pin_type: PinType;
}

export interface GetPinnedMessagesRequest {
  pin_type?: PinType | 'all';
  limit?: number;
  offset?: number;
}

// Response types
export interface PinnedByInfo {
  id: string;
  username: string;
  display_name: string;
  profile_image_url?: string | null;
}

export interface PinnedMessageDTO {
  id: string;
  message_id: string;
  conversation_id: string;
  user_id: string;
  pin_type: PinType;
  pinned_at: string; // ISO string
  pinned_by?: PinnedByInfo;
  message?: MessageDTO;
}

export interface PinnedMessagesListDTO {
  conversation_id: string;
  total: number;
  pinned_messages: PinnedMessageDTO[];
}

export interface PinMessageResponse {
  success: boolean;
  message: string;
  data: PinnedMessageDTO;
}

export interface UnpinMessageResponse {
  success: boolean;
  message: string;
}

export interface GetPinnedMessagesResponse {
  success: boolean;
  message: string;
  data: PinnedMessagesListDTO;
}
