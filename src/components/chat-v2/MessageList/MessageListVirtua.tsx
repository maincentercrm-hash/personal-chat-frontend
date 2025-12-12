/**
 * MessageListVirtua - Message list using virtua library
 *
 * virtua advantages:
 * - ~3kB (vs 40kB react-virtuoso)
 * - Built-in shift mode for prepending
 * - Better scroll handling
 * - Zero-config dynamic height
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
import { VList, type VListHandle } from 'virtua';
import type { MessageDTO } from '@/types/message.types';
import type { MessageListRef } from './types';
import { MessageListProvider } from './MessageListContext';
import { MessageItem } from '../MessageItem';
import { DateSeparator, ScrollToBottom } from '../shared';

import '../styles/telegram.css';

// ============================================
// Types
// ============================================

interface MessageListVirtuaProps {
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
        key: `date-${message.created_at.slice(0, 10)}-${index}`,
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

const LoadingIndicator = memo(function LoadingIndicator() {
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

// ============================================
// Main Component
// ============================================

export const MessageListVirtua = memo(
  forwardRef<MessageListRef, MessageListVirtuaProps>(function MessageListVirtua(
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
    const listRef = useRef<VListHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [shifting, setShifting] = useState(false);

    // Refs for tracking
    const isAtBottomRef = useRef(true);
    const prevConvIdRef = useRef(conversationId);
    const prevMessagesLengthRef = useRef(0);
    const prevFirstMessageIdRef = useRef<string | null>(null);
    const isLoadingRef = useRef(false);
    const initialScrollDoneRef = useRef(false);

    // Build list items
    const listItems = useMemo(() => buildListItems(messages), [messages]);

    // ============================================
    // Handle conversation change
    // ============================================
    useEffect(() => {
      if (prevConvIdRef.current !== conversationId) {
        console.log('[Virtua] Conversation changed:', conversationId);
        prevConvIdRef.current = conversationId;
        prevMessagesLengthRef.current = 0;
        prevFirstMessageIdRef.current = null;
        isAtBottomRef.current = true;
        isLoadingRef.current = false;
        initialScrollDoneRef.current = false;
        setShowScrollToBottom(false);
        setShifting(false);
      }
    }, [conversationId]);

    // ============================================
    // Handle initial scroll to bottom
    // ============================================
    useEffect(() => {
      if (listItems.length > 0 && !initialScrollDoneRef.current) {
        console.log('[Virtua] Initial scroll to bottom');
        initialScrollDoneRef.current = true;

        // Scroll to bottom after render
        requestAnimationFrame(() => {
          listRef.current?.scrollToIndex(listItems.length - 1, { align: 'end' });
        });
      }
    }, [listItems.length]);

    // ============================================
    // Handle prepend detection (for shift mode)
    // ============================================
    useEffect(() => {
      const currentLength = messages.length;
      const prevLength = prevMessagesLengthRef.current;
      const currentFirstId = messages[0]?.id;
      const prevFirstId = prevFirstMessageIdRef.current;

      // Detect prepend: more items AND first message ID changed
      if (
        currentLength > prevLength &&
        prevLength > 0 &&
        currentFirstId !== prevFirstId
      ) {
        console.log('[Virtua] Prepend detected');
        setShifting(true);
        // Reset shifting after a short delay
        requestAnimationFrame(() => {
          setShifting(false);
        });
      }

      prevMessagesLengthRef.current = currentLength;
      prevFirstMessageIdRef.current = currentFirstId || null;
    }, [messages]);

    // ============================================
    // Handlers
    // ============================================

    const scrollToMessage = useCallback((messageId: string) => {
      const index = listItems.findIndex(
        item => item.type === 'message' && item.message?.id === messageId
      );
      if (index !== -1) {
        listRef.current?.scrollToIndex(index, { align: 'center', smooth: true });
      }
    }, [listItems]);

    const scrollToBottom = useCallback((smooth = true) => {
      listRef.current?.scrollToIndex(listItems.length - 1, {
        align: 'end',
        smooth,
      });
      setShowScrollToBottom(false);
    }, [listItems.length]);

    useImperativeHandle(ref, () => ({
      scrollToMessage,
      scrollToBottom,
    }), [scrollToMessage, scrollToBottom]);

    const handleScroll = useCallback((offset: number) => {
      if (!listRef.current || !containerRef.current) return;

      const scrollHeight = containerRef.current.scrollHeight;
      const clientHeight = containerRef.current.clientHeight;
      const maxScroll = scrollHeight - clientHeight;

      // Check if at bottom (within 50px threshold)
      const atBottom = offset >= maxScroll - 50;
      isAtBottomRef.current = atBottom;

      // Show/hide scroll to bottom button
      setShowScrollToBottom(!atBottom && offset < maxScroll - 200);

      // Load more when near top
      if (offset < 100 && hasMoreTop && !isLoadingTop && !isLoadingRef.current && onLoadMore) {
        console.log('[Virtua] Near top, loading more...');
        isLoadingRef.current = true;

        Promise.resolve(onLoadMore()).finally(() => {
          setTimeout(() => {
            isLoadingRef.current = false;
          }, 300);
        });
      }
    }, [hasMoreTop, isLoadingTop, onLoadMore]);

    // ============================================
    // Render item
    // ============================================
    const renderItem = useCallback((item: ListItem) => {
      if (item.type === 'date-separator' && item.date) {
        return <DateSeparator key={item.key} date={item.date} />;
      }
      if (item.type === 'message' && item.message) {
        return (
          <MessageItem
            key={item.key}
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

    if (messages.length === 0) {
      return <EmptyState />;
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
        <div className="relative h-full w-full message-list-container" ref={containerRef}>
          {/* Loading indicator at top */}
          {isLoadingTop && <LoadingIndicator />}

          <VList
            ref={listRef}
            style={{ height: '100%' }}
            shift={shifting}
            onScroll={handleScroll}
          >
            {listItems.map(renderItem)}
          </VList>

          {/* Scroll to bottom button */}
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

export default MessageListVirtua;
