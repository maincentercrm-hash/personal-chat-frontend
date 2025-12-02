// src/contexts/MessageSelectionContext.tsx
// Context for managing message selection state (multi-select for forward/delete)

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface MessageSelectionContextValue {
  // Selection state
  isSelectionMode: boolean;
  selectedMessageIds: string[];

  // Actions
  enterSelectionMode: (initialMessageId: string) => void;
  exitSelectionMode: () => void;
  toggleMessageSelection: (messageId: string) => void;
  selectAllMessages: (messageIds: string[]) => void;
  clearSelection: () => void;

  // Helpers
  isMessageSelected: (messageId: string) => boolean;
  getSelectedCount: () => number;
}

const MessageSelectionContext = createContext<MessageSelectionContextValue | undefined>(undefined);

interface MessageSelectionProviderProps {
  children: ReactNode;
}

export function MessageSelectionProvider({ children }: MessageSelectionProviderProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);

  // Enter selection mode with initial message
  const enterSelectionMode = useCallback((initialMessageId: string) => {
    console.log('[Selection] 📝 Entering selection mode with:', initialMessageId);
    setIsSelectionMode(true);
    setSelectedMessageIds([initialMessageId]);
  }, []);

  // Exit selection mode and clear selection
  const exitSelectionMode = useCallback(() => {
    console.log('[Selection] ❌ Exiting selection mode');
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
  }, []);

  // Toggle message selection
  const toggleMessageSelection = useCallback((messageId: string) => {
    setSelectedMessageIds((prev) => {
      if (prev.includes(messageId)) {
        const newSelection = prev.filter((id) => id !== messageId);
        console.log('[Selection] ➖ Deselected:', messageId, '| Remaining:', newSelection.length);

        // Exit selection mode if no messages selected
        if (newSelection.length === 0) {
          setIsSelectionMode(false);
        }

        return newSelection;
      } else {
        const newSelection = [...prev, messageId];
        console.log('[Selection] ➕ Selected:', messageId, '| Total:', newSelection.length);
        return newSelection;
      }
    });
  }, []);

  // Select all messages
  const selectAllMessages = useCallback((messageIds: string[]) => {
    console.log('[Selection] ✅ Select all:', messageIds.length, 'messages');
    setSelectedMessageIds(messageIds);
  }, []);

  // Clear selection (but keep selection mode)
  const clearSelection = useCallback(() => {
    console.log('[Selection] 🗑️ Clear selection');
    setSelectedMessageIds([]);
  }, []);

  // Check if message is selected
  const isMessageSelected = useCallback((messageId: string) => {
    return selectedMessageIds.includes(messageId);
  }, [selectedMessageIds]);

  // Get selected count
  const getSelectedCount = useCallback(() => {
    return selectedMessageIds.length;
  }, [selectedMessageIds]);

  const value: MessageSelectionContextValue = {
    isSelectionMode,
    selectedMessageIds,
    enterSelectionMode,
    exitSelectionMode,
    toggleMessageSelection,
    selectAllMessages,
    clearSelection,
    isMessageSelected,
    getSelectedCount,
  };

  return (
    <MessageSelectionContext.Provider value={value}>
      {children}
    </MessageSelectionContext.Provider>
  );
}

export function useMessageSelection() {
  const context = useContext(MessageSelectionContext);
  if (context === undefined) {
    throw new Error('useMessageSelection must be used within MessageSelectionProvider');
  }
  return context;
}
