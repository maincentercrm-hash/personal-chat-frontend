/**
 * FileMessage - File attachment message component
 *
 * Features:
 * - File icon based on type
 * - File name + size display
 * - Download on click
 * - Progress indicator (future)
 */

import { memo } from 'react';
import { File, FileText, FileImage, FileVideo, FileAudio, FileArchive, Download } from 'lucide-react';
import type { MessageDTO } from '@/types/message.types';
import { MessageBubble } from '../MessageItem/MessageBubble';
import { MessageTime } from '../MessageItem/MessageTime';
import { MessageStatus, getMessageStatus } from '../MessageItem/MessageStatus';
import { ForwardedIndicator } from './ForwardedIndicator';
import type { MessagePosition } from '../MessageList/types';
import { cn } from '@/lib/utils';

// ============================================
// Props
// ============================================

interface FileMessageProps {
  /** Message data */
  message: MessageDTO;

  /** Is own message */
  isOwn: boolean;

  /** Position in group */
  position: MessagePosition;

  /** Formatted time string */
  time: string;
}

// ============================================
// Helpers
// ============================================

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileIcon(fileName: string, fileType?: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const type = fileType?.toLowerCase() || '';

  // Images
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return FileImage;
  }

  // Videos
  if (type.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return FileVideo;
  }

  // Audio
  if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return FileAudio;
  }

  // Documents
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return FileText;
  }

  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return FileArchive;
  }

  return File;
}

function getFileExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toUpperCase() || '';
  return ext.length <= 4 ? ext : '';
}

// ============================================
// Component
// ============================================

export const FileMessage = memo(function FileMessage({
  message,
  isOwn,
  position,
  time,
}: FileMessageProps) {
  const fileName = message.file_name || message.metadata?.file_name as string || 'Unknown file';
  const fileSize = message.file_size || message.metadata?.file_size as number;
  const fileType = message.file_type || message.metadata?.file_type as string;
  const fileUrl = message.media_url || message.file_url;
  const status = getMessageStatus(message, isOwn);
  const isForwarded = !!message.is_forwarded && !!message.forwarded_from;

  const FileIcon = getFileIcon(fileName, fileType);
  const fileExt = getFileExtension(fileName);

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <MessageBubble isOwn={isOwn} position={position}>
      {/* Forwarded indicator */}
      {isForwarded && message.forwarded_from && (
        <ForwardedIndicator forwardedFrom={message.forwarded_from} isOwn={isOwn} />
      )}

      <div
        className="flex items-center gap-3 cursor-pointer group min-w-[200px]"
        onClick={handleDownload}
      >
        {/* File icon with extension badge */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            isOwn ? 'bg-[var(--bubble-own-text)]/10' : 'bg-primary/10'
          )}>
            <FileIcon className={cn(
              'w-6 h-6',
              isOwn ? 'text-[var(--bubble-own-text)]/70' : 'text-primary'
            )} />
          </div>

          {/* Extension badge */}
          {fileExt && (
            <span className={cn(
              'absolute -bottom-1 -right-1 text-[9px] font-medium px-1 rounded',
              isOwn
                ? 'bg-[var(--bubble-own-text)]/80 text-[var(--bubble-own-bg)]'
                : 'bg-primary text-white'
            )}>
              {fileExt}
            </span>
          )}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium truncate pr-2">
            {fileName}
          </p>
          <p className={cn(
            'text-[12px]',
            isOwn ? 'text-[var(--bubble-own-time)]' : 'text-muted-foreground'
          )}>
            {formatFileSize(fileSize)}
          </p>
        </div>

        {/* Download indicator */}
        <div className={cn(
          'opacity-0 group-hover:opacity-100 transition-opacity',
          isOwn ? 'text-[var(--bubble-own-time)]' : 'text-muted-foreground'
        )}>
          <Download className="w-5 h-5" />
        </div>
      </div>

      {/* Time + Status */}
      <div className="flex justify-end items-center gap-0.5 mt-1">
        <MessageTime time={time} isOwn={isOwn} variant="block" className="!mt-0" />
        {status && <MessageStatus status={status} />}
      </div>
    </MessageBubble>
  );
});

export default FileMessage;
