/**
 * AlbumMessage - Multiple images/videos in vertical stack
 *
 * Simple approach: stack images vertically
 * - Each image keeps its aspect ratio
 * - No complex grid calculations
 * - Similar to LINE/WhatsApp style
 */

import { memo, useState } from 'react';
import { Play } from 'lucide-react';
import type { MessageDTO, AlbumFileDTO } from '@/types/message.types';
import { MessageBubble } from '../MessageItem/MessageBubble';
import { MessageTime } from '../MessageItem/MessageTime';
import { MessageStatus, getMessageStatus } from '../MessageItem/MessageStatus';
import type { MessagePosition } from '../MessageList/types';
import { cn } from '@/lib/utils';

// ============================================
// Constants
// ============================================

const MAX_WIDTH = 280;
const FIXED_HEIGHT = 200; // Fixed height for all images

// ============================================
// Props
// ============================================

interface AlbumMessageProps {
  message: MessageDTO;
  isOwn: boolean;
  position: MessagePosition;
  time: string;
  onMediaClick?: (index: number) => void;
}

// ============================================
// Helpers
// ============================================

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// Album Item Component
// ============================================

interface AlbumItemProps {
  file: AlbumFileDTO;
  index: number;
  isLast: boolean;
  time: string;
  status: ReturnType<typeof getMessageStatus>;
  onClick?: () => void;
}

const AlbumItem = memo(function AlbumItem({
  file,
  index: _index,
  isLast,
  time,
  status,
  onClick,
}: AlbumItemProps) {
  const [loaded, setLoaded] = useState(false);
  const isVideo = file.file_type === 'video';

  return (
    <div
      className="relative cursor-pointer overflow-hidden rounded-lg bg-muted"
      style={{ maxWidth: MAX_WIDTH, height: FIXED_HEIGHT }}
      onClick={onClick}
    >
      {/* Loading skeleton */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Image/Video thumbnail */}
      <img
        src={file.media_thumbnail_url || file.media_url}
        alt=""
        className={cn(
          'w-full h-full object-cover',
          'transition-opacity duration-200',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />

      {/* Video play icon */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
          </div>
        </div>
      )}

      {/* Video duration */}
      {isVideo && file.duration && (
        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[11px] px-1.5 py-0.5 rounded">
          {formatDuration(file.duration)}
        </div>
      )}

      {/* Time & status on last item */}
      {isLast && (
        <div className="absolute bottom-1 right-1 flex items-center gap-0.5 bg-black/50 text-white px-1.5 py-0.5 rounded text-[11px]">
          <span>{time}</span>
          {status && <MessageStatus status={status} className="text-white" />}
        </div>
      )}
    </div>
  );
});

// ============================================
// Main Component
// ============================================

export const AlbumMessage = memo(function AlbumMessage({
  message,
  isOwn,
  position,
  time,
  onMediaClick,
}: AlbumMessageProps) {
  const albumFiles = message.album_files || [];
  const caption = message.content?.trim();
  const status = getMessageStatus(message, isOwn);

  // Filter to only media files
  const mediaFiles = albumFiles.filter(f => f.file_type === 'image' || f.file_type === 'video');

  if (mediaFiles.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
      {/* Stack images vertically */}
      <div className="flex flex-col gap-1">
        {mediaFiles.map((file, idx) => (
          <AlbumItem
            key={file.id}
            file={file}
            index={idx}
            isLast={idx === mediaFiles.length - 1 && !caption}
            time={time}
            status={status}
            onClick={() => onMediaClick?.(idx)}
          />
        ))}
      </div>

      {/* Caption */}
      {caption && (
        <MessageBubble isOwn={isOwn} position={position} className="mt-1">
          <div className="text-[14px] leading-[1.3125] break-words whitespace-pre-wrap">
            {caption}
            <span className="float-right ml-2 mt-[3px] flex items-center gap-0.5">
              <MessageTime time={time} isOwn={isOwn} variant="inline" className="!float-none !ml-0 !mt-0" />
              {status && <MessageStatus status={status} />}
            </span>
          </div>
        </MessageBubble>
      )}
    </div>
  );
});

export default AlbumMessage;
