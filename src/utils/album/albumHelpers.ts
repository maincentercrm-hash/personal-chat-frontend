/**
 * Album helper utilities
 * Functions for grouping messages and determining grid layouts
 */

import type { AlbumMetadata } from '@/types/album.types'

/**
 * Check if a message is part of an album
 */
export const isAlbumMessage = (metadata: any): boolean => {
  return metadata && typeof metadata.album_id === 'string'
}

/**
 * Get album metadata from message
 */
export const getAlbumMetadata = (metadata: any): AlbumMetadata | null => {
  if (!isAlbumMessage(metadata)) return null

  return {
    album_id: metadata.album_id,
    album_position: metadata.album_position || 0,
    album_total: metadata.album_total || 1,
    album_caption: metadata.album_caption
  }
}

/**
 * Group messages by album_id
 * Returns grouped albums and standalone messages
 */
export const groupMessagesByAlbum = (messages: any[]) => {
  const grouped: Record<string, any[]> = {}
  const standalone: any[] = []

  messages.forEach(msg => {
    const albumId = msg.metadata?.album_id
    if (albumId) {
      if (!grouped[albumId]) {
        grouped[albumId] = []
      }
      grouped[albumId].push(msg)
    } else {
      standalone.push(msg)
    }
  })

  return { grouped, standalone }
}

/**
 * Sort album messages by position
 */
export const sortByAlbumPosition = (messages: any[]): any[] => {
  return [...messages].sort((a, b) => {
    const posA = a.metadata?.album_position || 0
    const posB = b.metadata?.album_position || 0
    return posA - posB
  })
}

/**
 * Get CSS grid class based on number of items
 */
export const getGridClass = (count: number): string => {
  switch (count) {
    case 1:
      return 'album-grid-1'
    case 2:
      return 'album-grid-2'
    case 3:
      return 'album-grid-3'
    case 4:
      return 'album-grid-4'
    case 5:
    case 6:
      return 'album-grid-5-6'
    case 7:
    case 8:
    case 9:
    case 10:
      return 'album-grid-7-10'
    default:
      return 'album-grid-1'
  }
}

/**
 * Get album caption from messages
 */
export const getAlbumCaption = (messages: any[]): string | undefined => {
  const firstMessage = messages.find(msg => msg.metadata?.album_position === 0)
  return firstMessage?.metadata?.album_caption
}
