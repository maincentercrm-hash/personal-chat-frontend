/**
 * Hook สำหรับ upload หลายไฟล์และส่งเป็น album message
 * รองรับ images, videos, files
 * ใช้ Direct Upload to R2 (Presigned URL) สำหรับความเร็วสูง
 */

import { useState, useCallback } from 'react'
import fileService from '@/services/fileService'
import { getFileCategory } from '@/utils/file/fileTypeDetection'
import { generateVideoThumbnail } from '@/utils/video/videoThumbnail'
import type {
  BulkUploadProgress,
  BulkMessageFileItem,
  BulkMessageResponse,
} from '@/types/file.types'

export interface UseBulkUploadOptions {
  conversationId: string
  onProgress?: (progress: BulkUploadProgress) => void
  onSuccess?: (result: BulkMessageResponse['data']) => void
  onError?: (error: Error) => void
}

export interface BulkUploadResult {
  albumId: string
  message: BulkMessageResponse['data'] // ✅ NEW: ส่งกลับ 1 message (album type)
}

export const useBulkUpload = (options: UseBulkUploadOptions) => {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<BulkUploadProgress | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const updateProgress = useCallback((newProgress: BulkUploadProgress) => {
    setProgress(newProgress)
    options.onProgress?.(newProgress)
  }, [options])

  /**
   * Upload single file and return its info for bulk message
   * ใช้ Direct Upload to R2 (Presigned URL)
   */
  const uploadSingleFile = async (
    file: File,
    index: number,
    totalFiles: number
  ): Promise<BulkMessageFileItem> => {
    const category = getFileCategory(file)
    const folder = category === 'image' ? 'photos' : category === 'video' ? 'videos' : 'files'

    let mediaUrl: string
    let thumbnailUrl: string | undefined

    if (category === 'image') {
      // Upload image
      const result = await fileService.uploadSingleFile(file, folder)
      mediaUrl = result.url
      thumbnailUrl = result.url

    } else if (category === 'video') {
      // Generate thumbnail first
      const thumbnailBlob = await generateVideoThumbnail(file, {
        timeInSeconds: 1,
        maxWidth: 640,
        maxHeight: 360,
        quality: 0.8
      })

      // Upload video and thumbnail in parallel
      const [videoResult, thumbResult] = await Promise.all([
        fileService.uploadSingleFile(file, folder),
        fileService.uploadSingleFile(
          new File([thumbnailBlob], 'thumb.jpg', { type: 'image/jpeg' }),
          'thumbnails'
        )
      ])

      mediaUrl = videoResult.url
      thumbnailUrl = thumbResult.url

    } else {
      // Upload other files
      const result = await fileService.uploadSingleFile(file, folder)
      mediaUrl = result.url
    }

    // Update progress (0-70% for uploads)
    const overallProgress = Math.round(((index + 1) / totalFiles) * 70)
    updateProgress({
      stage: 'uploading',
      filesUploaded: index + 1,
      totalFiles,
      currentFile: file.name,
      overallProgress
    })

    return {
      message_type: category === 'image' ? 'image' : category === 'video' ? 'video' : 'file',
      media_url: mediaUrl,
      media_thumbnail_url: thumbnailUrl,
      file_name: file.name, // ✅ เพิ่ม - ชื่อไฟล์ต้นฉบับ
      file_size: file.size  // ✅ เพิ่ม - ขนาดไฟล์ (bytes)
    }
  }

  /**
   * Main upload function
   * Upload หลายไฟล์และส่งเป็น album message
   */
  const uploadFiles = async (files: File[], caption?: string): Promise<BulkUploadResult> => {
    try {
      setUploading(true)
      setError(null)

      // Validation
      const validation = fileService.validateFiles(files)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Stage 1: Validating
      updateProgress({
        stage: 'validating',
        filesUploaded: 0,
        totalFiles: files.length,
        overallProgress: 0
      })

      // Stage 2: Upload all files to R2 (parallel)
      updateProgress({
        stage: 'uploading',
        filesUploaded: 0,
        totalFiles: files.length,
        overallProgress: 5
      })

      const uploadPromises = files.map((file, index) =>
        uploadSingleFile(file, index, files.length)
      )

      const uploadedFiles = await Promise.all(uploadPromises)

      // Stage 3: Create bulk messages
      updateProgress({
        stage: 'creating_messages',
        filesUploaded: files.length,
        totalFiles: files.length,
        overallProgress: 80
      })

      const response = await fileService.sendBulkMessages(
        options.conversationId,
        uploadedFiles,
        caption
      )

      // Stage 4: Complete
      updateProgress({
        stage: 'completed',
        filesUploaded: files.length,
        totalFiles: files.length,
        overallProgress: 100
      })

      // ✅ NEW FORMAT: Backend ส่งกลับ 1 message ที่มี type "album"
      const uploadResult: BulkUploadResult = {
        albumId: response.data.id, // ✅ ใช้ message id
        message: response.data      // ✅ ส่งกลับ album message
      }

      options.onSuccess?.(response.data)
      setUploading(false)

      return uploadResult

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed')
      setError(error)
      updateProgress({
        stage: 'error',
        filesUploaded: 0,
        totalFiles: files.length,
        overallProgress: 0,
        errorMessage: error.message
      })
      options.onError?.(error)
      setUploading(false)
      throw error
    }
  }

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setUploading(false)
    setProgress(null)
    setError(null)
  }, [])

  return {
    uploadFiles,
    uploading,
    progress,
    error,
    reset
  }
}
