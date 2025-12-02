/**
 * AlbumMessageV2 Component
 * ✅ NEW: Works with new Backend API format
 * Renders album from a single message with album_files array
 */

import React, { useMemo } from 'react'
import { Play, FileText } from 'lucide-react'
import type { MessageDTO, AlbumFileDTO } from '@/types/message.types'
import MessageStatusIndicator from './MessageStatusIndicator'
import { linkifyText } from '@/utils/messageTextUtils'
import { getThumbnailUrl } from '@/utils/image/imageTransform'

interface AlbumMessageV2Props {
  message: MessageDTO
  isUser: boolean
  formatTime: (timestamp: string) => string
  messageStatus?: string
  onImageClick?: (messageId: string, imageIndex: number) => void
  isBusinessView?: boolean
  isGroupChat?: boolean
  senderName?: string
}

/**
 * Get grid CSS class based on photo count
 */
const getGridClass = (count: number): string => {
  if (count === 1) return 'album-grid-1'
  if (count === 2) return 'album-grid-2'
  if (count === 3) return 'album-grid-3'
  if (count === 4) return 'album-grid-4'
  if (count === 5) return 'album-grid-5'
  if (count === 6) return 'album-grid-6'
  if (count >= 7 && count <= 9) return 'album-grid-7'
  return 'album-grid-10'
}

export const AlbumMessageV2: React.FC<AlbumMessageV2Props> = ({
  message,
  isUser,
  formatTime,
  messageStatus,
  onImageClick,
  isBusinessView,
  isGroupChat,
  senderName
}) => {
  // ✅ Get album files from the message
  const albumFiles = message.album_files || []
  const caption = message.content

  // ✅ Sort by position (should already be sorted, but just in case)
  const sortedFiles = [...albumFiles].sort((a, b) => a.position - b.position)

  // ✅ แยกไฟล์เป็น media files (image/video) และ document files
  const mediaFiles = sortedFiles.filter(
    file => file.file_type === 'image' || file.file_type === 'video'
  )
  const documentFiles = sortedFiles.filter(
    file => file.file_type === 'file'
  )

  const gridClass = getGridClass(mediaFiles.length)

  // ✅ Linkify caption (convert URLs to clickable links)
  const linkifiedCaption = useMemo(
    () => caption ? linkifyText(caption, 'underline hover:opacity-80 break-all') : null,
    [caption]
  )

  console.log('📸 [AlbumMessageV2] Rendering:', {
    messageId: message.id?.slice(0, 8),
    totalFiles: albumFiles.length,
    mediaFiles: mediaFiles.length,
    documentFiles: documentFiles.length,
    gridClass
  })

  // ✅ Safety check
  if (!albumFiles || albumFiles.length === 0) {
    console.warn('[AlbumMessageV2] No album_files found in message:', message.id)
    return null
  }

  return (
    <>
      <div className="album-message">
        {/* 📷 Media Files Grid (Images/Videos) */}
        {mediaFiles.length > 0 && (
          <div className={`album-grid ${gridClass}`}>
            {mediaFiles.map((file: AlbumFileDTO, index: number) => {
              const isVideo = file.file_type === 'video'
              // ✅ Original URL for lightbox
              const originalUrl = file.media_url || file.media_thumbnail_url || ''

              // ✅ For videos: use backend thumbnail (no transformation)
              // For images: use Cloudflare Image Resizing for optimization
              const thumbnailToDisplay = isVideo
                ? (file.media_thumbnail_url || originalUrl)  // Use backend video thumbnail
                : getThumbnailUrl(originalUrl)  // Use optimized thumbnail for images

              // ✅ Click handler - pass message.id and index to lightbox for navigation
              const handleItemClick = () => {
                if (message.id) {
                  // Pass message.id so lightbox can find album_files and enable navigation
                  onImageClick?.(message.id, index)
                }
              }

              return (
                <div
                  key={file.id || `media-${index}`}
                  className="album-item group cursor-pointer"
                  onClick={handleItemClick}
                >
                  {/* Image/Video Thumbnail - Optimized for chat display */}
                  {originalUrl && (
                    <img
                      src={thumbnailToDisplay}
                      alt=""
                      className="album-thumbnail"
                      loading="lazy"
                    />
                  )}

                  {/* Video Indicator */}
                  {isVideo && (
                    <div className="album-video-indicator">
                      <div className="album-play-icon">
                        <Play className="w-6 h-6 fill-white text-white" />
                      </div>
                      {file.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                          {Math.floor(file.duration / 60)}:{String(Math.floor(file.duration % 60)).padStart(2, '0')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="album-hover-overlay" />
                </div>
              )
            })}
          </div>
        )}

        {/* 📄 Document Files List */}
        {documentFiles.length > 0 && (
          <div className={`space-y-2 ${mediaFiles.length > 0 ? 'mt-2' : ''}`}>
            {documentFiles.map((file: AlbumFileDTO, index: number) => {
              // Format file size
              const formatFileSize = (bytes?: number) => {
                if (!bytes) return 'Unknown size'
                if (bytes < 1024) return `${bytes} B`
                if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
                return `${(bytes / 1024 / 1024).toFixed(1)} MB`
              }

              return (
                <a
                  key={file.id || `doc-${index}`}
                  href={file.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isUser
                      ? 'bg-primary/10 border-primary/20 hover:bg-primary/20'
                      : 'bg-muted border-border hover:bg-muted/80'
                  }`}
                >
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.file_name || 'Unknown file'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {file.file_type_ext && (
                        <span className="uppercase">{file.file_type_ext}</span>
                      )}
                      {file.file_type_ext && file.file_size && <span>·</span>}
                      {file.file_size && (
                        <span>{formatFileSize(file.file_size)}</span>
                      )}
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}

        {/* Caption - แสดงแบบข้อความปกติ (มีฟองข้อความ) */}
        {caption && (
          <div
            className={`rounded-2xl px-4 py-2 border mt-2 ${
              isUser
                ? 'bg-primary text-primary-foreground rounded-tr-none border-transparent'
                : 'bg-card text-card-foreground rounded-tl-none border-border'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap select-text">{linkifiedCaption}</p>
          </div>
        )}
      </div>

      {/* Message metadata: sender name, time, status */}
      <div
        className={`flex items-center mt-1 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}
      >
        {((isGroupChat && !isUser) || (isBusinessView && message.sender_type === 'business')) && (
          <span className="text-muted-foreground text-xs mr-1">
            {senderName} ·
          </span>
        )}
        <span className="text-muted-foreground text-xs mr-1">
          {mediaFiles.length} {mediaFiles.length > 1 ? 'items' : 'item'}
          {documentFiles.length > 0 && (
            <> · {documentFiles.length} {documentFiles.length > 1 ? 'files' : 'file'}</>
          )}
        </span>
        {message.created_at && (
          <>
            <span className="text-muted-foreground text-xs mr-1">·</span>
            <span className="text-muted-foreground text-xs">
              {formatTime(message.created_at)}
            </span>
          </>
        )}
        {isUser && <MessageStatusIndicator status={messageStatus} />}
      </div>
    </>
  )
}
