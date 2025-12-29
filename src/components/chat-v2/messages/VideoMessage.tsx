/**
 * VideoMessage - Single video with play button overlay
 *
 * Features:
 * - Thumbnail with play icon
 * - Duration badge
 * - Caption support
 * - Click to play in lightbox
 */

import { memo, useState } from 'react';
import { Play } from 'lucide-react';
import type { MessageDTO } from '@/types/message.types';
import { MessageBubble } from '../MessageItem/MessageBubble';
import { MessageTime } from '../MessageItem/MessageTime';
import { MessageStatus, getMessageStatus } from '../MessageItem/MessageStatus';
import { ForwardedIndicator } from './ForwardedIndicator';
import type { MessagePosition } from '../MessageList/types';
import { cn } from '@/lib/utils';

// ============================================
// Constants
// ============================================

const VIDEO_MAX_WIDTH = 320;
const VIDEO_MAX_HEIGHT = 320;

// ============================================
// Props
// ============================================

interface VideoMessageProps {
  /** Message data */
  message: MessageDTO;

  /** Is own message */
  isOwn: boolean;

  /** Position in group */
  position: MessagePosition;

  /** Formatted time string */
  time: string;

  /** Click handler */
  onVideoClick?: () => void;
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
// Component
// ============================================

export const VideoMessage = memo(function VideoMessage({
  message,
  isOwn,
  position,
  time,
  onVideoClick,
}: VideoMessageProps) {
  const [loaded, setLoaded] = useState(false);

  const thumbnailUrl = message.media_thumbnail_url || message.media_url;
  const caption = message.content?.trim();
  const status = getMessageStatus(message, isOwn);
  const isForwarded = !!message.is_forwarded && !!message.forwarded_from;

  // Get video metadata
  const metadata = message.metadata || {};
  const duration = metadata.duration as number | undefined;
  const width = (metadata.width as number) || VIDEO_MAX_WIDTH;
  const height = (metadata.height as number) || VIDEO_MAX_HEIGHT;

  // Calculate display dimensions
  const aspectRatio = width / height;
  let displayWidth = Math.min(width, VIDEO_MAX_WIDTH);
  let displayHeight = displayWidth / aspectRatio;

  if (displayHeight > VIDEO_MAX_HEIGHT) {
    displayHeight = VIDEO_MAX_HEIGHT;
    displayWidth = displayHeight * aspectRatio;
  }

  // Video thumbnail content
  const videoContent = (
    <div
      className="relative cursor-pointer"
      style={{
        width: displayWidth,
        height: displayHeight,
      }}
      onClick={onVideoClick}
    >
      {/* Loading skeleton */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-[inherit]" />
      )}

      {/* Thumbnail */}
      <img
        src={thumbnailUrl}
        alt=""
        className={cn(
          'w-full h-full object-cover rounded-[inherit]',
          'transition-opacity duration-200',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />

      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
          <Play className="w-7 h-7 text-white fill-white ml-1" />
        </div>
      </div>

      {/* Duration badge */}
      {duration && (
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[11px] px-1.5 py-0.5 rounded">
          {formatDuration(duration)}
        </div>
      )}

      {/* Time overlay (no caption) */}
      {!caption && (
        <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/50 text-white px-1.5 py-0.5 rounded text-[11px]">
          <span>{time}</span>
          {status && <MessageStatus status={status} className="text-white" />}
        </div>
      )}
    </div>
  );

  // With caption or forwarded: single bubble with video + caption together
  if (caption || isForwarded) {
    return (
      <MessageBubble isOwn={isOwn} position={position} hasMedia={!caption}>
        {/* Forwarded indicator */}
        {isForwarded && message.forwarded_from && (
          <div className="px-2 pt-2">
            <ForwardedIndicator forwardedFrom={message.forwarded_from} isOwn={isOwn} />
          </div>
        )}

        {/* Video */}
        {videoContent}

        {/* ✅ FIX: Caption inside the same bubble */}
        {caption && (
          <div className="px-3 py-2 text-[14px] leading-[1.3125] break-words whitespace-pre-wrap">
            {caption}
            <span className="float-right ml-2 mt-[3px] flex items-center gap-0.5">
              <MessageTime time={time} isOwn={isOwn} variant="inline" className="!float-none !ml-0 !mt-0" />
              {status && <MessageStatus status={status} />}
            </span>
          </div>
        )}
      </MessageBubble>
    );
  }

  // No caption and not forwarded
  return (
    <MessageBubble isOwn={isOwn} position={position} hasMedia>
      {videoContent}
    </MessageBubble>
  );
});

export default VideoMessage;
