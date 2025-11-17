// src/components/shared/message/StickerMessage.tsx
import React, { useState, useEffect, useRef, memo } from 'react';
import type { MessageDTO } from '@/types/message.types';
import MessageStatusIndicator from './MessageStatusIndicator';

// ✅ Global cache for loaded stickers - prevent skeleton flash on re-render
const loadedStickersCache = new Set<string>();


interface StickerMessageProps {
  message: MessageDTO;
  isUser: boolean;
  formatTime: (timestamp: string) => string;
  messageStatus?: string;
  isBusinessView?: boolean;
  isGroupChat?: boolean;
  senderName?: string;
}

/**
 * คอมโพเนนต์สำหรับแสดงข้อความประเภทสติกเกอร์
 * ✅ Optimized for GIF performance:
 * - Intersection Observer to pause GIF when out of viewport
 * - Lazy loading with skeleton
 * - Memo with custom comparison
 */
const StickerMessage: React.FC<StickerMessageProps> = memo(({
  message,
  isUser,
  formatTime,
  messageStatus,
  isBusinessView,
  isGroupChat,
  senderName
}) => {
  // ✅ Stabilize URL to prevent re-fetching on re-render
  const [stickerUrl] = useState(() => message.media_url || message.media_thumbnail_url || '');
  const isCached = loadedStickersCache.has(stickerUrl);

  const [isLoaded, setIsLoaded] = useState(isCached); // ✅ Start as loaded if cached
  const [isVisible, setIsVisible] = useState(true); // ✅ Default visible
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer to pause GIF when out of viewport
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      {
        rootMargin: '50px', // Start loading slightly before entering viewport
        threshold: 0.1
      }
    );

    observer.observe(img);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div className="w-[120px] h-[120px]">
        <div className="relative w-full h-full">
          {/* Skeleton loader */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />
          )}

          {/* Sticker image - use stabilized URL */}
          <img
            ref={imgRef}
            src={stickerUrl}
            alt="Sticker"
            className={`w-full h-full object-contain transition-opacity duration-200 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              width: '120px',
              height: '120px',
              // Show/hide based on visibility
              visibility: isVisible ? 'visible' : 'hidden'
            }}
            loading="lazy"
            decoding="async"
            onLoad={() => {
              setIsLoaded(true);
              loadedStickersCache.add(stickerUrl); // ✅ Cache it
            }}
          />

        </div>
      </div>
      <div
        className={`flex items-center  mt-1 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}
      >
        {/* แสดงชื่อผู้ส่งในกรณีต่อไปนี้:
            1. แชทกลุ่มและไม่ใช่ข้อความของตัวเอง
            2. หรือเป็นข้อความจากธุรกิจ (Business View) */}
        {((isGroupChat && !isUser) || (isBusinessView && message.sender_type === 'business')) && (
          <span className="text-muted-foreground text-xs mr-1">
            {senderName} ·
          </span>
        )}
        <span className="text-muted-foreground text-xs">{formatTime(message.created_at)}</span>
        {isUser && <MessageStatusIndicator status={messageStatus} />}
      </div>
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memo performance
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.media_url === nextProps.message.media_url &&
    prevProps.messageStatus === nextProps.messageStatus
  );
});

StickerMessage.displayName = 'StickerMessage';

export default StickerMessage;