// src/hooks/useAlbumRenderer.tsx
import { useMemo, useState, useCallback } from 'react';
import type { MessageDTO } from '@/types/message.types';
import { AlbumMessage } from '@/components/shared/message/AlbumMessage';
import { AlbumLightbox } from '@/components/shared/AlbumLightbox';
import { groupMessagesByAlbum } from '@/utils/album/albumHelpers';
import { estimateAlbumHeight } from '@/utils/album/albumHeightEstimator';

interface UseAlbumRendererProps {
  messages: MessageDTO[];
  // Display helpers
  isOwnMessage: (message: MessageDTO) => boolean;
  getMessageStatus: (message: MessageDTO, isUser: boolean) => string | undefined;
  renderMessageStatus: (status: string | null) => string | null;
  formatMessageStatus: (status: string | null) => string | null;
  getFormattedSender: (message: MessageDTO, defaultName?: string) => string;
  formatTime: (timestamp: string) => string;
  isBusinessView?: boolean;
  isGroupChat?: boolean;
}

export const useAlbumRenderer = ({
  messages,
  isOwnMessage,
  getMessageStatus,
  renderMessageStatus,
  formatMessageStatus,
  getFormattedSender,
  formatTime,
  isBusinessView,
  isGroupChat
}: UseAlbumRendererProps) => {
  // 📸 Album Lightbox State
  const [albumLightbox, setAlbumLightbox] = useState<{
    isOpen: boolean;
    messages: MessageDTO[];
    initialIndex: number;
  }>({
    isOpen: false,
    messages: [],
    initialIndex: 0
  });

  // Group album messages
  const { grouped: groupedAlbums } = useMemo(() => {
    const result = groupMessagesByAlbum(messages);

    // 🔍 DEBUG: Log album grouping
    if (Object.keys(result.grouped).length > 0) {
      console.log('📸 [Album Debug] Grouped albums:', {
        albumCount: Object.keys(result.grouped).length,
        albums: Object.entries(result.grouped).map(([albumId, messages]) => ({
          albumId: albumId.slice(0, 8),
          messageCount: messages.length,
          positions: messages.map(m => m.metadata?.album_position),
          total: messages[0]?.metadata?.album_total
        })),
        standaloneCount: result.standalone.length
      });
    }

    return result;
  }, [messages]);

  // Render album function
  const renderAlbum = useCallback(
    (albumId: string, albumMessages: MessageDTO[]) => {
      console.log('📸 [Album Debug] renderAlbum called:', {
        albumId: albumId.slice(0, 8),
        messageCount: albumMessages?.length || 0
      });

      if (!albumMessages || albumMessages.length === 0) {
        console.warn('📸 [Album Debug] renderAlbum: No messages provided');
        return null;
      }

      const firstMessage = albumMessages[0];
      const isUser = isOwnMessage(firstMessage);
      const messageStatus = getMessageStatus(firstMessage, isUser);
      const status = renderMessageStatus(messageStatus || null);
      const formattedStatus = formatMessageStatus(status) ?? undefined;
      const formattedSender = getFormattedSender(firstMessage, firstMessage.sender_name);

      // ✅ Calculate min-height based on photo count
      const albumTotal = firstMessage.metadata?.album_total || albumMessages.length;
      const minHeight = estimateAlbumHeight(albumTotal);

      console.log('📸 [Album Debug] Rendering AlbumMessage component:', {
        albumId: albumId.slice(0, 8),
        messageCount: albumMessages.length,
        albumTotal,
        minHeight,
        isUser,
        sender: formattedSender
      });

      return (
        <div
          key={`album-${albumId}`}
          data-message-id={firstMessage.id}
          className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 py-1`}
          style={{ minHeight: `${minHeight}px` }} // ✅ Ensure minimum height from initial render
        >
          <div className={`max-w-[70%] grid grid-cols-1`}>
            <AlbumMessage
              albumId={albumId}
              messages={albumMessages}
              isUser={isUser}
              formatTime={formatTime}
              messageStatus={formattedStatus}
              senderName={formattedSender}
              isBusinessView={isBusinessView}
              isGroupChat={isGroupChat}
              onImageClick={(_messageId, imageIndex) => {
                // Open album lightbox instead of single image
                setAlbumLightbox({
                  isOpen: true,
                  messages: albumMessages,
                  initialIndex: imageIndex
                });
              }}
            />
          </div>
        </div>
      );
    },
    [isOwnMessage, getFormattedSender, isBusinessView, isGroupChat, formatTime, getMessageStatus, renderMessageStatus, formatMessageStatus]
  );

  // Lightbox component
  const AlbumLightboxComponent = (
    <AlbumLightbox
      isOpen={albumLightbox.isOpen}
      messages={albumLightbox.messages}
      initialIndex={albumLightbox.initialIndex}
      onClose={() => setAlbumLightbox({ isOpen: false, messages: [], initialIndex: 0 })}
    />
  );

  return {
    groupedAlbums,
    renderAlbum,
    AlbumLightboxComponent
  };
};
