import type { MessageDTO } from './message.types';

// Search Messages Types
export interface SearchMessagesParams {
  q: string;                          // Required
  conversation_id?: string;           // UUID
  limit?: number;                     // Default: 20, Max: 100
  cursor?: string;                    // Message UUID
  direction?: 'before' | 'after';     // Default: 'before'
}

export interface SearchMessagesResponse {
  success: true;
  data: {
    messages: MessageDTO[];
    query: string;
    cursor: string | null;
    has_more: boolean;
  };
}

export interface SearchErrorResponse {
  success: false;
  message: string;
}
