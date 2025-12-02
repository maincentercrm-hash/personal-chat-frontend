/**
 * MultiFilePreview Component
 * แสดง preview ของหลายไฟล์ก่อนส่ง พร้อม caption input
 */

import React, { useState, useEffect } from 'react'
import { X, Image as ImageIcon, Video, File, Loader2 } from 'lucide-react'
import { getFileCategory, getFileIcon } from '@/utils/file/fileTypeDetection'
import { formatFileSize } from '@/utils/video/videoValidation'
import type { BulkUploadProgress } from '@/types/album.types'

interface MultiFilePreviewProps {
  files: File[]
  onRemove: (index: number) => void
  onCaptionChange: (caption: string) => void
  onSend: (caption: string) => void
  onCancel: () => void
  uploading?: boolean
  uploadProgress?: BulkUploadProgress | null
  initialCaption?: string // 🆕 Auto-fill caption from message input
}

export const MultiFilePreview: React.FC<MultiFilePreviewProps> = ({
  files,
  onRemove,
  onCaptionChange,
  onSend,
  onCancel,
  uploading = false,
  uploadProgress,
  initialCaption = '' // 🆕 Default to empty string
}) => {
  const [caption, setCaption] = useState(initialCaption) // 🆕 Initialize with initialCaption
  const [previews, setPreviews] = useState<Record<number, string>>({})

  // 🆕 Update caption when initialCaption changes
  useEffect(() => {
    if (initialCaption) {
      setCaption(initialCaption)
      onCaptionChange(initialCaption) // Notify parent
    }
  }, [initialCaption, onCaptionChange])

  // ✅ แยกไฟล์เป็น media files (image/video) และ document files (อื่นๆ)
  const mediaFiles = files.map((file, index) => ({ file, index }))
    .filter(({ file }) => {
      const category = getFileCategory(file)
      return category === 'image' || category === 'video'
    })

  const documentFiles = files.map((file, index) => ({ file, index }))
    .filter(({ file }) => {
      const category = getFileCategory(file)
      return category !== 'image' && category !== 'video'
    })

  // Generate image previews
  useEffect(() => {
    const newPreviews: Record<number, string> = {}

    files.forEach((file, index) => {
      const category = getFileCategory(file)
      if (category === 'image' || category === 'video') {
        const url = URL.createObjectURL(file)
        newPreviews[index] = url
      }
    })

    setPreviews(newPreviews)

    // Cleanup
    return () => {
      Object.values(newPreviews).forEach(url => URL.revokeObjectURL(url))
    }
  }, [files])

  const handleCaptionChange = (value: string) => {
    setCaption(value)
    onCaptionChange(value)
  }

  const handleSend = () => {
    onSend(caption)
  }

  const getFileTypeIcon = (file: File) => {
    const category = getFileCategory(file)
    switch (category) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />
      case 'video':
        return <Video className="w-4 h-4" />
      default:
        return <File className="w-4 h-4" />
    }
  }

  // Responsive grid: 3 columns on mobile, 5 on desktop
  const gridClass = 'grid-cols-3 md:grid-cols-5'

  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">
          {files.length} file{files.length > 1 ? 's' : ''} selected
        </h3>
        {!uploading && (
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="max-h-[500px] overflow-y-auto mb-4 space-y-4">
        {/* 📷 Media Files Grid (Images/Videos) */}
        {mediaFiles.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Media ({mediaFiles.length})
            </h4>
            <div className={`grid ${gridClass} gap-3`}>
              {mediaFiles.map(({ file, index }) => {
                const category = getFileCategory(file)
                const preview = previews[index]

                return (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden bg-muted border border-border"
                    style={{ aspectRatio: '1 / 1', maxHeight: '200px' }}
                  >
                    {/* Preview */}
                    {preview ? (
                      category === 'video' ? (
                        <div className="relative w-full h-full">
                          <video
                            src={preview}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Video className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={preview}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : null}

                    {/* Remove button */}
                    {!uploading && (
                      <button
                        onClick={() => onRemove(index)}
                        className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    {/* File info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 flex items-center gap-2">
                      {getFileTypeIcon(file)}
                      <span className="truncate flex-1">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 📄 Document Files List (PDFs, DOCs, etc.) */}
        {documentFiles.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <File className="w-4 h-4" />
              Documents ({documentFiles.length})
            </h4>
            <div className="space-y-2">
              {documentFiles.map(({ file, index }) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted border border-border rounded-lg hover:bg-muted/80 transition-colors group"
                >
                  {/* File Icon */}
                  <div className="flex-shrink-0 text-4xl">
                    {getFileIcon(file)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  {/* Remove button */}
                  {!uploading && (
                    <button
                      onClick={() => onRemove(index)}
                      className="flex-shrink-0 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Caption Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Add a caption..."
          value={caption}
          onChange={(e) => handleCaptionChange(e.target.value)}
          disabled={uploading}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Upload Progress */}
      {uploading && uploadProgress && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {uploadProgress.stage === 'uploading' && `Uploading ${uploadProgress.currentFile}...`}
              {uploadProgress.stage === 'creating_messages' && 'Creating album...'}
              {uploadProgress.stage === 'completed' && 'Completed!'}
              {uploadProgress.stage === 'error' && 'Upload failed'}
            </span>
            <span className="text-foreground font-medium">
              {uploadProgress.overallProgress}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress.overallProgress}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {uploadProgress.filesUploaded} / {uploadProgress.totalFiles} files uploaded
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSend}
          disabled={uploading || files.length === 0}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            `Send ${files.length} file${files.length > 1 ? 's' : ''}`
          )}
        </button>

        {!uploading && (
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
