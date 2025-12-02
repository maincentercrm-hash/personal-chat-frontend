// src/services/websocket/constants.ts
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'wss://api.example.com';

export enum MessageType {
  // Connection management
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  PING = "ping",
  PONG = "pong",

  MESSAGE_SEND = "message.send",
  MESSAGE_RECEIVE = "message.receive",
  MESSAGE_UPDATED = "message.updated", // ✅ เปลี่ยนจาก message.edit เป็น message.updated
  MESSAGE_DELETE = "message.delete",
  MESSAGE_READ = "message.read",
  MESSAGE_TYPING = "message.typing", // ✅ เก่า (backward compatible)

  // 🆕 Typing events (รูปแบบใหม่)
  TYPING_START = "typing_start",  // ส่งเมื่อเริ่มพิมพ์
  TYPING_STOP = "typing_stop",    // ส่งเมื่อหยุดพิมพ์
  USER_TYPING = "user_typing",    // รับจาก backend (broadcast)

  CONVERSATION_CREATE = "conversation.create",
  CONVERSATION_UPDATE = "conversation.update",
  CONVERSATION_JOIN = "conversation.join",
  CONVERSATION_LEAVE = "conversation.leave",

  // Group/Conversation Management
  CONVERSATION_MEMBER_ROLE_CHANGED = "conversation.member_role_changed",
  CONVERSATION_OWNERSHIP_TRANSFERRED = "conversation.ownership_transferred",
  CONVERSATION_ACTIVITY_NEW = "conversation.activity.new",

  // User status subscription
  USER_STATUS_SUBSCRIBE = "user.status.subscribe",
  USER_STATUS_UNSUBSCRIBE = "user.status.unsubscribe",
  
  // Don't forget to include these existing constants
  USER_ONLINE = "user.online",
  USER_OFFLINE = "user.offline",
  USER_STATUS = "user.status",
}


export const WS_RECONNECT_INTERVAL = 3000; // 3 seconds
export const WS_MAX_RECONNECT_ATTEMPTS = 10;
export const WS_PING_INTERVAL = 30000; // 30 seconds