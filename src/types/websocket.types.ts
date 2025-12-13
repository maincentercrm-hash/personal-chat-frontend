// src/types/websocket.types.ts

import type { ConversationDTO, MessageDTO, MessageReadAllDTO, MessageReadDTO } from "./conversation.types";
import type { FriendAcceptNotification, FriendRequestNotification, PendingRequestItem, WebSocketEnvelope } from "./user-friendship.types";
import type { PinnedMessageDTO } from "./pinned-message.types";


export interface ReconnectingData {
  attempt: number;
  delay: number;
}

// เพิ่ม interface สำหรับข้อมูลสถานะผู้ใช้
export interface UserStatusData {
  user_id: string;
  online: boolean;
  timestamp: string;
}

// เพิ่ม interface สำหรับคำขอ subscribe/unsubscribe
export interface UserStatusSubscriptionRequest {
  user_id: string;
}

// TagUpdateData removed - business feature


// Interface สำหรับข้อมูลการลบข้อความ
export interface MessageDeletedData {
  message_id: string;
  deleted_at: string;
}

// Interface สำหรับข้อมูลการแก้ไขข้อความ (message.updated)
export interface MessageEditedData {
  message_id: string;
  conversation_id: string;
  new_content: string;
  edited_at: string;
}

// Interface สำหรับข้อมูลการบล็อกผู้ใช้
export interface UserBlockedData {
  blocker_id: string;
  blocked_user_id: string;
  blocked_at: string;
}

export interface UserBlockedByData {
  blocker_id: string;
  blocked_user_id: string;
  blocked_at: string;
}

export interface UserUnblockedData {
  unblocker_id: string;
  unblocked_user_id: string;
  unblocked_at: string;
}

export interface UserUnblockedByData {
  unblocker_id: string;
  unblocked_user_id: string;
  unblocked_at: string;
}

// Interface สำหรับข้อมูลสมาชิกในกลุ่ม
export interface ConversationUserAddedData {
  conversation_id: string;
  user_id: string;
  added_by: string;
  added_at: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    profile_image_url: string | null;
  };
}

export interface ConversationUserRemovedData {
  conversation_id: string;
  user_id?: string; // Optional - Backend อาจไม่ส่ง (ส่งแค่ให้คนที่ถูก remove)
  removed_by?: string; // Optional - Backend อาจไม่ส่ง
  removed_at: string;
}

// Interface สำหรับข้อมูลการอัปเดตการสนทนา (group name, icon, last message, mention data)
export interface ConversationUpdateData {
  conversation_id: string;
  title?: string;
  icon_url?: string;

  // ✅ Phase 2: Last message updates
  last_message_text?: string;
  last_message_at?: string;

  // ✅ Phase 2: Mention notification fields
  has_unread_mention?: boolean;
  unread_mention_count?: number;
  last_message_has_mention?: boolean;
}

// นิยาม Event Type Map
export interface WebSocketEventMap {
  // ส่วนที่มีอยู่เดิม
  'message:message.receive': WebSocketEnvelope<MessageDTO>;
  'message:message.updated': WebSocketEnvelope<MessageEditedData>; // ✅ อัปเดต: ใช้ MessageEditedData แทน MessageDTO
  'message:message.read': WebSocketEnvelope<MessageReadDTO>;
  'message:message.read_all': WebSocketEnvelope<MessageReadAllDTO>;
  'message:message.delete': WebSocketEnvelope<MessageDeletedData>;
  'message:message.pinned': WebSocketEnvelope<PinnedMessageDTO>;
  'message:message.unpinned': WebSocketEnvelope<{ message_id: string; conversation_id: string; unpinned_by: string; unpinned_at: string }>;

