/**
 * StickerMessage - Sticker message component
 *
 * Features:
 * - Fixed size (160x160)
 * - No bubble background
 * - GIF support with visibility detection
 * - Fallback for failed loads
 */

import { memo, useState, useRef, useEffect } from 'react';
import type { MessageDTO } from '@/types/message.types';
import { MessageTime } from '../MessageItem/MessageTime';
import { MessageStatus, getMessageStatus } from '../MessageItem/MessageStatus';
import { cn } from '@/lib/utils';

// ============================================
// Constants
// ============================================

const STICKER_SIZE = 120; // Telegram-style size

// ============================================
// Props
// ============================================

interface StickerMessageProps {
  /** Message data */
  message: MessageDTO;

  /** Is own message */
  isOwn: boolean;

  /** Formatted time string */
  time: string;
}

// ============================================
// Component
// ============================================

export const StickerMessage = memo(function StickerMessage({
  message,
  isOwn,
  time,
}: StickerMessageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const stickerUrl = message.media_url || message.sticker_url || message.media_thumbnail_url;
  const status = getMessageStatus(message, isOwn);

  // Check if URL is a GIF
  const isGif = stickerUrl?.toLowerCase().includes('.gif') || false;

  // Visibility detection for GIF optimization
  useEffect(() => {
    if (!isGif || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [isGif]);

  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}
    >
      {/* Sticker container */}
      <div
        className="relative"
        style={{ width: STICKER_SIZE, height: STICKER_SIZE }}
      >
        {/* Loading skeleton */}
        {!loaded && !error && (
          <div className="absolute inset-0 bg-muted/50 animate-pulse rounded-lg" />
        )}

        {/* Error fallback */}
        {error && (
          <div className="absolute inset-0 bg-muted/50 flex items-center justify-center rounded-lg">
            <span className="text-4xl">😶</span>
          </div>
        )}

        {/* Sticker image */}
        {stickerUrl && !error && (
          <img
            src={stickerUrl}
            alt="Sticker"
            className={cn(
              'w-full h-full object-contain',
              'transition-opacity duration-200',
              loaded ? 'opacity-100' : 'opacity-0',
              // Pause GIF when not visible
              isGif && !isVisible && 'invisible'
            )}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        )}
      </div>

      {/* Time + Status */}
      <div className="flex items-center gap-0.5 mt-1 px-1">
        <MessageTime time={time} isOwn={isOwn} variant="block" className="!mt-0 text-muted-foreground" />
        {status && <MessageStatus status={status} className="text-muted-foreground" />}
      </div>
    </div>
  );
});

export default StickerMessage;
