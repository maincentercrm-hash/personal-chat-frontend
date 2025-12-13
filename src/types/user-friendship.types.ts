// Frontend TypeScript types for User Friendship

// ============ Constants ============

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked' | 'none';

// ============ Request Types ============

export interface SearchUsersRequest {
  q: string;
  limit?: number;
  offset?: number;
  exact_match?: boolean;
}

export interface SendFriendRequestParam {
  friend_id: string;
  initial_message?: string; // Message Request feature - ข้อความแรกที่ส่งพร้อมคำขอ
}

export interface FriendRequestParam {
  request_id: string;
}

export interface BlockUserParam {
  user_id: string;
}

// ============ Response Types ============

export interface FriendshipData {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendshipStatus;
  requested_at: string; // ISO string
  updated_at: string; // ISO string
  initial_message?: string | null; // Message Request feature
  initial_message_at?: string | null; // ISO string
}

export interface FriendItem {
  id: string;
  username: string;
  display_name: string;
  profile_image_url?: string | null;
  bio?: string | null;
  status: string;
  last_active_at?: string | null; // ISO string
  friendship_id: string;
  friendship_status: FriendshipStatus;
  conversation_id?: string | null;
}

export interface FriendSearchResultItem {
  id: string;
  username: string;
  display_name: string;
  profile_image_url?: string | null;
  bio?: string | null;
  friendship_status: FriendshipStatus;
  friendship_id?: string | null;
}

export interface PendingRequestItem {
  request_id: string;
  user_id: string;
  username: string;
  display_name: string;
  profile_image_url?: string | null;
  requested_at: string; // ISO string
  initial_message?: string | null; // Message Request feature
  initial_message_at?: string | null; // ISO string
}

export interface BlockedUserItem {
  id: string;
  username: string;
  display_name: string;
  profile_image_url?: string | null;
}

// ============ Response Wrapper Types ============

export interface FriendsListResponse {
  success: boolean;
  message: string;
  data: FriendItem[];
}

export interface FriendSearchResponse {
  success: boolean;
  message: string;
  data: FriendSearchResultItem[];
}

export interface FriendshipInfoResponse {
  success: boolean;
  message: string;
  data: FriendshipData;
}

export interface PendingRequestsResponse {
  success: boolean;
  message: string;
  data: PendingRequestItem[];
}

export interface BlockedUsersResponse {
  success: boolean;
  message: string;
  data: BlockedUserItem[];
}

// ============ Specific Response Types ============

export interface SendFriendRequestResponse {
  success: boolean;
  message: string;
  data: FriendshipData;
}

export interface AcceptFriendRequestResponse {
  success: boolean;
  message: string;
  data: FriendshipData;
}

export interface RejectFriendRequestResponse {
  success: boolean;
  message: string;
  data: FriendshipData;
}

export interface RemoveFriendResponse {
  success: boolean;
  message: string;
}

export interface BlockUserResponse {
  success: boolean;
  message: string;
}

export interface UnblockUserResponse {
  success: boolean;
  message: string;
}



/** addon websocket */

// สำหรับข้อมูลผู้ใช้ในการแจ้งเตือน

export interface WebSocketEnvelope<T> {
  type: string;
  data: T;
  timestamp: string;
  success: boolean;
}
export interface UserInfoNotification {
  id: string;
  username: string;
  display_name: string;
  profile_image_url?: string;
  last_active_at?: string;
}

// สำหรับการตอบรับคำขอเป็นเพื่อน (friend_request.accepted)
// ✅ Updated to match backend format
export interface FriendAcceptNotification {
  request_id: string;    // Backend sends "request_id" not "friendship_id"
  by: UserInfoNotification;  // Backend sends "by" not "acceptor"
  accepted_at: string;
}

// สำหรับคำขอเป็นเพื่อน (friend_request.received)
// ✅ Updated to match backend format
export interface FriendRequestNotification {
  request_id: string;
  from: UserInfoNotification;  // Backend sends "from" not "sender"
  created_at: string;          // Backend sends "created_at" not "requested_at"
}

// สำหรับการลบเพื่อน (friend.remove)
export interface FriendRemoveNotification {
  user_id: string;       // ID ของผู้ลบ
  friend_id: string;     // ID ของผู้ถูกลบ
  removed_at: string;
}