  'message:conversation.create': WebSocketEnvelope<ConversationDTO>;
  'message:conversation.update': WebSocketEnvelope<ConversationUpdateData>; // ใหม่: อัปเดตชื่อและไอคอนกลุ่ม
  'message:conversation.updated': WebSocketEnvelope<ConversationDTO>;
  'message:conversation.deleted': WebSocketEnvelope<ConversationDTO>;
  'message:conversation.join': WebSocketEnvelope<ConversationDTO>;

  // ✅ Updated to match backend event names
  'message:friend_request.received': WebSocketEnvelope<FriendRequestNotification>;
  'message:friend_request.accepted': WebSocketEnvelope<FriendAcceptNotification>;
  'message:friend_request.rejected': PendingRequestItem;
  'message:friend.removed': PendingRequestItem;

  'message:user.blocked': WebSocketEnvelope<UserBlockedData>;
  'message:user.blocked_by': WebSocketEnvelope<UserBlockedByData>;
  'message:user.unblocked': WebSocketEnvelope<UserUnblockedData>;
  'message:user.unblocked_by': WebSocketEnvelope<UserUnblockedByData>;

  'message:conversation.user_added': WebSocketEnvelope<ConversationUserAddedData>;
  'message:conversation.user_removed': WebSocketEnvelope<ConversationUserRemovedData>;

  // Business profile events removed


  // ปรับปรุง interface สำหรับสถานะผู้ใช้
  'message:user.online': WebSocketEnvelope<UserStatusData>;
  'message:user.offline': WebSocketEnvelope<UserStatusData>;
  'message:user.status': WebSocketEnvelope<UserStatusData>;

  // เพิ่ม event types สำหรับการ subscribe/unsubscribe
  'message:user.status.subscribe': WebSocketEnvelope<UserStatusSubscriptionRequest>;
  'message:user.status.unsubscribe': WebSocketEnvelope<UserStatusSubscriptionRequest>;
  'message:user.status.subscribed': WebSocketEnvelope<UserStatusData>; // การตอบกลับเมื่อ subscribe สำเร็จ

  // 🆕 Backend v2 events
  'user_status': WebSocketEnvelope<{
    user_id: string;
    status: 'online' | 'offline' | 'away' | 'busy';
    last_seen?: string;
    timestamp?: string;
  }>;

  // 🆕 Mention notification event
  'message:notification': {
    type: 'notification';
    data: {
      type: 'mention';
      message_id: string;
      conversation_id: string;
      sender_id: string;
      sender_name: string;
      message_preview: string;
    };
  };

  // 🆕 Typing indicator events (with message: prefix to match WebSocketConnection emission)
  'message:message.typing': WebSocketEnvelope<{
    conversation_id: string;
    user_id: string;
    username?: string;
    display_name?: string;
    is_typing: boolean;
  }>;
  'message:user_typing': WebSocketEnvelope<{
    conversation_id: string;
    user_id: string;
    username?: string;
    display_name?: string;
    is_typing: boolean;
  }>;
  'message:typing_start': WebSocketEnvelope<{
    conversation_id: string;
    user_id: string;
    username?: string;
    display_name?: string;
  }>;
  'message:typing_stop': WebSocketEnvelope<{
    conversation_id: string;
    user_id: string;
    username?: string;
    display_name?: string;
  }>;

  // 🆕 Note events
  'message:note.create': WebSocketEnvelope<{
    note_id: string;
    user_id: string;
    conversation_id?: string;
  }>;
  'message:note.update': WebSocketEnvelope<{
    note_id: string;
    user_id: string;
    conversation_id?: string;
  }>;
  'message:note.delete': WebSocketEnvelope<{
    note_id: string;
    user_id: string;
    conversation_id?: string;
  }>;

  // สำหรับ events ภายในของ WebSocket connection
  'ws:open': Event;
  'ws:close': CloseEvent;
  'ws:error': Event;
  'ws:reconnecting': ReconnectingData;
  'ws:reconnect_failed': void;
  'ws:pong': { timestamp: number };
  'ws:message': unknown; // สำหรับ raw message events
}