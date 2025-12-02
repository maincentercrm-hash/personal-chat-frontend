/**
 * Typing-related type definitions for Chat UI/UX
 */

/**
 * User who is currently typing in a conversation
 */
export interface TypingUser {
  user_id: string;
  username?: string;
  display_name?: string;
  conversation_id: string;
  is_typing: boolean;
  timestamp?: string;
}

/**
 * Typing state for a specific conversation
 */
export interface TypingState {
  conversationId: string;
  users: TypingUser[];
  lastUpdate: Date;
}

/**
 * Typing event data from WebSocket
 * Supports both old (message.typing) and new (user_typing) event formats
 */
export interface TypingEventData {
  type: 'message.typing' | 'user_typing';
  data: {
    conversation_id: string;
    user_id: string;
    username?: string;
    display_name?: string;
    is_typing: boolean;
  };
}

/**
 * Typing event data to send to server
 */
export interface TypingEventPayload {
  conversation_id: string;
  is_typing: boolean;
}

/**
 * Options for useTypingIndicator hook
 */
export interface UseTypingIndicatorOptions {
  conversationId: string;
  currentUserId?: string;
  autoStopTimeout?: number; // milliseconds, default: 5000
}

/**
 * Return type for useTypingIndicator hook
 */
export interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[];
  startTyping: () => void;
  stopTyping: () => void;
  isTyping: boolean;
}
