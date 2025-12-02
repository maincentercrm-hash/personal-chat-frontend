// Mention Types

// Get Mentions Types
export interface GetMentionsParams {
  limit?: number;                     // Default: 20, Max: 100
  cursor?: string;                    // Mention UUID
  direction?: 'before' | 'after';     // Default: 'before'
}

export interface GetMentionsResponse {
  success: true;
  data: {
    mentions: Mention[];
    cursor: string | null;
    has_more: boolean;
  };
}

// Mention Object
export interface Mention {
  id: string;                         // UUID
  message_id: string;                 // UUID
  mentioned_user_id: string;          // UUID
  start_index: number | null;
  length: number | null;
  created_at: string;                 // ISO 8601
  message: MentionMessage;
  mentioned_user: MentionUser;
}

// User info in Mention
export interface MentionUser {
  id: string;
  username: string;
  display_name: string;
  profile_image_url?: string | null;
}

// Message in Mention (simplified)
export interface MentionMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  message_type: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
  sender: MentionUser | null;
  conversation: MentionConversation;
}

// Conversation in Mention
export interface MentionConversation {
  id: string;
  type: 'private' | 'group';
  title: string;
  icon_url?: string | null;
}

// Mention Metadata (in message.metadata.mentions array)
// ✅ ตรงตาม Backend Spec: user_id (required), start_index & length (optional)
export interface MentionMetadata {
  user_id: string;                    // UUID - required
  start_index?: number;               // optional - ตำแหน่งเริ่มต้นของ mention (0-based)
  length?: number;                    // optional - ความยาวของข้อความที่เป็น mention
}

export interface MentionErrorResponse {
  success: false;
  message: string;
}
