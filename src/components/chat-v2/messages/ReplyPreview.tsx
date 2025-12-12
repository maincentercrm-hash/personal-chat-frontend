/**
 * ReplyPreview - Shows the message being replied to
 *
 * Telegram-style:
 * - Colored left border (green for own, blue/accent for others)
 * - Sender name
 * - Truncated content preview
 * - Click to jump to original message
 */

import { memo } from 'react';
import { Image, FileText, Smile } from 'lucide-react';
import type { ReplyInfoDTO } from '@/types/message.types';
import { cn } from '@/lib/utils';

// ============================================
// Props
// ============================================

interface ReplyPreviewProps {
  /** Reply info from message */
  replyTo: ReplyInfoDTO;

  /** Is this in own message bubble */
  isOwn: boolean;

  /** Click to jump to original message */
  onJumpToMessage?: () => void;
}

// ============================================
// Helpers
// ============================================

function getReplyIcon(messageType: string) {
  switch (messageType) {
    case 'image':
    case 'album':
      return <Image size={14} className="flex-shrink-0" />;
    case 'file':
      return <FileText size={14} className="flex-shrink-0" />;
    case 'sticker':
      return <Smile size={14} className="flex-shrink-0" />;
    default:
      return null;
  }
}

function getReplyContentPreview(replyTo: ReplyInfoDTO): string {
  const { message_type, content } = replyTo;

  switch (message_type) {
    case 'image':
      return content || 'รูปภาพ';
    case 'album':
      return content || 'อัลบั้ม';
    case 'file':
      return content || 'ไฟล์';
    case 'sticker':
      return 'สติกเกอร์';
    case 'video':
      return content || 'วิดีโอ';
    default:
      return content || '';
  }
}

// ============================================
// Component
// ============================================

export const ReplyPreview = memo(function ReplyPreview({
  replyTo,
  isOwn,
  onJumpToMessage,
}: ReplyPreviewProps) {
  const icon = getReplyIcon(replyTo.message_type);
  const preview = getReplyContentPreview(replyTo);
  const senderName = replyTo.sender_name || 'Unknown';

  return (
    <div
      className={cn(
        'flex items-stretch gap-2 mb-1 cursor-pointer',
        'rounded-md overflow-hidden',
        'transition-colors hover:bg-black/5 dark:hover:bg-white/5'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onJumpToMessage?.();
      }}
    >
      {/* Colored bar */}
      <div
        className={cn(
          'w-[3px] flex-shrink-0 rounded-full',
          isOwn
            ? 'bg-[var(--reply-bar-own)]'
            : 'bg-[var(--reply-bar-other)]'
        )}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        {/* Sender name */}
        <div
          className={cn(
            'text-[12px] font-medium truncate',
            isOwn
              ? 'text-[var(--reply-name-own)]'
              : 'text-[var(--reply-name-other)]'
          )}
        >
          {senderName}
        </div>

        {/* Content preview */}
        <div className="flex items-center gap-1 text-[13px] text-muted-foreground truncate">
          {icon}
          <span className="truncate">{preview}</span>
        </div>
      </div>
    </div>
  );
});

export default ReplyPreview;
