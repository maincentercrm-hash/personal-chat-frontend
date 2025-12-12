/**
 * chat-v2 - Telegram-style chat components
 *
 * Clean, separated architecture with:
 * - MessageList (Virtuoso-based virtual scroll)
 * - MessageItem (grouping logic)
 * - MessageBubble (Telegram-style bubbles)
 * - Message types (Text, Image, File, Sticker, Album)
 */

// Main integration component (drop-in replacement for MessageArea)
export { MessageAreaV2 } from './MessageAreaV2';
export type { MessageAreaV2Props, MessageAreaV2Ref } from './MessageAreaV2';

// Core MessageList component
export { MessageList, MessageListProvider, useMessageListContext, useMessageList } from './MessageList';
export type { MessageListProps, MessageListRef, MessageListContextValue } from './MessageList';

// MessageItem components
export { MessageItem, MessageBubble, MessageContent, MessageTime, MessageStatus } from './MessageItem';
export type { MessageItemProps, MessageBubbleProps } from './MessageList';

// Message type components
export { TextMessage, ImageMessage, FileMessage, StickerMessage, AlbumMessage } from './messages';

// Shared components
export { DateSeparator, ScrollToBottom } from './shared';

// Interactions
export { MessageContextMenu, SelectionToolbar } from './interactions';

// Utility functions
export { shouldGroupMessages, getMessagePosition, shouldShowDateSeparator } from './MessageList';

// Hooks
export { useHeightCache, useScrollAnchor } from './MessageList';
