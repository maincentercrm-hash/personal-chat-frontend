/**
 * AlbumLightboxV2 Component
 * ✅ NEW FORMAT: Works with album_files array
 * Full-screen image/video viewer with navigation
 */

import React, { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { AlbumFileDTO } from '@/types/message.types'

interface AlbumLightboxV2Props {
  albumFiles: AlbumFileDTO[]
  caption?: string
  initialIndex: number
  isOpen: boolean
  onClose: () => void
}

export const AlbumLightboxV2: React.FC<AlbumLightboxV2Props> = ({
  albumFiles,
  caption,
  initialIndex,
  isOpen,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  // Sort by position
  const sortedFiles = [...albumFiles].sort((a, b) => a.position - b.position)

  // Reset index when props change
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
      prev > 0 ? prev - 1 : sortedFiles.length - 1
    )
  }, [sortedFiles.length])

  const handleNext = useCallback(() => {
    setCurrentIndex(prev =>
      prev < sortedFiles.length - 1 ? prev + 1 : 0
    )
  }, [sortedFiles.length])

  if (!isOpen || sortedFiles.length === 0) return null

  const currentFile = sortedFiles[currentIndex]
  const isVideo = currentFile?.file_type === 'video'
  const isImage = currentFile?.file_type === 'image'
  const mediaUrl = currentFile?.media_url

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          onClick={onClose}
          title="Close (Esc)"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Navigation Buttons */}
        {sortedFiles.length > 1 && (
          <>
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
              onClick={handlePrev}
              title="Previous (←)"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
              onClick={handleNext}
              title="Next (→)"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}

        {/* Media Display */}
        <div className="flex items-center justify-center w-full h-full p-8">
          {isVideo ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="w-full h-full max-w-[80vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
              key={currentFile.id} // Force re-mount on change
            />
          ) : isImage ? (
            <img
              src={mediaUrl}
              alt="รูปภาพขยาย"
              className="w-full h-full max-w-[80vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
          ) : (
            <div className="text-white text-center">
              <p className="text-xl mb-2">File: {currentFile.file_name}</p>
              <p className="text-sm text-gray-400">Type: {currentFile.file_type_ext?.toUpperCase()}</p>
            </div>
          )}
        </div>

        {/* Info Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="max-w-4xl mx-auto">
            {/* Counter */}
            <div className="text-white text-center text-sm mb-2">
              {currentIndex + 1} / {sortedFiles.length}
            </div>

            {/* Caption */}
            {caption && (
              <div className="text-white text-center">
                {caption}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
