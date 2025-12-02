/**
 * Presence/Online status type definitions for Chat UI/UX
 */

/**
 * User presence/online status
 * Compatible with both Backend v1 and v2 response formats
 */
export interface UserPresence {
  user_id: string;
  status?: 'online' | 'offline' | 'away' | 'busy'; // Backend v2 (new)
  is_online: boolean; // Backend v1 & v2 (backward compatible)
  last_seen?: string; // Backend v2 (new) - ISO 8601 timestamp
  last_active_at?: string; // Backend v1 (old) - ISO 8601 timestamp
}

/**
 * Presence API response (single user)
 */
export interface PresenceResponse {
  success: boolean;
  data: UserPresence;
}

/**
 * Presence API response (multiple users)
 */
export interface PresenceBatchResponse {
  success: boolean;
  data: UserPresence[];
}

/**
 * User status WebSocket event
 * Sent when user goes online/offline
 */
export interface UserStatusEvent {
  type: 'user_status' | 'message:user.status';
  data: {
    user_id: string;
    status: 'online' | 'offline' | 'away' | 'busy';
    timestamp: string; // ISO 8601
    last_seen?: string; // Only when status is 'offline'
  };
}

/**
 * User online WebSocket event (old format)
 */
export interface UserOnlineEvent {
  type: 'message:user.online';
  data: {
    user_id: string;
    timestamp: string;
  };
}

/**
 * User offline WebSocket event (old format)
 */
export interface UserOfflineEvent {
  type: 'message:user.offline';
  data: {
    user_id: string;
    timestamp: string;
  };
}

/**
 * Options for useOnlineStatus hook
 */
export interface UseOnlineStatusOptions {
  userIds: string[];
  pollInterval?: number; // milliseconds, default: 30000 (30 seconds)
  enablePolling?: boolean; // Enable polling fallback when WebSocket disconnected
}

/**
 * Return type for useOnlineStatus hook
 */
export interface UseOnlineStatusReturn {
  isLoading: boolean;
  userStatuses: Record<string, UserPresence>;
  isUserOnline: (userId: string) => boolean;
  isUserOffline: (userId: string) => boolean;
  isUserBusy: (userId: string) => boolean;
  isUserAway: (userId: string) => boolean;
  getLastActiveTime: (userId: string) => Date | null;
  getUserStatus: (userId: string) => UserPresence | null;
}
