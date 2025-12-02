import { useMentions } from '@/hooks/useMentions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, AtSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import type { Mention } from '@/types/mention.types';

export function MentionsPage() {
  const navigate = useNavigate();
  const {
    mentions,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useMentions();

  const handleClickMention = (mention: Mention) => {
    navigate(
      `/chat/${mention.message.conversation_id}?target=${mention.message_id}`
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AtSign className="h-6 w-6" />
          Mentions
        </h1>
        <p className="text-sm text-muted-foreground">
          Messages where you were mentioned
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {isFetching && mentions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : mentions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AtSign className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No mentions yet</p>
            <p className="text-sm text-muted-foreground">
              When someone mentions you, it will appear here
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {mentions.map((mention) => (
              <div
                key={mention.id}
                className="flex gap-3 p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handleClickMention(mention)}
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage
                    src={mention.message.sender?.profile_image_url || undefined}
                  />
                  <AvatarFallback>
                    {mention.message.sender?.display_name
                      ?.charAt(0)
                      .toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm">
                      {mention.message.sender?.display_name || 'Unknown'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {mention.message.conversation.title}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                      {formatDistanceToNow(new Date(mention.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {mention.message.content}
                  </p>
                </div>
              </div>
            ))}

            {hasNextPage && (
              <div className="pt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
