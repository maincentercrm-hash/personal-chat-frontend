/**
 * Types for chat-v2 MessageList
 */

import type { MessageDTO } from '@/types/message.types';
import type { PinType } from '@/types/pinned-message.types';

// ============================================
// Message List Props
// ============================================

export interface MessageListProps {
  /** Messages to display */
  messages: MessageDTO[];

  /** Current user ID for determining own messages */
  currentUserId: string;

  /** Conversation ID */
  conversationId: string;

  /** Load older messages (scroll up) */
  onLoadMore?: () => Promise<void> | void;

  /** Load newer messages (after jump - scroll down) */
  onLoadMoreBottom?: () => Promise<void> | void;

  /** Is currently loading older messages */
  isLoadingTop?: boolean;

  /** Is currently loading newer messages */
  isLoadingBottom?: boolean;

  /** Has more messages to load at top */
  hasMoreTop?: boolean;

  /** Has more messages to load at bottom (after jump) */
  hasMoreBottom?: boolean;

  /** Jump to latest messages (re-fetch from API) */
  onJumpToLatest?: () => Promise<void> | void;

  /** Jump to specific date (YYYY-MM-DD) */
  onJumpToDate?: (date: string) => Promise<void> | void;

  /** Message actions */
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onResend?: (messageId: string) => void;
  onForward?: (messageIds: string[]) => void;
  onCopy?: (content: string) => void;

  /** Image/media click */
  onMediaClick?: (messageId: string, mediaIndex?: number) => void;

  /** Jump to specific message */
  onJumpToMessage?: (messageId: string) => void;

  /** Display options */
  isGroupChat?: boolean;
}

// ============================================
// Message List Ref
// ============================================

export interface MessageListRef {
  /** Scroll to specific message by ID */
  scrollToMessage: (messageId: string) => void;

  /** Scroll to bottom of list */
  scrollToBottom: (smooth?: boolean) => void;

  /** Jump to latest messages (re-fetch from API) */
  jumpToLatest: () => void;
}

// ============================================
// Message Item Props
// ============================================

export interface MessageItemProps {
  /** The message to display */
  message: MessageDTO;

  /** Previous message (for grouping) */
  prevMessage?: MessageDTO;

  /** Next message (for grouping) */
  nextMessage?: MessageDTO;

  /** Is this user's own message */
  isOwn: boolean;

  /** Is group chat (show sender name) */
  isGroupChat?: boolean;
}

// ============================================
// Message Grouping
// ============================================

export interface MessageGroup {
  /** First message in group */
  isFirst: boolean;

  /** Last message in group */
  isLast: boolean;

  /** Single message (both first and last) */
  isSingle: boolean;

  /** Show sender name (first in group, group chat) */
  showSender: boolean;

  /** Show avatar (last in group, group chat) */
  showAvatar: boolean;
}

// ============================================
// Bubble Props
// ============================================

export interface MessageBubbleProps {
  /** Is own message (right side, green) */
  isOwn: boolean;

  /** Position in group */
  position: 'single' | 'first' | 'middle' | 'last';

  /** Has media content (no padding) */
  hasMedia?: boolean;

  /** Has caption below media */
  hasCaption?: boolean;

  /** Children content */
  children: React.ReactNode;

  /** Additional class names */
  className?: string;
}

// ============================================
// Message Context
// ============================================

export interface MessageListContextValue {
  /** Current user ID */
  currentUserId: string;

  /** Conversation ID */
  conversationId: string;

  /** Is group chat */
  isGroupChat: boolean;

  /** Format timestamp to display time */
  formatTime: (timestamp: string) => string;

  /** Format timestamp to display date */
  formatDate: (timestamp: string) => string;

  /** Check if message is from current user */
  isOwnMessage: (message: MessageDTO) => boolean;

  /** Get sender display name */
  getSenderName: (message: MessageDTO) => string;

  /** Message actions */
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onResend?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  onMediaClick?: (messageId: string, mediaIndex?: number) => void;
  onJumpToMessage?: (messageId: string) => void;
  onPin?: (messageId: string, pinType: PinType) => void;
  onUnpin?: (messageId: string, pinType?: PinType) => void;

  /** Selection mode */
  isSelectionMode: boolean;
  selectedMessageIds: Set<string>;
  toggleSelection: (messageId: string) => void;
  enterSelectionMode: (messageId: string) => void;
  exitSelectionMode: () => void;
}

// ============================================
// Height Cache
// ============================================

export interface HeightCacheEntry {
  height: number;
  timestamp: number;
}

export interface HeightCache {
  get: (messageId: string) => number | undefined;
  set: (messageId: string, height: number) => void;
  has: (messageId: string) => boolean;
  clear: () => void;
}

// ============================================
// Scroll Anchor
// ============================================

export interface ScrollAnchor {
  /** Message ID to anchor to */
  messageId: string;

  /** Offset from top of viewport */
  offsetFromTop: number;
}

// ============================================
// Message Position (for grouping)
// ============================================

export type MessagePosition = 'single' | 'first' | 'middle' | 'last';

// ============================================
// Utility Functions
// ============================================

/**
 * Check if two messages should be grouped together
 * Same sender + within 1 minute
 */
export function shouldGroupMessages(
  current: MessageDTO,
  prev: MessageDTO | undefined
): boolean {
  if (!prev) return false;
  if (current.sender_id !== prev.sender_id) return false;
  if (current.sender_type !== prev.sender_type) return false;

  const currentTime = new Date(current.created_at).getTime();
  const prevTime = new Date(prev.created_at).getTime();
  const diff = currentTime - prevTime;

  // Group if within 1 minute (60000ms)
  return diff < 60000;
}

/**
 * Get message position in group
 */
export function getMessagePosition(
  message: MessageDTO,
  prevMessage: MessageDTO | undefined,
  nextMessage: MessageDTO | undefined
): MessagePosition {
  const groupWithPrev = shouldGroupMessages(message, prevMessage);
  const groupWithNext = nextMessage ? shouldGroupMessages(nextMessage, message) : false;

  if (!groupWithPrev && !groupWithNext) return 'single';
  if (!groupWithPrev && groupWithNext) return 'first';
  if (groupWithPrev && groupWithNext) return 'middle';
  return 'last';
}

/**
 * Check if should show date separator before message
 */
export function shouldShowDateSeparator(
  current: MessageDTO,
  prev: MessageDTO | undefined
): boolean {
  if (!prev) return true;

  const currentDate = new Date(current.created_at).toDateString();
  const prevDate = new Date(prev.created_at).toDateString();

  return currentDate !== prevDate;
}
