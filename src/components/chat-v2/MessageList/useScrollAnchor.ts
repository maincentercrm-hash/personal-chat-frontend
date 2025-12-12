/**
 * useScrollAnchor - Maintains scroll position during content changes
 *
 * Problem: When new messages are prepended (load more history),
 * the scroll position jumps. This hook saves the current anchor
 * message and restores position after content changes.
 *
 * Uses:
 * - Save anchor before loading older messages
 * - Restore after messages are prepended
 * - Handle smooth scroll vs instant scroll
 */

import { useRef, useCallback } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import type { ScrollAnchor } from './types';
import type { MessageDTO } from '@/types/message.types';

// ============================================
// Types
// ============================================

interface UseScrollAnchorOptions {
  /** Virtuoso ref for scroll operations */
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;

  /** Messages array for finding indices */
  messages: MessageDTO[];
}

interface UseScrollAnchorReturn {
  /** Save current scroll anchor */
  saveAnchor: () => void;

  /** Restore to saved anchor */
  restoreAnchor: () => void;

  /** Check if anchor is saved */
  hasAnchor: boolean;

  /** Clear saved anchor */
  clearAnchor: () => void;

  /** Scroll to specific message */
  scrollToMessage: (messageId: string, smooth?: boolean) => void;

  /** Scroll to bottom */
  scrollToBottom: (smooth?: boolean) => void;
}

// ============================================
// Hook
// ============================================

export function useScrollAnchor({
  virtuosoRef,
  messages,
}: UseScrollAnchorOptions): UseScrollAnchorReturn {
  // Anchor state
  const anchorRef = useRef<ScrollAnchor | null>(null);
  const isRestoringRef = useRef(false);

  // Find message index
  const findMessageIndex = useCallback((messageId: string): number => {
    return messages.findIndex(msg => msg.id === messageId);
  }, [messages]);

  // Save current anchor
  const saveAnchor = useCallback(() => {
    const virtuoso = virtuosoRef.current;
    if (!virtuoso) return;

    // Get current scroll state from Virtuoso
    virtuoso.getState((state) => {
      // Find first visible message
      const visibleRange = state.ranges;
      if (visibleRange && visibleRange.length > 0) {
        const firstVisibleIndex = visibleRange[0]?.startIndex ?? 0;
        const message = messages[firstVisibleIndex];

        if (message) {
          anchorRef.current = {
            messageId: message.id,
            offsetFromTop: 0, // Simplified - could track precise offset
          };
        }
      }
    });
  }, [virtuosoRef, messages]);

  // Restore to saved anchor
  const restoreAnchor = useCallback(() => {
    const anchor = anchorRef.current;
    const virtuoso = virtuosoRef.current;

    if (!anchor || !virtuoso || isRestoringRef.current) return;

    const index = findMessageIndex(anchor.messageId);
    if (index === -1) {
      // Message no longer exists, clear anchor
      anchorRef.current = null;
      return;
    }

    isRestoringRef.current = true;

    // Scroll to anchor position
    virtuoso.scrollToIndex({
      index,
      align: 'start',
      behavior: 'auto', // Instant restore
    });

    // Clear anchor after restore
    setTimeout(() => {
      isRestoringRef.current = false;
      anchorRef.current = null;
    }, 100);
  }, [virtuosoRef, findMessageIndex]);

  // Clear anchor
  const clearAnchor = useCallback(() => {
    anchorRef.current = null;
  }, []);

  // Scroll to specific message
  const scrollToMessage = useCallback((messageId: string, smooth = true) => {
    const virtuoso = virtuosoRef.current;
    if (!virtuoso) return;

    const index = findMessageIndex(messageId);
    if (index === -1) return;

    virtuoso.scrollToIndex({
      index,
      align: 'center',
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, [virtuosoRef, findMessageIndex]);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    const virtuoso = virtuosoRef.current;
    if (!virtuoso || messages.length === 0) return;

    virtuoso.scrollToIndex({
      index: messages.length - 1,
      align: 'end',
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, [virtuosoRef, messages.length]);

  return {
    saveAnchor,
    restoreAnchor,
    hasAnchor: anchorRef.current !== null,
    clearAnchor,
    scrollToMessage,
    scrollToBottom,
  };
}

export default useScrollAnchor;
