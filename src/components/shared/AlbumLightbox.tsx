/**
 * AlbumLightbox Component
 * Full-screen image/video viewer with navigation
 */

import React, { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { sortByAlbumPosition, getAlbumCaption } from '@/utils/album/albumHelpers'

interface AlbumLightboxProps {
  messages: any[] // MessageDTO[]
  initialIndex: number
  isOpen: boolean
  onClose: () => void
}

export const AlbumLightbox: React.FC<AlbumLightboxProps> = ({
  messages,
  initialIndex,
  isOpen,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const sortedMessages = sortByAlbumPosition(messages)
  const caption = getAlbumCaption(sortedMessages)

  // Reset index when messages change
  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          handlePrev()
          break
        case 'ArrowRight':
          handleNext()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex])

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev =>
      prev > 0 ? prev - 1 : sortedMessages.length - 1
    )
  }, [sortedMessages.length])

  const handleNext = useCallback(() => {
    setCurrentIndex(prev =>
      prev < sortedMessages.length - 1 ? prev + 1 : 0
    )
  }, [sortedMessages.length])

  if (!isOpen || sortedMessages.length === 0) return null

  const currentMessage = sortedMessages[currentIndex]
  const isVideo = currentMessage?.message_type === 'video'
  const mediaUrl = currentMessage?.media_url

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
    >
      <div
        className="lightbox-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          className="lightbox-close"
          onClick={onClose}
          title="Close (Esc)"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Navigation Buttons */}
        {sortedMessages.length > 1 && (
          <>
            <button
              className="lightbox-prev"
              onClick={handlePrev}
              title="Previous (←)"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              className="lightbox-next"
              onClick={handleNext}
              title="Next (→)"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}

        {/* Media Display */}
        <div className="lightbox-media-container">
          {isVideo ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="lightbox-media"
              key={currentMessage.id} // Force re-mount on change
            />
          ) : (
            <img
              src={mediaUrl}
              alt=""
              className="lightbox-media"
            />
          )}
        </div>

        {/* Info Bar */}
        <div className="lightbox-info">
          {/* Counter */}
          <div className="lightbox-counter">
            {currentIndex + 1} / {sortedMessages.length}
          </div>

          {/* Caption */}
          {caption && (
            <div className="lightbox-caption">
              {caption}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
