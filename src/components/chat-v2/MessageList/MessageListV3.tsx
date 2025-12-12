/**
 * MessageListV3 - Simplified message list with react-virtuoso
 *
 * Key principles:
 * 1. Don't render Virtuoso until data is ready
 * 2. Use Virtuoso's built-in features correctly
 * 3. Keep logic simple and predictable
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
import type { MessageListRef } from './types';
import { MessageListProvider } from './MessageListContext';
import { MessageItem } from '../MessageItem';
import { DateSeparator, ScrollToBottom } from '../shared';

import '../styles/telegram.css';

// ============================================
// Constants
// ============================================

const FIRST_ITEM_INDEX = 100000;

// ============================================
// Types
// ============================================

interface MessageListV3Props {
  messages: MessageDTO[];
  currentUserId: string;
  conversationId: string;
  onLoadMore?: () => Promise<void> | void;
  isLoadingTop?: boolean;
  hasMoreTop?: boolean;
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onResend?: (messageId: string) => void;
  onForward?: (messageIds: string[]) => void;
  onCopy?: (content: string) => void;
  onMediaClick?: (messageId: string, mediaIndex?: number) => void;
  onJumpToMessage?: (messageId: string) => void;
  isGroupChat?: boolean;
}

interface ListItem {
  type: 'message' | 'date-separator';
  key: string;
  message?: MessageDTO;
  date?: string;
  prevMessage?: MessageDTO;
  nextMessage?: MessageDTO;
}

// ============================================
// Helper Functions
// ============================================

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function buildListItems(messages: MessageDTO[]): ListItem[] {
  if (messages.length === 0) return [];

  const items: ListItem[] = [];
  let lastDate: Date | null = null;

  messages.forEach((message, index) => {
    const messageDate = new Date(message.created_at);

    // Add date separator if day changed
    if (!lastDate || !isSameDay(lastDate, messageDate)) {
      items.push({
        type: 'date-separator',
        key: `date-${message.created_at.slice(0, 10)}`,
        date: message.created_at,
      });
      lastDate = messageDate;
    }

    // Add message
    items.push({
      type: 'message',
      key: message.id,
      message,
      prevMessage: index > 0 ? messages[index - 1] : undefined,
      nextMessage: index < messages.length - 1 ? messages[index + 1] : undefined,
    });
  });

  return items;
}

// ============================================
// Sub Components
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

const LoadingState = memo(function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span>กำลังโหลดข้อความ...</span>
      </div>
    </div>
  );
});

// ============================================
// Main Component
// ============================================

export const MessageListV3 = memo(
  forwardRef<MessageListRef, MessageListV3Props>(function MessageListV3(
    {
      messages,
      currentUserId,
      conversationId,
      onLoadMore,
      isLoadingTop = false,
      hasMoreTop = true,
      onReply,
      onEdit,
      onDelete,
      onResend,
      onForward: _onForward,
      onCopy,
      onMediaClick,
      onJumpToMessage,
      isGroupChat = false,
    },
    ref
  ) {
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    // State
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [firstItemIndex, setFirstItemIndex] = useState(FIRST_ITEM_INDEX);
    const [isReady, setIsReady] = useState(false);

    // Refs for tracking
    const currentConvIdRef = useRef(conversationId);
    const prevMessagesLengthRef = useRef(0);
    const prevFirstMessageIdRef = useRef<string | null>(null);
    const isLoadingMoreRef = useRef(false);

    // Build list items
    const listItems = useMemo(() => buildListItems(messages), [messages]);

    // ============================================
    // Effect: Handle conversation change
    // ============================================
    useEffect(() => {
      if (currentConvIdRef.current !== conversationId) {
        console.log('[MessageListV3] Conversation changed:', conversationId);

        // Reset everything
        currentConvIdRef.current = conversationId;
        setFirstItemIndex(FIRST_ITEM_INDEX);
        setShowScrollToBottom(false);
        setIsAtBottom(true);
        setIsReady(false);
        prevMessagesLengthRef.current = 0;
        prevFirstMessageIdRef.current = null;
        isLoadingMoreRef.current = false;
      }
    }, [conversationId]);

    // ============================================
    // Effect: Handle ready state (when messages arrive)
    // ============================================
    useEffect(() => {
      // When we have messages and not ready yet, become ready
      if (messages.length > 0 && !isReady) {
        console.log('[MessageListV3] Messages ready:', messages.length);

        // Store initial state
        prevMessagesLengthRef.current = listItems.length;
        prevFirstMessageIdRef.current = messages[0]?.id || null;

        // Mark as ready (this will trigger render)
        setIsReady(true);
      }
    }, [messages.length, listItems.length, isReady]);

    // ============================================
    // Effect: Scroll to bottom after Virtuoso mounts
    // ============================================
    useEffect(() => {
      if (isReady && listItems.length > 0) {
        // Use multiple frames to ensure Virtuoso is fully rendered
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            console.log('[MessageListV3] Scrolling to bottom after mount');
            virtuosoRef.current?.scrollToIndex({
              index: listItems.length - 1,
              align: 'end',
              behavior: 'auto',
            });
          });
        });
      }
    }, [isReady]); // Only run when isReady changes to true

    // ============================================
    // Effect: Handle prepend (load more at top)
    // ============================================
    useEffect(() => {
      // Skip if not ready or no messages
      if (!isReady || messages.length === 0) return;

      const currentLength = listItems.length;
      const prevLength = prevMessagesLengthRef.current;
      const currentFirstId = messages[0]?.id;
      const prevFirstId = prevFirstMessageIdRef.current;

      // Detect prepend: more items AND first message changed
      if (currentLength > prevLength && currentFirstId !== prevFirstId && prevLength > 0) {
        const diff = currentLength - prevLength;
        console.log('[MessageListV3] Prepended:', diff, 'items');
        setFirstItemIndex(prev => prev - diff);
      }

      // Update refs
      prevMessagesLengthRef.current = currentLength;
      prevFirstMessageIdRef.current = currentFirstId || null;
    }, [messages, listItems.length, isReady]);

    // ============================================
    // Handlers
    // ============================================

    const scrollToMessage = useCallback((messageId: string) => {
      const index = listItems.findIndex(
        item => item.type === 'message' && item.message?.id === messageId
      );
      if (index !== -1) {
        virtuosoRef.current?.scrollToIndex({
          index,
          align: 'center',
          behavior: 'smooth',
        });
      }
    }, [listItems]);

    const scrollToBottom = useCallback((smooth = true) => {
      virtuosoRef.current?.scrollToIndex({
        index: listItems.length - 1,
        align: 'end',
        behavior: smooth ? 'smooth' : 'auto',
      });
      setShowScrollToBottom(false);
    }, [listItems.length]);

    // Jump to latest (same as scrollToBottom for this version)
    const jumpToLatest = useCallback(() => {
      scrollToBottom(false);
    }, [scrollToBottom]);

    useImperativeHandle(ref, () => ({
      scrollToMessage,
      scrollToBottom,
      jumpToLatest,
    }), [scrollToMessage, scrollToBottom, jumpToLatest]);

    const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
      setIsAtBottom(atBottom);
      if (atBottom) {
        setShowScrollToBottom(false);
      }
    }, []);

    const handleStartReached = useCallback(() => {
      if (hasMoreTop && !isLoadingTop && !isLoadingMoreRef.current && onLoadMore) {
        console.log('[MessageListV3] Start reached, loading more...');
        isLoadingMoreRef.current = true;

        Promise.resolve(onLoadMore()).finally(() => {
          setTimeout(() => {
            isLoadingMoreRef.current = false;
          }, 300);
        });
      }
    }, [hasMoreTop, isLoadingTop, onLoadMore]);

    const handleIsScrolling = useCallback((scrolling: boolean) => {
      if (!scrolling && !isAtBottom) {
        setShowScrollToBottom(true);
      }
    }, [isAtBottom]);

    const itemContent = useCallback((_index: number, item: ListItem) => {
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
    }, []);

    // ============================================
    // Render
    // ============================================

    // No messages at all
    if (messages.length === 0) {
      return <EmptyState />;
    }

    // Waiting for ready (first load)
    if (!isReady) {
      return <LoadingState />;
    }

    return (
      <MessageListProvider
        currentUserId={currentUserId}
        conversationId={conversationId}
        isGroupChat={isGroupChat}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
        onResend={onResend}
        onCopy={onCopy}
        onMediaClick={onMediaClick}
        onJumpToMessage={onJumpToMessage}
      >
        <div className="relative h-full w-full message-list-container">
          <Virtuoso
            ref={virtuosoRef}
            data={listItems}
            firstItemIndex={firstItemIndex}
            initialTopMostItemIndex={listItems.length - 1}
            itemContent={itemContent}
            computeItemKey={(_, item) => item.key}
            followOutput="smooth"
            alignToBottom
            atBottomStateChange={handleAtBottomStateChange}
            isScrolling={handleIsScrolling}
            startReached={handleStartReached}
            increaseViewportBy={{ top: 500, bottom: 200 }}
            overscan={200}
            components={{
              Header: isLoadingTop ? LoadingHeader : undefined,
            }}
            className="h-full"
            style={{ height: '100%' }}
          />

          <ScrollToBottom
            visible={showScrollToBottom}
            newCount={0}
            onClick={() => scrollToBottom(true)}
          />
        </div>
      </MessageListProvider>
    );
  })
);

export default MessageListV3;
