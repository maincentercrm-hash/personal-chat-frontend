import apiService from './apiService';
import { MENTION_API } from '@/constants/api/standardApiConstants';
import type {
  GetMentionsParams,
  GetMentionsResponse,
  MentionMetadata,
} from '@/types/mention.types';
import type { MessageDTO } from '@/types/message.types';

/**
 * Get my mentions with cursor-based pagination
 */
export async function getMyMentions(
  params: GetMentionsParams = {}
): Promise<GetMentionsResponse> {
  const queryParams = new URLSearchParams({
    limit: (params.limit || 20).toString(),
  });

  if (params.cursor) {
    queryParams.append('cursor', params.cursor);
    queryParams.append('direction', params.direction || 'before');
  }

  const response = await apiService.get<GetMentionsResponse>(
    `${MENTION_API.GET_MY_MENTIONS}?${queryParams.toString()}`
  );

  return response;
}

/**
 * Send a message with mentions
 * @param conversationId - The conversation ID
 * @param content - The message content
 * @param mentions - Array of mention metadata
 * @returns The created message
 */
export async function sendMessageWithMentions(
  conversationId: string,
  content: string,
  mentions: MentionMetadata[]
): Promise<MessageDTO> {
  const response = await apiService.post<{ success: boolean; data: MessageDTO }>(
    `/conversations/${conversationId}/messages`,
    {
      message_type: 'text',
      content,
      metadata: {
        mentions,
      },
    }
  );

  return response.data;
}

/**
 * Check if the current user was mentioned in a message
 * @param message - The message to check
 * @param userId - The current user's ID
 * @returns true if the user was mentioned
 */
export function wasUserMentioned(message: MessageDTO, userId: string): boolean {
  if (!message.metadata?.mentions) return false;

  return message.metadata.mentions.some(
    (mention: { user_id: string }) => mention.user_id === userId
  );
}

/**
 * Extract mentions from message metadata
 * @param message - The message
 * @returns Array of mention metadata
 */
export function getMentionsFromMessage(message: MessageDTO): MentionMetadata[] {
  return (message.metadata?.mentions as MentionMetadata[]) || [];
}

/**
 * Highlight mentions in text (Frontend-side implementation)
 * @param text - The text to process
 * @param mentions - Array of mention metadata
 * @returns HTML string with mentions highlighted
 */
export function highlightMentions(
  text: string,
  mentions: MentionMetadata[]
): string {
  if (!mentions || mentions.length === 0) return text;

  // Sort mentions by start_index in descending order
  // This ensures we process from the end to avoid offset issues
  const sortedMentions = [...mentions]
    .filter(m => m.start_index !== undefined && m.length !== undefined)
    .sort((a, b) => b.start_index! - a.start_index!);

  let result = text;

  sortedMentions.forEach((mention) => {
    const start_index = mention.start_index!;
    const length = mention.length!;
    const before = result.substring(0, start_index);
    const mentionText = result.substring(start_index, start_index + length);
    const after = result.substring(start_index + length);

    // Use the mention text from the content itself (MentionMetadata doesn't have display_name)
    result = `${before}<span class="mention" data-user-id="${mention.user_id}">${mentionText}</span>${after}`;
  });

  return result;
}

export const mentionService = {
  getMyMentions,
  sendMessageWithMentions,
  wasUserMentioned,
  getMentionsFromMessage,
  highlightMentions,
};

export default mentionService;
