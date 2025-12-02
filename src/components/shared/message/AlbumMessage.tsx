/**
 * AlbumMessage Component
 * แสดง album (หลายรูป/วิดีโอ) ใน message list
 */

import React from 'react'
import { Play, FileText } from 'lucide-react'
import { sortByAlbumPosition, getGridClass, getAlbumCaption } from '@/utils/album/albumHelpers'
import type { MessageDTO } from '@/types/message.types'
import MessageStatusIndicator from './MessageStatusIndicator'

interface AlbumMessageProps {
  messages: MessageDTO[]
  albumId: string
  isUser: boolean
  formatTime: (timestamp: string) => string
  messageStatus?: string
  onImageClick?: (messageId: string, imageIndex: number) => void
  isBusinessView?: boolean
  isGroupChat?: boolean
  senderName?: string
}

export const AlbumMessage: React.FC<AlbumMessageProps> = ({
  messages,
  albumId,
  isUser,
  formatTime,
  messageStatus,
  onImageClick,
  isBusinessView,
  isGroupChat,
  senderName
}) => {
  const sortedMessages = sortByAlbumPosition(messages)
  const caption = getAlbumCaption(sortedMessages)
  const gridClass = getGridClass(sortedMessages.length)
  const firstMessage = sortedMessages[0]

  console.log('📸 [AlbumMessage] Rendering:', {
    albumId: albumId.slice(0, 8),
    count: sortedMessages.length,
    gridClass
  })

  const handleItemClick = (messageId: string, index: number) => {
    onImageClick?.(messageId, index)
  }

  return (
    <>
      <div className="album-message">
        {/* Album Grid */}
        <div className={`album-grid ${gridClass}`}>
          {sortedMessages.map((msg, index) => {
            const isImage = msg.message_type === 'image'
            const isVideo = msg.message_type === 'video'
            const thumbnailUrl = msg.media_thumbnail_url || msg.media_url

            return (
              <div
                key={msg.id || `album-item-${index}`}
                className="album-item group cursor-pointer"
                onClick={() => handleItemClick(msg.id || '', index)}
              >
                {/* Image/Video Thumbnail */}
                {(isImage || isVideo) && thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="album-thumbnail"
                    loading="lazy"
                  />
                ) : (
                  <div className="album-file-fallback">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                {/* Video Indicator */}
                {isVideo && (
                  <div className="album-video-indicator">
                    <div className="album-play-icon">
                      <Play className="w-6 h-6 fill-white text-white" />
                    </div>
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="album-hover-overlay" />
              </div>
            )
          })}
        </div>

        {/* Caption */}
        {caption && (
          <p className="album-caption">{caption}</p>
        )}
      </div>

      {/* Message metadata: sender name, time, status */}
      <div
        className={`flex items-center mt-1 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}
      >
        {((isGroupChat && !isUser) || (isBusinessView && firstMessage?.sender_type === 'business')) && (
          <span className="text-muted-foreground text-xs mr-1">
            {senderName} ·
          </span>
        )}
        <span className="text-muted-foreground text-xs mr-1">
          {sortedMessages.length} {sortedMessages.length > 1 ? 'items' : 'item'}
        </span>
        {firstMessage?.created_at && (
          <>
            <span className="text-muted-foreground text-xs mr-1">·</span>
            <span className="text-muted-foreground text-xs">
              {formatTime(firstMessage.created_at)}
            </span>
          </>
        )}
        {isUser && <MessageStatusIndicator status={messageStatus} />}
      </div>
    </>
  )
}
