import { useMessageSearch } from '@/hooks/useMessageSearch';
import { SearchResultItem } from './SearchResultItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';

interface SearchResultsProps {
  query: string;
  onSelectMessage: () => void;
}

export function SearchResults({ query, onSelectMessage }: SearchResultsProps) {
  const navigate = useNavigate();
  const {
    results,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useMessageSearch(query);

  const handleSelectMessage = (messageId: string, conversationId: string) => {
    // Navigate to conversation and jump to message
    navigate(`/chat/${conversationId}?target=${messageId}`);
    onSelectMessage();
  };

  if (!query || query.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Type at least 2 characters to search
        </p>
      </div>
    );
  }

  if (isFetching && !isFetchingNextPage) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-3">Searching...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          No messages found for "{query}"
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px] px-4">
      <div className="space-y-2 pb-4">
        {results.map((result) => (
          <SearchResultItem
            key={result.id}
            message={result}
            query={query}
            onClick={() =>
              handleSelectMessage(result.id, result.conversation_id)
            }
          />
        ))}

        {/* Load More */}
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
    </ScrollArea>
  );
}
