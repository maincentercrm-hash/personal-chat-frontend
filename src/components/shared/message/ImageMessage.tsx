// src/components/shared/message/ImageMessage.tsx
import React, { useState, memo } from 'react';
import type { MessageDTO } from '@/types/message.types';
import MessageStatusIndicator from './MessageStatusIndicator';
import { getThumbnailUrl } from '@/utils/image/imageTransform';

// ✅ Global cache for loaded images - prevent skeleton flash on re-render
const loadedImagesCache = new Set<string>();


interface ImageMessageProps {
  message: MessageDTO;
  isUser: boolean;
  formatTime: (timestamp: string) => string;
  messageStatus?: string;
  onImageClick: (url: string) => void;
  isBusinessView?: boolean;
  isGroupChat?: boolean;
  senderName?: string;
}

/**
 * คอมโพเนนต์สำหรับแสดงข้อความประเภทรูปภาพ
 * ✅ Optimized: memo + skeleton loader + dimension reservation
 */
const ImageMessage: React.FC<ImageMessageProps> = memo(({
  message,
  isUser,
  formatTime,
  messageStatus,
  onImageClick,
  isBusinessView,
  isGroupChat,
  senderName
}) => {
  // ✅ Original URL for lightbox (full size)
  const [originalUrl] = useState(() => message.media_url || message.media_thumbnail_url || '');

  // ✅ Optimized thumbnail for chat display
  const [thumbnailUrl] = useState(() => getThumbnailUrl(originalUrl));

  const isCached = loadedImagesCache.has(thumbnailUrl);

  const [isLoaded, setIsLoaded] = useState(isCached); // ✅ Start as loaded if cached
  const [hasError, setHasError] = useState(false);

  return (
    <>
      <div className="max-w-[240px]">
        <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: '4/3', minHeight: '180px' }}>
          {/* Skeleton loader */}
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
              <svg className="w-10 h-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Actual image - use optimized thumbnail */}
          <img
            src={thumbnailUrl}
            alt="Image"
            className={`w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            decoding="async"
            onLoad={() => {
              setIsLoaded(true);
              loadedImagesCache.add(thumbnailUrl); // ✅ Cache it
            }}
            onError={() => {
              setHasError(true);
              setIsLoaded(true);
            }}
            onClick={() => originalUrl && onImageClick(originalUrl)}
          />

          {/* Error state */}
          {hasError && (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs">Failed to load</p>
              </div>
            </div>
          )}
        </div>

        {message.content && (
          <p className="text-sm mt-1 text-foreground">{message.content}</p>
        )}
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
    prevProps.messageStatus === nextProps.messageStatus &&
    prevProps.message.content === nextProps.message.content
  );
});

ImageMessage.displayName = 'ImageMessage';

export default ImageMessage;