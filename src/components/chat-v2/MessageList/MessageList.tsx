/**
 * MessageList - Main component using react-virtuoso
 * Telegram-style message list with virtual scrolling
 */

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useState,
  useMemo,
  useEffect,
  memo,
} from 'react';
import { Virtuoso } from 'react-virtuoso';
import type { VirtuosoHandle } from 'react-virtuoso';
import type { MessageDTO } from '@/types/message.types';
import type { MessageListProps, MessageListRef } from './types';
import { useMessageList } from './useMessageList';
import { MessageItem } from '../MessageItem';
import { DateSeparator, ScrollToBottom } from '../shared';

// Import Telegram styles
import '../styles/telegram.css';

/**
 * Check if should show date separator
 * Compare dates only (not times)
 */
function shouldShowDateSeparator(
  current: MessageDTO,
  prev: MessageDTO | undefined
): boolean {
  if (!prev) return true;

  const currentDate = new Date(current.created_at);
  const prevDate = new Date(prev.created_at);

  return (
    currentDate.getFullYear() !== prevDate.getFullYear() ||
    currentDate.getMonth() !== prevDate.getMonth() ||
    currentDate.getDate() !== prevDate.getDate()
  );
}

// ============================================
// Types
// ============================================

interface ListItem {
  type: 'message' | 'date-separator';
  message?: MessageDTO;
  date?: string;
  prevMessage?: MessageDTO;
  nextMessage?: MessageDTO;
}

// ============================================
// Header Component (Loading indicator)
// ============================================

const LoadingHeader = memo(function LoadingHeader() {
  return (
    <div className="flex justify-center py-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span>กำลังโหลด...</span>
      </div>
    </div>
  );
});

// ============================================
// Footer Component (Loading indicator for bottom)
// ============================================

const LoadingFooter = memo(function LoadingFooter() {
  return (
    <div className="flex justify-center py-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span>กำลังโหลดข้อความใหม่...</span>
      </div>
    </div>
  );
});

// ============================================
// Empty State Component
// ============================================

const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center text-muted-foreground">
        <p className="text-lg mb-2">ยังไม่มีข้อความ</p>
        <p className="text-sm">เริ่มการสนทนาเลย!</p>
      </div>
    </div>
  );
});

// ============================================
// Main Component
// ============================================

