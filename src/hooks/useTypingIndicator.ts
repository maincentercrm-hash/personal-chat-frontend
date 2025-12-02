import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { useDebouncedCallback } from 'use-debounce';
import type { TypingUser, UseTypingIndicatorOptions, UseTypingIndicatorReturn } from '@/types/typing.types';

/**
 * Hook for managing typing indicator functionality
 *
 * Features:
 * - Tracks who is typing in a conversation
 * - Auto-stop typing after 5 seconds (fallback if backend doesn't send stop)
 * - Debounced outgoing typing events (max 1 per second)
 * - Supports both old (message.typing) and new (user_typing) event formats
 *
 * @example
 * const { typingUsers, startTyping, stopTyping } = useTypingIndicator({
 *   conversationId: 'conv-123',
 *   currentUserId: 'user-456'
 * });
 */
export const useTypingIndicator = ({
  conversationId,
  currentUserId,
  autoStopTimeout = 5000
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const { addEventListener, send, isConnected } = useWebSocketContext();

  // Auto-stop timers for each user
  const typingTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Track if current user is typing
  const isTypingRef = useRef(false);

  /**
   * Handle incoming typing events from WebSocket
   */
  const handleTypingEvent = useCallback((data: any) => {
    console.log('[TypingIndicator] 📨 Received typing event:', data); // 🆕 Debug log

    if (!data?.data) {
      console.log('[TypingIndicator] ⚠️ No data in event'); // 🆕 Debug log
      return;
    }

    const eventData = data.data;

    // Ignore if not for this conversation
    if (eventData.conversation_id !== conversationId) {
      console.log('[TypingIndicator] ⚠️ Wrong conversation:', eventData.conversation_id, 'expected:', conversationId); // 🆕 Debug log
      return;
    }

    // Ignore current user's typing (don't show our own typing indicator)
    if (currentUserId && eventData.user_id === currentUserId) {
      console.log('[TypingIndicator] ⚠️ Ignoring own typing'); // 🆕 Debug log
      return;
    }

    const userId = eventData.user_id;
    const isTyping = eventData.is_typing;

    // Clear existing timer for this user
    const existingTimer = typingTimers.current.get(userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      typingTimers.current.delete(userId);
    }

    if (isTyping) {
      // Add or update user in typing list
      console.log('[TypingIndicator] ✅ Adding user to typing list:', eventData.display_name || eventData.username); // 🆕 Debug log
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.user_id !== userId);
        const newList = [
          ...filtered,
          {
            user_id: userId,
            username: eventData.username,
            display_name: eventData.display_name,
            conversation_id: conversationId,
            is_typing: true,
            timestamp: new Date().toISOString()
          }
        ];
        console.log('[TypingIndicator] 📝 Updated typing users:', newList); // 🆕 Debug log
        return newList;
      });

      // Set auto-stop timer (fallback if backend doesn't send stop event)
      const timer = setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.user_id !== userId));
        typingTimers.current.delete(userId);
      }, autoStopTimeout);

      typingTimers.current.set(userId, timer);
    } else {
      // Remove user from typing list
      setTypingUsers(prev => prev.filter(u => u.user_id !== userId));
    }
  }, [conversationId, currentUserId, autoStopTimeout]);

  /**
   * Listen to WebSocket typing events
   * Supports both 'message:message.typing' (old) and 'message:user_typing' (new)
   * Note: WebSocketConnection adds 'message:' prefix to all events
   */
  useEffect(() => {
    console.log('[TypingIndicator] 🎧 Registering event listeners for conversation:', conversationId); // 🆕 Debug log

    // WebSocketConnection emits with 'message:' prefix, so:
    // Backend: message.typing → Frontend: message:message.typing
    // Backend: user_typing → Frontend: message:user_typing
    const unsubscribeOld = addEventListener('message:message.typing', handleTypingEvent);
    const unsubscribeNew = addEventListener('message:user_typing', handleTypingEvent);

    return () => {
      console.log('[TypingIndicator] 🔌 Unregistering event listeners'); // 🆕 Debug log
      unsubscribeOld();
      unsubscribeNew();
    };
  }, [addEventListener, handleTypingEvent, conversationId]);

  /**
   * Send typing event to server (debounced)
   * Max 1 event per second to prevent spam
   */
  const sendTypingDebounced = useDebouncedCallback((isTyping: boolean) => {
    if (!isConnected) return;

    send('message.typing', {
      conversation_id: conversationId,
      is_typing: isTyping
    });
  }, 1000, {
    leading: true,  // Send immediately on first call
    trailing: false // Don't send trailing event
  });

  /**
   * Start typing
   * Call this when user starts typing in the input
   */
  const startTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingDebounced(true);
    }
  }, [sendTypingDebounced]);

  /**
   * Stop typing
   * Call this when user stops typing or sends a message
   */
  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTypingDebounced.cancel(); // Cancel any pending debounced call

      // Send stop event immediately (not debounced)
      if (isConnected) {
        send('message.typing', {
          conversation_id: conversationId,
          is_typing: false
        });
      }
    }
  }, [sendTypingDebounced, isConnected, send, conversationId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clear all timers
      typingTimers.current.forEach(timer => clearTimeout(timer));
      typingTimers.current.clear();

      // Send stop typing if was typing
      if (isTypingRef.current && isConnected) {
        send('message.typing', {
          conversation_id: conversationId,
          is_typing: false
        });
      }
    };
  }, [conversationId, send, isConnected]);

  /**
   * Reset typing users when conversation changes
   */
  useEffect(() => {
    setTypingUsers([]);
    isTypingRef.current = false;
  }, [conversationId]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
    isTyping: isTypingRef.current
  };
};

export default useTypingIndicator;
