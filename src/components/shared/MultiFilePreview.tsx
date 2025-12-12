/**
 * MultiFilePreview Component
 * แสดง preview ของหลายไฟล์ก่อนส่ง พร้อม caption input
 */

import React, { useState, useEffect } from 'react'
import { X, Image as ImageIcon, Video, File, Loader2, Clock } from 'lucide-react'
import { getFileCategory, getFileIcon } from '@/utils/file/fileTypeDetection'
import { formatFileSize } from '@/utils/video/videoValidation'
import type { BulkUploadProgress } from '@/types/album.types'
import { format, addMinutes } from 'date-fns'
import { th } from 'date-fns/locale'
import { DateTimePickerInline } from '@/components/ui/date-time-picker'
import { Button } from '@/components/ui/button'

interface MultiFilePreviewProps {
  files: File[]
  onRemove: (index: number) => void
  onCaptionChange: (caption: string) => void
  onSend: (caption: string) => void
  onSchedule?: (caption: string, scheduledAt: Date) => void // 🆕 Schedule callback
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
  onSchedule,
  onCancel,
  uploading = false,
  uploadProgress,
  initialCaption = '' // 🆕 Default to empty string
}) => {
  const [caption, setCaption] = useState(initialCaption) // 🆕 Initialize with initialCaption
  const [previews, setPreviews] = useState<Record<number, string>>({})
  const [showSchedule, setShowSchedule] = useState(false) // 🆕 Toggle schedule picker
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined)

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

  // 🆕 Handle schedule send
  const handleScheduleSend = () => {
    if (scheduledDate && onSchedule) {
      onSchedule(caption, scheduledDate)
      setShowSchedule(false)
      setScheduledDate(undefined)
    }
  }

  // Min date for schedule picker (1 minute from now)
  const minDate = addMinutes(new Date(), 1)

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

  // Responsive grid: 5 columns on mobile, 8 on desktop
  const gridClass = 'grid-cols-5 md:grid-cols-8'

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
          placeholder="ข้อความ..."
          value={caption}
          onChange={(e) => handleCaptionChange(e.target.value)}
          onKeyDown={(e) => {
            // ✅ Enter = Send (ถ้าไม่ได้กด Shift)
            if (e.key === 'Enter' && !e.shiftKey && !uploading && files.length > 0 && !showSchedule) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={uploading}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          autoFocus
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

      {/* 🆕 Schedule Picker */}
      {showSchedule && onSchedule && (
        <div className="mb-4 p-4 border border-border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              ตั้งเวลาส่ง
            </h4>
            <button
              onClick={() => {
                setShowSchedule(false)
                setScheduledDate(undefined)
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <DateTimePickerInline
            date={scheduledDate}
            setDate={setScheduledDate}
            minDate={minDate}
          />
          {scheduledDate && (
            <div className="mt-3 p-2 bg-accent/50 rounded text-sm">
              จะส่งเมื่อ{' '}
              <strong>
                {format(scheduledDate, "d MMM yyyy 'เวลา' HH:mm น.", { locale: th })}
              </strong>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              onClick={handleScheduleSend}
              disabled={!scheduledDate}
              className="flex-1"
            >
              <Clock className="w-4 h-4 mr-2" />
              ตั้งเวลาส่ง
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowSchedule(false)
                setScheduledDate(undefined)
              }}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSend}
          disabled={uploading || files.length === 0 || showSchedule}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            `ส่ง ${files.length} ไฟล์`
          )}
        </button>

        {/* 🆕 Schedule Button */}
        {onSchedule && !uploading && !showSchedule && (
          <button
            onClick={() => setShowSchedule(true)}
            disabled={files.length === 0}
            className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted flex items-center gap-2 disabled:opacity-50"
            title="ตั้งเวลาส่ง"
          >
            <Clock className="w-4 h-4" />
          </button>
        )}

        {!uploading && !showSchedule && (
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted"
          >
            ยกเลิก
          </button>
        )}
      </div>
    </div>
  )
}
