import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
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

  // Get sender info (Check 'sender' first for search API, fallback to 'sender_info' for other APIs)
  const senderName = message.sender?.display_name || message.sender_name || message.sender_info?.display_name || 'ไม่ทราบชื่อ';
  const senderAvatar = message.sender?.profile_image_url || message.sender_avatar || message.sender_info?.profile_image_url;

  return (
    <div
      className="flex gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
      onClick={onClick}
    >
      {/* Sender Avatar */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={senderAvatar || undefined} />
        <AvatarFallback>
          {senderName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium text-sm">
            {senderName}
          </span>
          <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>

        {/* Message Content with Highlight */}
        <div
          className="text-sm text-muted-foreground line-clamp-2 search-highlight"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    </div>
  );
}
