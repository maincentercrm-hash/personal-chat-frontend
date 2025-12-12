/**
 * useMessageList - Main hook for MessageList logic
 *
 * Handles:
 * - Message deduplication
 * - Sorting
 * - Load more state
 * - firstItemIndex for Virtuoso prepend pattern
 */

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { MessageDTO } from '@/types/message.types';

// ============================================
// Types
// ============================================

interface UseMessageListOptions {
  messages: MessageDTO[];
  onLoadMore?: () => Promise<void> | void;
}

interface UseMessageListReturn {
  /** Processed messages (deduplicated, sorted) */
  processedMessages: MessageDTO[];

  /** Is loading more messages at top */
  isLoadingTop: boolean;

  /** Load more handler */
  loadMore: () => Promise<void>;

  /** First item index for Virtuoso prepend pattern */
  firstItemIndex: number;

  /** Update first item index when prepending */
  handlePrepend: (count: number) => void;
}

// ============================================
// Hook
// ============================================

const INITIAL_INDEX = 100000;

export function useMessageList({
  messages,
  onLoadMore,
}: UseMessageListOptions): UseMessageListReturn {
  // State
  const [isLoadingTop, setIsLoadingTop] = useState(false);
  const [firstItemIndex, setFirstItemIndex] = useState(INITIAL_INDEX);

  // Track previous state for prepend detection
  const prevCountRef = useRef(0);
  const prevFirstIdRef = useRef<string | null>(null);
  const isFirstRenderRef = useRef(true);

  // Deduplicate and sort messages
  const processedMessages = useMemo(() => {
    if (messages.length === 0) return [];

    // Fast path for single message
    if (messages.length === 1) return messages;

    // Deduplicate using Map (preserves latest version)
    const messageMap = new Map<string, MessageDTO>();

    for (const msg of messages) {
      if (!msg) continue;
      const key = msg.temp_id || msg.id;
      if (key) {
        messageMap.set(key, msg);
      }
    }

    // Convert to array and sort by created_at (oldest first)
    const result = Array.from(messageMap.values());
    result.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return result;
  }, [messages]);

  // Detect prepending and update firstItemIndex
  useEffect(() => {
    // Skip first render
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevCountRef.current = processedMessages.length;
      prevFirstIdRef.current = processedMessages[0]?.id || null;
      return;
    }

    const currentCount = processedMessages.length;
    const prevCount = prevCountRef.current;
    const currentFirstId = processedMessages[0]?.id;
    const prevFirstId = prevFirstIdRef.current;

    // Check if messages were prepended
    if (currentCount > prevCount && prevCount > 0) {
      const diff = currentCount - prevCount;

      // If first message changed, it means messages were prepended
      if (prevFirstId && currentFirstId !== prevFirstId) {
        console.log('[useMessageList] Detected prepend:', diff, 'messages');
        setFirstItemIndex(prev => prev - diff);
      }
    }

    // Update refs for next comparison
    prevCountRef.current = currentCount;
    prevFirstIdRef.current = currentFirstId || null;
  }, [processedMessages]);

  // Load more handler with debounce
  const loadMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMore = useCallback(async () => {
    // Prevent multiple calls
    if (isLoadingTop || !onLoadMore) return;

    // Clear any pending timeout
    if (loadMoreTimeoutRef.current) {
      clearTimeout(loadMoreTimeoutRef.current);
    }

    console.log('[useMessageList] loadMore called');
    setIsLoadingTop(true);

    try {
      await Promise.resolve(onLoadMore());
    } catch (error) {
      console.error('[useMessageList] loadMore error:', error);
    } finally {
      // Delay resetting loading state to prevent rapid re-triggers
      loadMoreTimeoutRef.current = setTimeout(() => {
        setIsLoadingTop(false);
      }, 300);
    }
  }, [isLoadingTop, onLoadMore]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, []);

  // Manual prepend handler (for external use)
  const handlePrepend = useCallback((count: number) => {
    setFirstItemIndex(prev => prev - count);
  }, []);

  return {
    processedMessages,
    isLoadingTop,
    loadMore,
    firstItemIndex,
    handlePrepend,
  };
}

export default useMessageList;
