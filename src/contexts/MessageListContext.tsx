// src/contexts/MessageListContext.tsx
import { createContext, useContext, type ReactNode } from 'react';
import type { MessageDTO } from '@/types/message.types';

// ========================================
// CONTEXT INTERFACE
// ========================================

export interface MessageListContextValue {
  // Display helpers
  formatTime: (timestamp: string) => string;
  isOwnMessage: (message: MessageDTO) => boolean;
  getMessageStatus: (message: MessageDTO, isUser: boolean) => string | undefined;
  renderMessageStatus: (status: string | null) => string | null;
  formatMessageStatus: (status: string | null) => string | undefined;
  getFormattedSender: (message: MessageDTO, defaultName?: string) => string;

  // Callbacks
  onImageClick?: (imageUrl: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  onReplyMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onResendMessage?: (messageId: string) => void;
  onForwardMessage?: (messageId: string) => void;
  handleCopyMessage: (content: string) => void;

  // Album
  groupedAlbums: Record<string, MessageDTO[]>;
  renderAlbum: (albumId: string, messages: MessageDTO[]) => JSX.Element | null;

  // Height cache
  updateHeightCache: (messageId: string, height: number) => void;
  estimateMessageHeight: (message: MessageDTO) => number;
  USE_HEIGHT_CACHE: React.MutableRefObject<boolean>;
  USE_RESIZE_OBSERVER: React.MutableRefObject<boolean>;

  // Flags
  isBusinessView?: boolean;
  isGroupChat?: boolean;
  currentUserId: string;
}

// ========================================
// CONTEXT CREATION
// ========================================

const MessageListContext = createContext<MessageListContextValue | undefined>(undefined);

// ========================================
// PROVIDER COMPONENT
// ========================================

interface MessageListProviderProps {
  value: MessageListContextValue;
  children: ReactNode;
}

export const MessageListProvider = ({ value, children }: MessageListProviderProps) => {
  return (
    <MessageListContext.Provider value={value}>
      {children}
    </MessageListContext.Provider>
  );
};

// ========================================
// CUSTOM HOOK
// ========================================

export const useMessageListContext = (): MessageListContextValue => {
  const context = useContext(MessageListContext);

  if (context === undefined) {
    throw new Error('useMessageListContext must be used within MessageListProvider');
  }

  return context;
};
