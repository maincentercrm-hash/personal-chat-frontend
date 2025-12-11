// src/hooks/useNoteWebSocket.ts
// Hook สำหรับ listen WebSocket events ของ Note CRUD

import { useEffect } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { useNotesStore } from '@/stores/notesStore';
import type { Note } from '@/types/note.types';
import type { WebSocketEnvelope } from '@/types/user-friendship.types';

interface NoteEventData {
  note_id: string;
  user_id: string;
  conversation_id?: string;
  note?: Note; // Full note data if available
}

/**
 * Hook สำหรับ listen WebSocket events ของ Note:
 * - note.create - เมื่อคนอื่นสร้าง shared note ใน conversation
 * - note.update - เมื่อคนอื่นแก้ไข shared note
 * - note.delete - เมื่อคนอื่นลบ shared note
 */
export function useNoteWebSocket() {
  const { addEventListener } = useWebSocketContext();
  const { handleNoteCreated, handleNoteUpdated, handleNoteDeleted } = useNotesStore();

  useEffect(() => {
    // Handler สำหรับ note.create event
    const handleNoteCreate = (envelope: WebSocketEnvelope<NoteEventData>) => {
      console.log('[useNoteWebSocket] note.create received:', envelope);
      // Backend may send full note in envelope.data.note or just IDs
      if (envelope.data?.note) {
        handleNoteCreated(envelope.data.note);
      }
    };

    // Handler สำหรับ note.update event
    const handleNoteUpdate = (envelope: WebSocketEnvelope<NoteEventData>) => {
      console.log('[useNoteWebSocket] note.update received:', envelope);
      if (envelope.data?.note) {
        handleNoteUpdated(envelope.data.note);
      }
    };

    // Handler สำหรับ note.delete event
    const handleNoteDelete = (envelope: WebSocketEnvelope<NoteEventData>) => {
      console.log('[useNoteWebSocket] note.delete received:', envelope);
      if (envelope.data?.note_id) {
        handleNoteDeleted(envelope.data.note_id);
      }
    };

    // Register event listeners - addEventListener returns cleanup function
    // Use type assertion since our handlers match the expected shape
    const unsubCreate = addEventListener('message:note.create', handleNoteCreate as Parameters<typeof addEventListener>[1]);
    const unsubUpdate = addEventListener('message:note.update', handleNoteUpdate as Parameters<typeof addEventListener>[1]);
    const unsubDelete = addEventListener('message:note.delete', handleNoteDelete as Parameters<typeof addEventListener>[1]);

    console.log('[useNoteWebSocket] Registered note WebSocket listeners');

    // Cleanup on unmount
    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
      console.log('[useNoteWebSocket] Removed note WebSocket listeners');
    };
  }, [addEventListener, handleNoteCreated, handleNoteUpdated, handleNoteDeleted]);
}

export default useNoteWebSocket;
