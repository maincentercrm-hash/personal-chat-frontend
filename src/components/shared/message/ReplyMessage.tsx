// src/components/shared/message/ReplyMessage.tsx
import React from 'react';
import type { MessageDTO } from '@/types/message.types';
import MessageStatusIndicator from './MessageStatusIndicator';
import { linkifyText } from '@/utils/messageTextUtils';


interface ReplyMessageProps {
  message: MessageDTO;
  isUser: boolean;
  formatTime: (timestamp: string) => string;
  messageStatus?: string;
  isBusinessView?: boolean;
  isGroupChat?: boolean;
  senderName?: string;
  onJumpToMessage?: (messageId: string) => void; // ✅ Changed from scrollToMessage
}

/**
 * คอมโพเนนต์สำหรับแสดงข้อความตอบกลับ
 */
const ReplyMessage: React.FC<ReplyMessageProps> = ({
  message,
  isUser,
  formatTime,
  messageStatus,
  isBusinessView,
  isGroupChat,
  senderName,
  onJumpToMessage
}) => {
  // ตรวจสอบว่ามี reply_to_message หรือไม่
  const hasReplyInfo = !!message.reply_to_message;

  // Linkify the message content
  const linkifiedContent = linkifyText(
    message.content,
    isUser ? 'underline hover:opacity-80 break-all' : 'underline hover:opacity-80 break-all'
  );

  return (
    <>
      <div
        className={`rounded-2xl px-4 py-2 border ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-none border-transparent'
            : 'bg-card text-card-foreground rounded-tl-none border-border'
        }`}
      >
        {/* ส่วนข้อความที่ถูกตอบกลับ - แสดงเฉพาะเมื่อมีข้อมูล */}
        {hasReplyInfo && message.reply_to_message && (
          <div
            className={`flex border-l-2 ${
              isUser
                ? 'border-primary-foreground/50 text-primary-foreground/90'
                : 'border-primary/30 text-muted-foreground'
            } pl-2 mb-2 cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={() => message.reply_to_id && onJumpToMessage?.(message.reply_to_id)}
          >
            <div className="overflow-hidden">
              <div className="font-medium  truncate">
                {message.reply_to_message.sender_name || 'User'}
              </div>
              <div className="truncate ">
                {message.reply_to_message.content}
              </div>
            </div>
          </div>
        )}
        
        {/* กรณีมี reply_to_id แต่ไม่มี reply_to_message */}
        {!hasReplyInfo && message.reply_to_id && (
          <div
            className={`flex border-l-2 ${
              isUser
                ? 'border-primary-foreground/50 text-primary-foreground/90'
                : 'border-primary/30 text-muted-foreground'
            } pl-2 mb-2 cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={() => message.reply_to_id && onJumpToMessage?.(message.reply_to_id)}
          >
            <div className="overflow-hidden">
              <div className="truncate ">
                <em>ตอบกลับข้อความ</em>
              </div>
            </div>
          </div>
        )}
        
        {/* ข้อความหลัก */}
        <p className="text-sm whitespace-pre-wrap">{linkifiedContent}</p>
        
        {/* Edit Indicator */}
        {message.is_edited && (
          <div className={` mt-1 opacity-70 ${
            isUser ? 'text-primary-foreground/80' : 'text-muted-foreground'
          }`}>
            <span>แก้ไขแล้ว</span>
            {message.edit_count > 1 && (
              <span> ({message.edit_count} ครั้ง)</span>
            )}
          </div>
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
        <span className="text-muted-foreground text-xs">
          {formatTime(message.is_edited ? message.updated_at : message.created_at)}
        </span>
        {isUser && <MessageStatusIndicator status={messageStatus} />}
      </div>
    </>
  );
};

export default ReplyMessage;