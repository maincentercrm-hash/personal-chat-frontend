import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { Users } from 'lucide-react';
import type { MessageDTO } from '@/types/message.types';
import { highlightSearchQuery } from '@/services/searchService';

interface SearchResultItemProps {
  message: MessageDTO;
  query: string;
  onClick: () => void;
}

export function SearchResultItem({
  message,
  query,
  onClick,
}: SearchResultItemProps) {
  const highlighted = highlightSearchQuery(message.content, query);

  // Get sender info
  const senderName = message.sender_info?.display_name || message.sender?.display_name || message.sender_name || 'ไม่ทราบชื่อ';

  // Get conversation info (Telegram-style)
  const conversation = message.conversation;
  const isGroup = conversation?.type === 'group';

  // Conversation title and icon
  const convTitle = conversation?.title || 'ไม่ทราบ';
  const convIcon = conversation?.icon_url;

  return (
    <div
      className="flex gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors border-b border-border/50 last:border-b-0"
      onClick={onClick}
    >
      {/* Conversation Avatar */}
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={convIcon || undefined} />
        <AvatarFallback className={isGroup ? 'bg-blue-100 text-blue-600' : 'bg-primary/10 text-primary'}>
          {isGroup ? (
            <Users className="h-5 w-5" />
          ) : (
            convTitle.charAt(0).toUpperCase()
          )}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header: Conversation Name + Time */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm truncate">
            {convTitle}
          </span>
          {isGroup && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 flex-shrink-0">
              กลุ่ม
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
              locale: th,
            })}
          </span>
        </div>

        {/* Sender Name (for group chats) */}
        {isGroup && (
          <div className="text-xs text-muted-foreground mb-1">
            <span className="text-primary/80">{senderName}:</span>
          </div>
        )}

        {/* Message Content with Highlight */}
        <div
          className="text-sm text-muted-foreground line-clamp-2 search-highlight"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    </div>
  );
}
