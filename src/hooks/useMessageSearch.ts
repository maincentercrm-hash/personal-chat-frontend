import { useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { searchMessages } from '@/services/searchService';
import type { SearchMessagesParams } from '@/types/search.types';
import type { MessageDTO } from '@/types/message.types';

type SearchResponse = { messages: MessageDTO[]; query: string; cursor: string | null; has_more: boolean };

export function useMessageSearch(query: string, conversationId?: string) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    error,
    refetch,
  } = useInfiniteQuery<
    SearchResponse,
    Error,
    InfiniteData<SearchResponse>,
    (string | undefined)[],
    string | undefined
  >({
    queryKey: ['messageSearch', query, conversationId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const params: SearchMessagesParams = {
        q: query,
        conversation_id: conversationId,
        limit: 20,
        cursor: pageParam,
        direction: 'before',
      };

      const response = await searchMessages(params);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.has_more ? lastPage.cursor || undefined : undefined;
    },
    enabled: query.length >= 2, // Only search if query >= 2 chars
    staleTime: 30000, // 30 seconds
    initialPageParam: undefined,
  });

  // Handle null messages from API (returns null instead of empty array when no results)
  const results: MessageDTO[] = data?.pages.flatMap((page) => page.messages ?? []) ?? [];

  return {
    results,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetching,
    isFetchingNextPage,
    error,
    refetch,
  };
}
