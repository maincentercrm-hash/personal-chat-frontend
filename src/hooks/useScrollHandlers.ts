// src/hooks/useScrollHandlers.ts
import { useCallback, useState } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import type { MessageDTO } from '@/types/message.types';

// ========================================
// TYPES
// ========================================

interface UseScrollHandlersProps {
  virtuosoRef: React.RefObject<VirtuosoHandle>;
  deduplicatedMessages: MessageDTO[];
  onLoadMore?: () => void;
  onLoadMoreAtBottom?: () => void;
  setAtBottom: (atBottom: boolean) => void;
  isJumpingRef: React.MutableRefObject<boolean>;
  isLoadingBottomRef: React.MutableRefObject<boolean>;
}

interface UseScrollHandlersReturn {
  // Scroll functions
  jumpToMessage: (messageId: string) => void;
  scrollToBottom: (smooth?: boolean) => void;

  // Load more functions
  handleLoadMore: () => Promise<void>;
  handleLoadMoreAtBottom: () => Promise<void>;

  // Loading states
  isLoadingMore: boolean;
  isLoadingMoreBottom: boolean;
}

// ========================================
// HOOK
// ========================================

export const useScrollHandlers = ({
  virtuosoRef,
  deduplicatedMessages,
  onLoadMore,
  onLoadMoreAtBottom,
  setAtBottom,
  isJumpingRef,
  isLoadingBottomRef
}: UseScrollHandlersProps): UseScrollHandlersReturn => {
  // ========================================
  // STATE
  // ========================================
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingMoreBottom, setIsLoadingMoreBottom] = useState(false);

  // ========================================
  // SCROLL HANDLERS
  // ========================================

  // Smart jump: optimized for images/stickers and far positions
  const jumpToMessage = useCallback((messageId: string) => {
    const targetIndex = deduplicatedMessages.findIndex(msg => msg.id === messageId);

    if (targetIndex === -1 || !virtuosoRef.current) {
      console.log('[Jump] Message not found in list');
      return;
    }

    const totalMessages = deduplicatedMessages.length;
    const percentPosition = (targetIndex / totalMessages) * 100;

    console.log(`[Jump] Scrolling to index ${targetIndex}/${totalMessages} (${percentPosition.toFixed(1)}%)`);

    // Mark as jumping to prevent auto scroll
    isJumpingRef.current = true;
    setAtBottom(false);

    // Strategy: Use 'start' only for very top items (< 10%), otherwise 'center'
    const align = percentPosition < 10 ? 'start' : 'center';

    // First scroll: instant (auto) to pre-render items
    virtuosoRef.current.scrollToIndex({
      index: targetIndex,
      align: align,
      behavior: 'auto' // Instant scroll to render items
    });

    // Wait for images to load and retry with smooth scroll
    setTimeout(() => {
      if (!virtuosoRef.current) return;

      console.log('[Jump] Retry scroll after images loaded');

      // Second scroll: smooth to correct position after images loaded
      virtuosoRef.current.scrollToIndex({
        index: targetIndex,
        align: align,
        behavior: 'smooth'
      });

      // Highlight after final scroll
      setTimeout(() => {
        const element = document.querySelector(`[data-message-id="${messageId}"]`);
        if (element) {
          element.classList.add('ring-4', 'ring-yellow-400', 'transition-all', 'duration-300');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-yellow-400');
            isJumpingRef.current = false;
          }, 2000);
        } else {
          console.log('[Jump] Element not found after scroll');
          isJumpingRef.current = false;
        }
      }, 500);
    }, 400); // Wait for images to load
  }, [deduplicatedMessages, virtuosoRef, isJumpingRef, setAtBottom]);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (!virtuosoRef.current || deduplicatedMessages.length === 0) return;

    setAtBottom(true);

    virtuosoRef.current.scrollToIndex({
      index: deduplicatedMessages.length - 1,
      align: 'end',
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, [deduplicatedMessages.length, virtuosoRef, setAtBottom]);

  // ========================================
  // LOAD MORE HANDLERS
  // ========================================

  // Handle load more at top (scroll up - older messages)
  const handleLoadMore = useCallback(async () => {
    if (!onLoadMore) {
      console.log('[debug_scroll] ⏸️ Skip load more at TOP: onLoadMore is null');
      return;
    }

    if (isLoadingMore) {
      console.log('[debug_scroll] ⏸️ Skip load more at TOP: already loading');
      return;
    }

    console.log('[debug_scroll] ⬆️ Load more at TOP triggered (scrolling UP)');
    setIsLoadingMore(true);

    try {
      await Promise.resolve(onLoadMore());
      console.log('[debug_scroll] ✅ Load more at TOP completed');
    } catch (error) {
      console.error('[debug_scroll] ❌ Load more at TOP failed:', error);
    } finally {
      // Reset immediately in finally
      setIsLoadingMore(false);
      console.log('[debug_scroll] 🔄 Load more complete - ready for next operation');
    }
  }, [onLoadMore, isLoadingMore]);

  // Handle load more at bottom (scroll down after jump)
  const handleLoadMoreAtBottom = useCallback(async () => {
    if (!onLoadMoreAtBottom || isLoadingMoreBottom || isLoadingBottomRef.current) {
      console.log('[debug_scroll] ⏸️ Skip load more at BOTTOM (already loading)');
      return;
    }

    console.log('[debug_scroll] ⬇️ Load more at BOTTOM triggered (scrolling DOWN)');
    setIsLoadingMoreBottom(true);
    isLoadingBottomRef.current = true; // Set ref immediately

    try {
      await Promise.resolve(onLoadMoreAtBottom());
      console.log('[debug_scroll] ✅ Load more at BOTTOM completed');
    } catch (error) {
      console.error('[debug_scroll] ❌ Load more at BOTTOM failed:', error);
    } finally {
      // Wait a bit before allowing next load to prevent rapid triggers
      setTimeout(() => {
        setIsLoadingMoreBottom(false);
        isLoadingBottomRef.current = false;
      }, 300); // 300ms cooldown
    }
  }, [onLoadMoreAtBottom, isLoadingMoreBottom, isLoadingBottomRef]);

  // ========================================
  // RETURN
  // ========================================

  return {
    jumpToMessage,
    scrollToBottom,
    handleLoadMore,
    handleLoadMoreAtBottom,
    isLoadingMore,
    isLoadingMoreBottom
  };
};
