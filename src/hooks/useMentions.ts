import { useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { getMyMentions } from '@/services/mentionService';
import type { GetMentionsParams, Mention } from '@/types/mention.types';

type MentionsResponse = { mentions: Mention[]; cursor: string | null; has_more: boolean };

export function useMentions() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    error,
    refetch,
  } = useInfiniteQuery<
    MentionsResponse,
    Error,
    InfiniteData<MentionsResponse>,
    string[],
    string | undefined
  >({
    queryKey: ['mentions'],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const params: GetMentionsParams = {
        limit: 20,
        cursor: pageParam,
        direction: 'before',
      };

      const response = await getMyMentions(params);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.has_more ? lastPage.cursor || undefined : undefined;
    },
    staleTime: 30000, // 30 seconds
    initialPageParam: undefined,
  });

  const mentions: Mention[] = data?.pages.flatMap((page) => page.mentions) ?? [];

  return {
    mentions,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetching,
    isFetchingNextPage,
    error,
    refetch,
  };
}
