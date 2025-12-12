/**
 * ImageMessage - Single image message component
 *
 * Features:
 * - Aspect ratio preserved
 * - Max size constraints
 * - Skeleton loading
 * - Click to open lightbox
 * - Caption support
 */

import { memo, useState } from 'react';
import type { MessageDTO } from '@/types/message.types';
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

interface ImageMessageProps {
  /** Message data */
  message: MessageDTO;

  /** Is own message */
  isOwn: boolean;

  /** Position in group */
  position: MessagePosition;

  /** Formatted time string */
  time: string;

  /** Click handler */
  onImageClick?: () => void;
}


// ============================================
// Component
// ============================================

export const ImageMessage = memo(function ImageMessage({
  message,
  isOwn,
  position,
  time,
  onImageClick,
}: ImageMessageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const imageUrl = message.media_url || message.media_thumbnail_url;
  const caption = message.content?.trim();
  const status = getMessageStatus(message, isOwn);

  // Image container - fixed height for all images
  const imageContent = (
    <div
      className="relative cursor-pointer overflow-hidden rounded-lg bg-muted"
      style={{ maxWidth: MAX_WIDTH, height: FIXED_HEIGHT }}
      onClick={onImageClick}
    >
      {/* Skeleton placeholder */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Failed to load</span>
        </div>
      )}

      {/* Image */}
      {imageUrl && !error && (
        <img
          src={imageUrl}
          alt=""
          className={cn(
            'w-full h-full object-cover',
            'transition-opacity duration-200',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
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

  // With caption: bubble with image + text
  if (caption) {
    return (
      <div className={cn('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
        {/* Image bubble */}
        <MessageBubble isOwn={isOwn} position={position} hasMedia>
          {imageContent}
        </MessageBubble>

        {/* Caption bubble */}
        <MessageBubble isOwn={isOwn} position="last">
          <div className="text-[14px] leading-[1.3125] break-words whitespace-pre-wrap">
            {caption}
            <span className="float-right ml-2 mt-[3px] flex items-center gap-0.5">
              <MessageTime time={time} isOwn={isOwn} variant="inline" className="!float-none !ml-0 !mt-0" />
              {status && <MessageStatus status={status} />}
            </span>
          </div>
        </MessageBubble>
      </div>
    );
  }

  // No caption: just image bubble
  return (
    <MessageBubble isOwn={isOwn} position={position} hasMedia>
      {imageContent}
    </MessageBubble>
  );
});

export default ImageMessage;
