/**
 * MessageListContext - Shared context for MessageList components
 * ลด prop drilling โดยใช้ context
 *
 * Selection state is now managed by uiStore (global) so it can be accessed
 * from ChatHeader for the selection toolbar
 */

import { createContext, useContext, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { MessageDTO } from '@/types/message.types';
import type { MessageListContextValue } from './types';
import useUIStore from '@/stores/uiStore';

// ============================================
// Context
// ============================================

const MessageListContext = createContext<MessageListContextValue | null>(null);

// ============================================
// Hook
// ============================================

export function useMessageListContext(): MessageListContextValue {
  const context = useContext(MessageListContext);
  if (!context) {
    throw new Error('useMessageListContext must be used within MessageListProvider');
  }
  return context;
}

// ============================================
// Provider Props
// ============================================

interface MessageListProviderProps {
  children: ReactNode;
  currentUserId: string;
  conversationId: string;
  isGroupChat?: boolean;

  // Actions
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onResend?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  onMediaClick?: (messageId: string, mediaIndex?: number) => void;
  onJumpToMessage?: (messageId: string) => void;
}

// ============================================
// Provider
// ============================================

export function MessageListProvider({
  children,
  currentUserId,
  conversationId,
  isGroupChat = false,
  onReply,
  onEdit,
  onDelete,
  onResend,
  onCopy,
  onMediaClick,
  onJumpToMessage,
}: MessageListProviderProps) {
  // Selection state from uiStore (global state)
  const isSelectionMode = useUIStore(state => state.isSelectionMode);
  const selectedMessageIdsArray = useUIStore(state => state.selectedMessageIds);
  const toggleMessageSelection = useUIStore(state => state.toggleMessageSelection);
  const selectMessage = useUIStore(state => state.selectMessage);
  const clearSelection = useUIStore(state => state.clearSelection);

  // Convert array to Set for compatibility
  const selectedMessageIds = useMemo(() => new Set(selectedMessageIdsArray), [selectedMessageIdsArray]);

  // Format time (e.g., "14:30")
  const formatTime = useCallback((timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, []);

  // Format date (e.g., "วันนี้", "เมื่อวาน", "15 ธ.ค.")
  const formatDate = useCallback((timestamp: string): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'วันนี้';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'เมื่อวาน';
    }

    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
    });
  }, []);

  // Check if message is from current user
  const isOwnMessage = useCallback((message: MessageDTO): boolean => {
    if (message.sender_id === currentUserId) return true;
    if (message.sender_type === 'business') return true;
    return false;
  }, [currentUserId]);

  // Get sender display name
  const getSenderName = useCallback((message: MessageDTO): string => {
    if (message.sender_name) return message.sender_name;
    if (message.sender_info?.display_name) return message.sender_info.display_name;
    if (message.sender?.display_name) return message.sender.display_name;
    return 'Unknown';
  }, []);

  // Toggle message selection (uses uiStore)
  const toggleSelection = useCallback((messageId: string) => {
    toggleMessageSelection(messageId);
  }, [toggleMessageSelection]);

  // Enter selection mode with first message (uses uiStore)
  const enterSelectionMode = useCallback((messageId: string) => {
    clearSelection(); // Clear previous selection
    selectMessage(messageId);
  }, [clearSelection, selectMessage]);

  // Exit selection mode (uses uiStore)
  const exitSelectionMode = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Memoize context value
  const value = useMemo<MessageListContextValue>(() => ({
    currentUserId,
    conversationId,
    isGroupChat,
    formatTime,
    formatDate,
    isOwnMessage,
    getSenderName,
    onReply,
    onEdit,
    onDelete,
    onResend,
    onCopy,
    onMediaClick,
    onJumpToMessage,
    isSelectionMode,
    selectedMessageIds,
    toggleSelection,
    enterSelectionMode,
    exitSelectionMode,
  }), [
    currentUserId,
    conversationId,
    isGroupChat,
    formatTime,
    formatDate,
    isOwnMessage,
    getSenderName,
    onReply,
    onEdit,
    onDelete,
    onResend,
    onCopy,
    onMediaClick,
    onJumpToMessage,
    isSelectionMode,
    selectedMessageIds,
    toggleSelection,
    enterSelectionMode,
    exitSelectionMode,
  ]);

  return (
    <MessageListContext.Provider value={value}>
      {children}
    </MessageListContext.Provider>
  );
}

export default MessageListContext;
