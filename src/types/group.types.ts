// src/types/group.types.ts

// Role types
export type ConversationRole = 'owner' | 'admin' | 'member';

// Member with role
export interface ConversationMemberWithRole {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ConversationRole;
  joined_at: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    profile_image_url?: string;
  };
}

// Activity types (from Backend)
export type ActivityType =
  | 'group.created'
  | 'group.name_changed'
  | 'group.icon_changed'
  | 'member.added'
  | 'member.removed'
  | 'member.role_changed'
  | 'ownership.transferred'
  | 'member.left';

// Activity DTO (matches Backend Response)
export interface ActivityDTO {
  id: string;
  conversation_id: string;
  type: ActivityType;
  actor: {
    id: string;
    username: string;
    display_name: string;
    profile_image_url?: string;
  };
  target?: {
    id: string;
    username: string;
    display_name: string;
    profile_image_url?: string;
  } | null;
  old_value?: any;
  new_value?: any;
  created_at: string;
}

// Get Activities Response
export interface ActivitiesResponse {
  activities: ActivityDTO[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Change Role Request
export interface ChangeRoleRequest {
  role: 'admin' | 'member';
}

// Transfer Ownership Request
export interface TransferOwnershipRequest {
  new_owner_id: string;
}

// WebSocket Event Payloads
export interface MemberRoleChangedEvent {
  conversation_id: string;
  user_id: string;
  old_role: ConversationRole;
  new_role: ConversationRole;
  changed_at: string;
}

export interface OwnershipTransferredEvent {
  conversation_id: string;
  previous_owner_id: string;
  new_owner_id: string;
  transferred_at: string;
}

export interface ActivityNewEvent {
  conversation_id: string;
  activity: ActivityDTO;
}