export const MessageList = memo(
  forwardRef<MessageListRef, MessageListProps>(function MessageList(
    {
      messages,
      currentUserId: _currentUserId,
      conversationId,
      onLoadMore,
      onLoadMoreBottom,
      onJumpToLatest,
      isLoadingTop = false,
      isLoadingBottom = false,
      hasMoreTop = true,
      hasMoreBottom = false,
      // These props are now handled by MessageListProvider (passed via context)
      onReply: _onReply,
      onEdit: _onEdit,
      onDelete: _onDelete,
      onResend: _onResend,
      onForward: _onForward,
      onCopy: _onCopy,
      onMediaClick: _onMediaClick,
      onJumpToMessage: _onJumpToMessage,
      isGroupChat: _isGroupChat,
    },
    ref
  ) {
    // Refs
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    // Hook for message processing (includes prepend detection)
    const {
      processedMessages,
      isLoadingTop: isLoadingMore,
      loadMore,
      firstItemIndex,
    } = useMessageList({
      messages,
      onLoadMore,
    });

    // State
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [newMessageCount, setNewMessageCount] = useState(0);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [isLoadingMoreBottom, setIsLoadingMoreBottom] = useState(false);

    // Track if we should stay at bottom during height changes
    const shouldStickToBottomRef = useRef(true);

    // Track pending scroll - will scroll on next height change
    const pendingScrollToBottomRef = useRef(false);

    // Track conversation changes
    const prevConversationIdRef = useRef(conversationId);

    // Build list items (messages + date separators)
    // Use processedMessages directly - compare with prev message in array
    const listItems = useMemo<ListItem[]>(() => {
      if (processedMessages.length === 0) return [];

      const items: ListItem[] = [];

      processedMessages.forEach((message, index) => {
        const prevMessage = index > 0 ? processedMessages[index - 1] : undefined;
        const nextMessage = index < processedMessages.length - 1
          ? processedMessages[index + 1]
          : undefined;

        // Add date separator if needed
        if (shouldShowDateSeparator(message, prevMessage)) {
          items.push({
            type: 'date-separator',
            date: message.created_at,
          });
        }

        // Add message
        items.push({
          type: 'message',
          message,
          prevMessage,
          nextMessage,
        });
      });

      return items;
    }, [processedMessages]);

    // Track if initial scroll done
    const initialScrollDoneRef = useRef(false);

    // Reset when conversation changes
    useEffect(() => {
      if (prevConversationIdRef.current !== conversationId) {
        console.log('[MessageList] Conversation changed:', conversationId);
        setShowScrollToBottom(false);
        setNewMessageCount(0);
        setIsAtBottom(true);
        prevConversationIdRef.current = conversationId;
        initialScrollDoneRef.current = false;
      }
    }, [conversationId]);

    // Mark initial scroll as done after first atBottom=true or after timeout
    useEffect(() => {
      // Set a timeout as fallback - even if not at bottom, allow load more after 1s
      const timer = setTimeout(() => {
        if (!initialScrollDoneRef.current) {
          console.log('[scroll debug] Initial scroll marked as done (timeout fallback)');
          initialScrollDoneRef.current = true;
        }
      }, 1000);
      return () => clearTimeout(timer);
    }, [conversationId]);

    // Note: Prepend detection is now handled by useMessageList hook

    // Auto scroll when new message appended and should be at bottom
    const prevLastMessageIdRef = useRef<string | null>(null);
    useEffect(() => {
      if (processedMessages.length === 0) return;

      const lastMessage = processedMessages[processedMessages.length - 1];
      const lastMessageId = lastMessage?.id;

      // Check if new message was appended (last message changed)
      if (lastMessageId && lastMessageId !== prevLastMessageIdRef.current) {
        // If we should be at bottom, mark pending scroll
        // The actual scroll will happen in totalListHeightChanged callback
        if (shouldStickToBottomRef.current) {
          console.log('[scroll debug] New message appended, marking pending scroll');
          pendingScrollToBottomRef.current = true;
        }
      }

      prevLastMessageIdRef.current = lastMessageId || null;
    }, [processedMessages]);

    // Handle height changes - scroll to bottom if pending
    const handleHeightChanged = useCallback((height: number) => {
      console.log('[scroll debug] totalListHeightChanged:', height);

      if (pendingScrollToBottomRef.current && virtuosoRef.current) {
        console.log('[scroll debug] Executing pending scroll to bottom');
        pendingScrollToBottomRef.current = false;

        // Use setTimeout to ensure DOM is fully updated
        setTimeout(() => {
          virtuosoRef.current?.scrollTo({
            top: Number.MAX_SAFE_INTEGER,
            behavior: 'auto',
          });
        }, 0);
      }
    }, []);

    // Scroll to message by ID with highlight
    const scrollToMessage = useCallback((messageId: string) => {
      const index = listItems.findIndex(
        (item) => item.type === 'message' && item.message?.id === messageId
      );

      if (index === -1 || !virtuosoRef.current) {
        console.log('[Jump] Message not found in list:', messageId);
        return;
      }

      console.log('[Jump] Scrolling to message:', messageId, 'index:', index);

      // Calculate align strategy: 'start' for top items, 'center' for others
      const percentPosition = (index / listItems.length) * 100;
      const align = percentPosition < 10 ? 'start' : 'center';

      // First scroll: instant to pre-render items
      virtuosoRef.current.scrollToIndex({
        index,
        align,
        behavior: 'auto',
      });

      // Second scroll: smooth + highlight after DOM update
      setTimeout(() => {
        if (!virtuosoRef.current) return;

        // Smooth scroll to correct position
        virtuosoRef.current.scrollToIndex({
          index,
          align,
          behavior: 'smooth',
        });

        // Add highlight after scroll
        setTimeout(() => {
          const element = document.querySelector(`[data-message-id="${messageId}"]`);
          if (element) {
            element.classList.add('ring-4', 'ring-yellow-400', 'transition-all', 'duration-300');
            // Remove highlight after 2 seconds
            setTimeout(() => {
              element.classList.remove('ring-4', 'ring-yellow-400');
            }, 2000);
          }
        }, 300);
      }, 100);
    }, [listItems]);

    // Scroll to bottom (only works if already have all messages)
    const scrollToBottom = useCallback((smooth = true) => {
      if (virtuosoRef.current) {
        console.log('[scroll debug] scrollToBottom called, items:', listItems.length);
        // Use scrollTo end instead of scrollToIndex for more reliable bottom scroll
        virtuosoRef.current.scrollTo({
          top: Number.MAX_SAFE_INTEGER,
          behavior: smooth ? 'smooth' : 'auto',
        });
        setNewMessageCount(0);
        setShowScrollToBottom(false);
        shouldStickToBottomRef.current = true;
      }
    }, [listItems.length]);

    // Jump to latest messages (re-fetch from API)
    const jumpToLatest = useCallback(() => {
      console.log('[scroll debug] jumpToLatest called, hasMoreBottom:', hasMoreBottom);
      if (hasMoreBottom && onJumpToLatest) {
        // Need to fetch latest messages from API
        onJumpToLatest();
      } else {
        // Already at latest, just scroll
        scrollToBottom(true);
      }
      setNewMessageCount(0);
      setShowScrollToBottom(false);
    }, [hasMoreBottom, onJumpToLatest, scrollToBottom]);

    // Handle scroll to bottom button click
    const handleScrollToBottomClick = useCallback(() => {
      // If there are more messages at bottom, jump to latest
      // Otherwise, just scroll to bottom of current messages
      if (hasMoreBottom && onJumpToLatest) {
        console.log('[scroll debug] Jumping to latest (has more bottom)');
        jumpToLatest();
      } else {
        console.log('[scroll debug] Scrolling to bottom (no more bottom)');
        scrollToBottom(true);
      }
    }, [hasMoreBottom, onJumpToLatest, jumpToLatest, scrollToBottom]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        scrollToMessage,
        scrollToBottom,
        jumpToLatest,
      }),
      [scrollToMessage, scrollToBottom, jumpToLatest]
    );

    // Handle scroll state changes
    const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
      console.log('[scroll debug] atBottomStateChange:', atBottom);
      setIsAtBottom(atBottom);
      shouldStickToBottomRef.current = atBottom;
      if (atBottom) {
        setShowScrollToBottom(false);
        setNewMessageCount(0);
      }
    }, []);

    // Handle reaching top (load more older messages)
    // Only trigger if initial scroll is done (prevent loading on first render)
    const handleStartReached = useCallback(() => {
      if (!initialScrollDoneRef.current) {
        console.log('[scroll debug] startReached ignored - initial scroll not done');
        return;
      }
      if (hasMoreTop && !isLoadingTop && !isLoadingMore) {
        console.log('[scroll debug] startReached - loading more');
        loadMore();
      }
    }, [hasMoreTop, isLoadingTop, isLoadingMore, loadMore]);

    // Handle reaching bottom (load more newer messages - after jump)
    const handleEndReached = useCallback(() => {
      if (!initialScrollDoneRef.current) {
        console.log('[scroll debug] endReached ignored - initial scroll not done');
        return;
      }
      if (hasMoreBottom && !isLoadingBottom && !isLoadingMoreBottom && onLoadMoreBottom) {
        console.log('[scroll debug] endReached - loading more at bottom');
        setIsLoadingMoreBottom(true);
        Promise.resolve(onLoadMoreBottom()).finally(() => {
          setIsLoadingMoreBottom(false);
        });
      }
    }, [hasMoreBottom, isLoadingBottom, isLoadingMoreBottom, onLoadMoreBottom]);

    // Handle scroll state for showing scroll-to-bottom button
    const handleScrollStateChange = useCallback((scrolling: boolean) => {
      // Show button when scrolled up and not scrolling
      if (!scrolling && !isAtBottom) {
        setShowScrollToBottom(true);
      }
    }, [isAtBottom]);

    // Render individual item
    const itemContent = useCallback(
      (index: number, item: ListItem) => {
        // Log last item render
        if (index === listItems.length - 1) {
          console.log('[scroll debug] Rendering last item, index:', index);
        }

        if (item.type === 'date-separator' && item.date) {
          return <DateSeparator date={item.date} />;
        }

        if (item.type === 'message' && item.message) {
          return (
            <MessageItem
              message={item.message}
              prevMessage={item.prevMessage}
              nextMessage={item.nextMessage}
            />
          );
        }

        return null;
      },
      [listItems.length]
    );

    // Empty state
    if (processedMessages.length === 0) {
      return <EmptyState />;
    }

    // Note: MessageListProvider should be provided by parent (MessageAreaV2)
    // This allows selection state to be shared between MessageList and SelectionToolbar
    return (
      <div className="relative h-full w-full message-list-container">
        <Virtuoso
          key={conversationId}
          ref={virtuosoRef}
          data={listItems}
          firstItemIndex={firstItemIndex}
          initialTopMostItemIndex={listItems.length - 1}
          itemContent={itemContent}
          followOutput={(isAtBottom) => {
            // Only follow if we're at the real bottom (no more messages to load)
            const shouldFollow = (isAtBottom || shouldStickToBottomRef.current) && !hasMoreBottom;
            console.log('[scroll debug] followOutput:', { isAtBottom, shouldStick: shouldStickToBottomRef.current, hasMoreBottom, shouldFollow });
            return shouldFollow ? 'auto' : false;
          }}
          alignToBottom
          atBottomThreshold={50}
          atBottomStateChange={handleAtBottomStateChange}
          isScrolling={handleScrollStateChange}
          startReached={handleStartReached}
          endReached={handleEndReached}
          increaseViewportBy={{ top: 500, bottom: 200 }}
          overscan={200}
          defaultItemHeight={40}
          totalListHeightChanged={handleHeightChanged}
          components={{
            Header: (isLoadingTop || isLoadingMore) ? LoadingHeader : undefined,
            Footer: isLoadingMoreBottom ? LoadingFooter : undefined,
          }}
          className="h-full"
          style={{ height: '100%' }}
        />

        {/* Scroll to bottom button */}
        <ScrollToBottom
          visible={showScrollToBottom}
          newCount={newMessageCount}
          onClick={handleScrollToBottomClick}
        />
      </div>
    );
  })
);

export default MessageList;
