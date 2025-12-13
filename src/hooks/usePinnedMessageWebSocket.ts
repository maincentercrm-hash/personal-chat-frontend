// src/hooks/usePinnedMessageWebSocket.ts
// Hook สำหรับ listen WebSocket events ของ Pinned Messages (public pins)

import { useEffect } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { usePinnedMessageStore } from '@/stores/pinnedMessageStore';
import useConversationStore from '@/stores/conversationStore';
import type { PinnedMessageDTO } from '@/types/pinned-message.types';
import type { WebSocketEnvelope } from '@/types/user-friendship.types';

interface PinnedEventData extends PinnedMessageDTO {
  // PinnedMessageDTO fields are included
}

interface UnpinnedEventData {
  message_id: string;
  conversation_id: string;
  unpinned_by: string;
  unpinned_at: string;
}

/**
 * Hook สำหรับ listen WebSocket events ของ Pinned Messages:
 * - message.pinned - เมื่อมีคนปักหมุดข้อความแบบ public
 * - message.unpinned - เมื่อมีคนยกเลิกปักหมุดข้อความแบบ public
 */
export function usePinnedMessageWebSocket() {
  const { addEventListener } = useWebSocketContext();
  const { addPinnedMessage, removePinnedMessage } = usePinnedMessageStore();
  const { updateMessage } = useConversationStore();

  useEffect(() => {
    // Handler สำหรับ message.pinned event
    const handleMessagePinned = (envelope: WebSocketEnvelope<PinnedEventData>) => {
      console.log('[usePinnedMessageWebSocket] message.pinned received:', envelope);

      if (envelope.data) {
        const pinnedMessage = envelope.data;

        // เพิ่ม pinned message เข้า store
        addPinnedMessage(pinnedMessage.conversation_id, pinnedMessage);

        // อัปเดต is_pinned ใน message store
        updateMessage(pinnedMessage.message_id, {
          is_pinned: true,
          pinned_at: pinnedMessage.pinned_at
        });
      }
    };

    // Handler สำหรับ message.unpinned event
    const handleMessageUnpinned = (envelope: WebSocketEnvelope<UnpinnedEventData>) => {
      console.log('[usePinnedMessageWebSocket] message.unpinned received:', envelope);

      if (envelope.data) {
        const { message_id, conversation_id } = envelope.data;

        // ลบ pinned message ออกจาก store (public type)
        removePinnedMessage(conversation_id, message_id, 'public');

        // อัปเดต is_pinned ใน message store
        updateMessage(message_id, {
          is_pinned: false,
          pinned_at: null
        });
      }
    };

    // Register event listeners
    const unsubPinned = addEventListener(
      'message:message.pinned',
      handleMessagePinned as Parameters<typeof addEventListener>[1]
    );
    const unsubUnpinned = addEventListener(
      'message:message.unpinned',
      handleMessageUnpinned as Parameters<typeof addEventListener>[1]
    );

    console.log('[usePinnedMessageWebSocket] Registered pinned message WebSocket listeners');

    // Cleanup on unmount
    return () => {
      unsubPinned();
      unsubUnpinned();
      console.log('[usePinnedMessageWebSocket] Removed pinned message WebSocket listeners');
    };
  }, [addEventListener, addPinnedMessage, removePinnedMessage, updateMessage]);
}

export default usePinnedMessageWebSocket;
