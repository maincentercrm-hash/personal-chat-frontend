import apiService from './apiService';
import { SEARCH_API } from '@/constants/api/standardApiConstants';
import type {
  SearchMessagesParams,
  SearchMessagesResponse,
} from '@/types/search.types';

/**
 * Search messages across conversations
 */
export async function searchMessages(
  params: SearchMessagesParams
): Promise<SearchMessagesResponse> {
  const queryParams = new URLSearchParams({
    q: params.q,
    limit: (params.limit || 20).toString(),
  });

  if (params.conversation_id) {
    queryParams.append('conversation_id', params.conversation_id);
  }

  if (params.cursor) {
    queryParams.append('cursor', params.cursor);
    queryParams.append('direction', params.direction || 'before');
  }

  const response = await apiService.get<SearchMessagesResponse>(
    `${SEARCH_API.SEARCH_MESSAGES}?${queryParams.toString()}`
  );

  return response;
}

/**
 * Highlight search query in text (Frontend-side implementation)
 * @param text - The text to highlight
 * @param query - The search query
 * @returns HTML string with <mark> tags around matches
 */
export function highlightSearchQuery(text: string, query: string): string {
  if (!query || !text) return text;

  // Escape special regex characters
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Create regex for case-insensitive matching
  const regex = new RegExp(`(${escapedQuery})`, 'gi');

  // Replace matches with <mark> tag
  return text.replace(regex, '<mark>$1</mark>');
}

export const searchService = {
  searchMessages,
  highlightSearchQuery,
};

export default searchService;
