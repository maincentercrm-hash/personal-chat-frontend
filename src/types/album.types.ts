/**
 * Album-related type definitions
 * For multi-file messages (Telegram-like)
 */

export interface AlbumMetadata {
  album_id: string
  album_position: number
  album_total: number
  album_caption?: string
}

export interface BulkMessageItem {
  message_type: 'image' | 'video' | 'file'
  media_url: string
  media_thumbnail_url?: string
}

export interface BulkMessageRequest {
  caption?: string
  messages: BulkMessageItem[]
}

export interface BulkMessageResponse {
  success: boolean
  album_id: string
  messages: any[] // MessageDTO[]
}

export interface BulkUploadProgress {
  stage: 'validating' | 'uploading' | 'creating_messages' | 'completed' | 'error'
  filesUploaded: number
  totalFiles: number
  currentFile?: string
  overallProgress: number // 0-100
}

export interface BulkUploadResult {
  albumId: string
  messages: any[] // MessageDTO[]
}

export interface UploadedFileInfo {
  media_url: string
  media_thumbnail_url?: string
  message_type: 'image' | 'video' | 'file'
}
