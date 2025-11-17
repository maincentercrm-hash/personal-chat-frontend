// src/types/websocket.types.ts

import type { ConversationDTO, MessageDTO, MessageReadAllDTO, MessageReadDTO } from "./conversation.types";
import type { FriendAcceptNotification, FriendRequestNotification, PendingRequestItem, WebSocketEnvelope } from "./user-friendship.types";


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

// Interface สำหรับข้อมูลการบล็อกผู้ใช้
export interface UserBlockedData {
  blocker_id: string;
  blocked_at: string;
}

export interface UserUnblockedData {
  unblocker_id: string;
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

// Interface สำหรับข้อมูลการอัปเดตการสนทนา (group name, icon)
export interface ConversationUpdateData {
  conversation_id: string;
  title?: string;
  icon_url?: string;
}

// นิยาม Event Type Map
export interface WebSocketEventMap {
  // ส่วนที่มีอยู่เดิม
  'message:message.receive': WebSocketEnvelope<MessageDTO>;
  'message:message.edit': WebSocketEnvelope<MessageDTO>;
  'message:message.read': WebSocketEnvelope<MessageReadDTO>;
  'message:message.read_all': WebSocketEnvelope<MessageReadAllDTO>;
  'message:message.updated': MessageDTO;
  'message:message.delete': WebSocketEnvelope<MessageDeletedData>;

  'message:conversation.create': WebSocketEnvelope<ConversationDTO>;
  'message:conversation.update': WebSocketEnvelope<ConversationUpdateData>; // ใหม่: อัปเดตชื่อและไอคอนกลุ่ม
  'message:conversation.updated': WebSocketEnvelope<ConversationDTO>;
  'message:conversation.deleted': WebSocketEnvelope<ConversationDTO>;
  'message:conversation.join': WebSocketEnvelope<ConversationDTO>;

  'message:friend.request': WebSocketEnvelope<FriendRequestNotification>;
  'message:friend.accept': WebSocketEnvelope<FriendAcceptNotification>;
  'message:friend.reject': PendingRequestItem;
  'message:friend.remove': PendingRequestItem;

  'message:user.blocked': WebSocketEnvelope<UserBlockedData>;
  'message:user.unblocked': WebSocketEnvelope<UserUnblockedData>;

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

  // สำหรับ events ภายในของ WebSocket connection
  'ws:open': Event;
  'ws:close': CloseEvent;
  'ws:error': Event;
  'ws:reconnecting': ReconnectingData;
  'ws:reconnect_failed': void;
  'ws:pong': { timestamp: number };
  'ws:message': unknown; // สำหรับ raw message events
}