// src/services/forwardService.ts
// Service for forwarding messages to other conversations

import apiService from './apiService';

export interface ForwardMessageRequest {
  message_ids: string[];
  target_conversation_ids: string[];
}

export interface ForwardedMessage {
  original_message_id: string;
  target_conversation_id: string;
  new_message_id: string;
}

export interface ForwardMessageResponse {
  forwarded_messages: ForwardedMessage[];
}

/**
 * Forward Service
 * Handles forwarding messages to one or more conversations
 *
 * Backend API: POST /api/v1/messages/forward
 */
class ForwardService {
  /**
   * Forward messages to one or more conversations
   *
   * @param messageIds - Array of message IDs to forward
   * @param targetConversationIds - Array of target conversation IDs
   * @returns ForwardMessageResponse with list of forwarded messages
   *
   * @example
   * await forwardService.forwardMessages(
   *   ['msg-1', 'msg-2'],
   *   ['conv-1', 'conv-2']
   * );
   */
  async forwardMessages(
    messageIds: string[],
    targetConversationIds: string[]
  ): Promise<ForwardMessageResponse> {
    try {
      console.log('[ForwardService] Forwarding messages:', {
        messageIds,
        targetConversationIds,
        totalForwards: messageIds.length * targetConversationIds.length
      });

      const response = await apiService.post<{
        data: {
          forwarded_messages: Record<string, ForwardedMessage[]>;
          total_forwarded: number;
        };
      }>(
        '/messages/forward',
        {
          message_ids: messageIds,
          target_conversation_ids: targetConversationIds
        }
      );

      console.log('[ForwardService] Full response:', response);
      console.log('[ForwardService] Response data:', response.data);

      // Backend returns: { data: { forwarded_messages: { [conv_id]: [...] }, total_forwarded: N } }
      const responseData = (response as any).data?.data || response.data;

      console.log('[ForwardService] Forward success:', responseData);

      // Convert object of arrays to flat array
      let forwardedMessages: ForwardedMessage[] = [];

      if (responseData.forwarded_messages) {
        // Backend returns object with conversation_id as keys
        // Convert: { "conv-id": [{...}], "conv-id-2": [{...}] } → [{...}, {...}]
        forwardedMessages = Object.values(responseData.forwarded_messages as Record<string, ForwardedMessage[]>).flat();
      }

      console.log('[ForwardService] Parsed forwarded messages:', forwardedMessages);

      // Return formatted response
      return {
        forwarded_messages: forwardedMessages
      };
    } catch (error) {
      console.error('[ForwardService] Failed to forward messages:', error);
      throw error;
    }
  }

  /**
   * Validate that a message can be forwarded
   *
   * @param messageId - Message ID to check
   * @returns true if message can be forwarded
   */
  canForwardMessage(messageId: string): boolean {
    // Basic validation - can be extended with more checks
    if (!messageId) return false;

    // TODO: Add additional validation if needed
    // - Check if message is deleted
    // - Check if user has permission
    // - Check if message type is forwardable

    return true;
  }

  /**
   * Get forwarded message count for analytics
   *
   * @param messageIds - Messages to forward
   * @param targetConversationIds - Target conversations
   * @returns Total number of forwards that will be created
   */
  getForwardCount(messageIds: string[], targetConversationIds: string[]): number {
    return messageIds.length * targetConversationIds.length;
  }
}

// Export singleton instance
export const forwardService = new ForwardService();
