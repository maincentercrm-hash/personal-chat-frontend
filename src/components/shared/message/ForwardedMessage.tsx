// src/components/shared/message/ForwardedMessage.tsx
import React, { useMemo } from 'react';
import { Forward } from 'lucide-react';
import type { MessageDTO } from '@/types/message.types';
import MessageStatusIndicator from './MessageStatusIndicator';
import { linkifyText } from '@/utils/messageTextUtils';
import { getThumbnailUrl } from '@/utils/image/imageTransform';

interface ForwardedMessageProps {
  message: MessageDTO;
  isUser: boolean;
  formatTime: (timestamp: string) => string;
  messageStatus?: string;
  isBusinessView?: boolean;
  isGroupChat?: boolean;
  senderName?: string;
  onImageClick?: (url: string) => void;
}

/**
 * ForwardedMessage Component
 * แสดงข้อความที่ถูกส่งต่อ (Forwarded Message)
 * คล้ายกับ ReplyMessage แต่สำหรับ forwarded messages
 */
const ForwardedMessage: React.FC<ForwardedMessageProps> = ({
  message,
  isUser,
  formatTime,
  messageStatus,
  isBusinessView,
  isGroupChat,
  senderName,
  onImageClick
}) => {
  // ตรวจสอบว่ามี forwarded_from metadata หรือไม่
  const hasForwardedInfo = message.is_forwarded && message.forwarded_from;

  // Linkify the message content
  const linkifiedContent = useMemo(
    () => linkifyText(
      message.content,
      'underline hover:opacity-80 break-all'
    ),
    [message.content]
  );

  // Format original timestamp
  const originalTimestamp = hasForwardedInfo && message.forwarded_from?.original_timestamp
    ? new Date(message.forwarded_from.original_timestamp).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null;

  // Render content based on message type
  const renderForwardedContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <div className="text-sm whitespace-pre-wrap select-text">
            {linkifiedContent}
          </div>
        );

      case 'image':
        const imageUrl = message.media_url || message.media_thumbnail_url || '';
        const thumbnailUrl = getThumbnailUrl(imageUrl);

        return (
          <div className="mt-2">
            <div className="relative w-full max-w-[200px] rounded-lg overflow-hidden cursor-pointer"
                 onClick={() => onImageClick?.(imageUrl)}
            >
              <img
                src={thumbnailUrl}
                alt="Forwarded image"
                className="w-full h-auto object-cover hover:opacity-90 transition-opacity"
                loading="lazy"
              />
            </div>
            {message.content && (
              <div className="text-sm mt-2 select-text">{linkifiedContent}</div>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="mt-2">
            <a
              href={message.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 p-2 rounded border ${
                isUser
                  ? 'border-primary-foreground/20 hover:bg-primary-foreground/10'
                  : 'border-border hover:bg-muted/50'
              } transition-colors`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {message.file_name || 'File'}
                </div>
                {message.file_size && (
                  <div className="text-xs opacity-70">
                    {(message.file_size / 1024).toFixed(1)} KB
                  </div>
                )}
              </div>
            </a>
            {message.content && (
              <div className="text-sm mt-2 select-text">{linkifiedContent}</div>
            )}
          </div>
        );

      case 'sticker':
        return (
          <div className="mt-2">
            <img
              src={message.sticker_url}
              alt="Sticker"
              className="w-32 h-32 object-contain"
              loading="lazy"
            />
          </div>
        );

      case 'album':
        return (
          <div className="mt-2">
            <div className="text-sm text-muted-foreground">
              📎 Album ({message.album_files?.length || 0} items)
            </div>
            {message.content && (
              <div className="text-sm mt-1 select-text">{linkifiedContent}</div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm select-text">
            {message.content || 'Unsupported message type'}
          </div>
        );
    }
  };

  return (
    <>
      <div
        className={`rounded-2xl px-4 py-2.5 border ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-none border-transparent'
            : 'bg-card text-card-foreground rounded-tl-none border-border'
        }`}
      >
        {/* Forwarded Header */}
        <div
          className={`flex items-center gap-1.5 mb-2 pb-2 border-b ${
            isUser
              ? 'border-primary-foreground/20'
              : 'border-border'
          }`}
        >
          <Forward className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Forwarded</span>
        </div>

        {/* Forwarded Content - with left border accent */}
        <div
          className={`border-l-2 ${
            isUser
              ? 'border-primary-foreground/50'
              : 'border-primary/30'
          } pl-3`}
        >
          {renderForwardedContent()}
        </div>

        {/* Original Sender Info */}
        {hasForwardedInfo && (
          <div className={`mt-2 pt-2 border-t ${
            isUser ? 'border-primary-foreground/20' : 'border-border'
          }`}>
            <div className={`text-xs ${
              isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}>
              From: {
                message.forwarded_from?.sender_name?.trim()
                  ? message.forwarded_from.sender_name.trim()
                  : 'ไม่ทราบชื่อผู้ส่ง'
              }
              {originalTimestamp && (
                <span className="ml-1">• {originalTimestamp}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Message Metadata (sender, time, status) */}
      <div
        className={`flex items-center mt-1 ${
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
        <span className="text-muted-foreground text-xs">
          {formatTime(message.created_at)}
        </span>
        {isUser && <MessageStatusIndicator status={messageStatus} />}
      </div>
    </>
  );
};

export default ForwardedMessage;
