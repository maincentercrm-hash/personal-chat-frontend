import apiService from './apiService';
import { SCHEDULED_MESSAGE_API } from '@/constants/api/standardApiConstants';

export interface ScheduledMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'file' | 'sticker' | 'album';
  content: string;
  media_url: string;
  metadata: Record<string, unknown>;
  scheduled_at: string;
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  sent_at: string | null;
  message_id: string | null;
  error_reason: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduledMessageDTO {
  message_type?: 'text' | 'image' | 'file' | 'sticker' | 'album';
  content: string;
  media_url?: string;
  metadata?: Record<string, unknown>;
  scheduled_at: string; // RFC3339 format
}

export interface UpdateScheduledTimeDTO {
  scheduled_at: string; // RFC3339 format
}

export interface ScheduledMessagesResponse {
  success: boolean;
  data: {
    scheduled_messages: ScheduledMessage[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  };
}

export interface ScheduledMessageResponse {
  success: boolean;
  message?: string;
  data: ScheduledMessage;
}

// Create a scheduled message
export const scheduleMessage = async (
  conversationId: string,
  data: CreateScheduledMessageDTO
): Promise<ScheduledMessageResponse> => {
  return apiService.post<ScheduledMessageResponse>(
    SCHEDULED_MESSAGE_API.SCHEDULE_MESSAGE(conversationId),
    data
  );
};

// Get all scheduled messages for current user
export const getUserScheduledMessages = async (
  limit = 20,
  offset = 0
): Promise<ScheduledMessagesResponse> => {
  return apiService.get<ScheduledMessagesResponse>(
    SCHEDULED_MESSAGE_API.GET_USER_SCHEDULED_MESSAGES,
    { limit, offset }
  );
};

// Get scheduled message by ID
export const getScheduledMessage = async (
  id: string
): Promise<ScheduledMessageResponse> => {
  return apiService.get<ScheduledMessageResponse>(
    SCHEDULED_MESSAGE_API.GET_SCHEDULED_MESSAGE(id)
  );
};

// Get scheduled messages for a conversation
export const getConversationScheduledMessages = async (
  conversationId: string,
  limit = 20,
  offset = 0
): Promise<ScheduledMessagesResponse> => {
  return apiService.get<ScheduledMessagesResponse>(
    SCHEDULED_MESSAGE_API.GET_CONVERSATION_SCHEDULED_MESSAGES(conversationId),
    { limit, offset }
  );
};

// Update scheduled time
export const updateScheduledTime = async (
  id: string,
  data: UpdateScheduledTimeDTO
): Promise<ScheduledMessageResponse> => {
  return apiService.put<ScheduledMessageResponse>(
    SCHEDULED_MESSAGE_API.UPDATE_SCHEDULED_TIME(id),
    data
  );
};

// Cancel a scheduled message
export const cancelScheduledMessage = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  return apiService.delete<{ success: boolean; message: string }>(
    SCHEDULED_MESSAGE_API.CANCEL_SCHEDULED_MESSAGE(id)
  );
};

// Helper: Format date to RFC3339
export const toRFC3339 = (date: Date): string => {
  return date.toISOString();
};

// Helper: Parse RFC3339 to Date
export const fromRFC3339 = (dateString: string): Date => {
  return new Date(dateString);
};

export default {
  scheduleMessage,
  getUserScheduledMessages,
  getScheduledMessage,
  getConversationScheduledMessages,
  updateScheduledTime,
  cancelScheduledMessage,
  toRFC3339,
  fromRFC3339,
};
