// src/components/shared/message/FileMessage.tsx
import React, { memo } from 'react';
import { FileIcon, Download } from 'lucide-react';
import type { MessageDTO } from '@/types/message.types';
import { formatFileSize } from '@/lib/utils';
import MessageStatusIndicator from './MessageStatusIndicator';


interface FileMessageProps {
  message: MessageDTO;
  isUser: boolean;
  formatTime: (timestamp: string) => string;
  messageStatus?: string;
  isBusinessView?: boolean;
  isGroupChat?: boolean;
  senderName?: string;
}

/**
 * คอมโพเนนต์สำหรับแสดงข้อความประเภทไฟล์
 * ✅ Optimized: memo with custom comparison
 */
const FileMessage: React.FC<FileMessageProps> = memo(({
  message,
  isUser,
  formatTime,
  messageStatus,
  isBusinessView,
  isGroupChat,
  senderName
}) => {


  return (
    <>
      <div
        className={`rounded-lg px-4 py-3 relative group cursor-pointer border ${
          isUser
            ? 'bg-primary text-primary-foreground border-transparent'
            : 'bg-card text-card-foreground border-border'
        }`}
        style={{ minHeight: '55px' }}
        onClick={() => message.media_url && window.open(message.media_url, '_blank')}
      >
        {/* Hover overlay */}
        <div className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center ${
          isUser 
            ? 'bg-black/40' 
            : 'bg-foreground/40'
        }`}>
          <Download size={20} className="text-white mb-1" />
          <span className="text-white  font-medium text-center px-2">
            {message.metadata?.file_name || 'ดาวน์โหลด'}
          </span>
        </div>
        
        {/* เนื้อหาไฟล์ */}
        <div className="flex items-center">
          <div className="mr-3">
            <FileIcon size={24} />
          </div>
          <div>
            <p className="text-sm font-medium">{message.metadata?.file_name}</p>
            <p className=" opacity-70">
              {formatFileSize(message.metadata?.file_size || 0)}
            </p>
          </div>
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
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.media_url === nextProps.message.media_url &&
    prevProps.message.metadata?.file_name === nextProps.message.metadata?.file_name &&
    prevProps.message.metadata?.file_size === nextProps.message.metadata?.file_size &&
    prevProps.messageStatus === nextProps.messageStatus
  );
});

FileMessage.displayName = 'FileMessage';

export default FileMessage;