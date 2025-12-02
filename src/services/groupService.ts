// src/services/groupService.ts
import apiService from '@/services/apiService';
import { GROUP_API } from '@/constants/api/standardApiConstants';
import type {
  ConversationRole,
  ActivityDTO,
  ActivitiesResponse,
  ChangeRoleRequest,
  TransferOwnershipRequest,
} from '@/types/group.types';

/**
 * Update member role (Promote/Demote)
 */
export async function updateMemberRole(
  conversationId: string,
  userId: string,
  role: ConversationRole
): Promise<void> {
  await apiService.patch(
    GROUP_API.UPDATE_MEMBER_ROLE(conversationId, userId),
    { role } as ChangeRoleRequest
  );
}

/**
 * Transfer group ownership
 */
export async function transferOwnership(
  conversationId: string,
  newOwnerId: string
): Promise<void> {
  await apiService.post(
    GROUP_API.TRANSFER_OWNERSHIP(conversationId),
    { new_owner_id: newOwnerId } as TransferOwnershipRequest
  );
}

/**
 * Get group activities with pagination and filtering
 */
export async function getActivities(
  conversationId: string,
  params?: {
    limit?: number;
    offset?: number;
    type?: string;
  }
): Promise<ActivitiesResponse> {
  const response = await apiService.get<{ data: ActivitiesResponse }>(
    GROUP_API.GET_ACTIVITIES(conversationId),
    params
  );
  return response.data;
}

/**
 * Format activity message for display (Thai)
 */
export function formatActivityMessage(activity: ActivityDTO): string {
  const actorName = activity.actor.display_name;
  const targetName = activity.target?.display_name;

  switch (activity.type) {
    case 'member.role_changed':
      const newRole = activity.new_value?.role;
      if (newRole === 'admin') {
        return `${actorName} เปลี่ยนสิทธิ์ ${targetName} เป็นผู้ดูแล`;
      } else if (newRole === 'member') {
        return `${actorName} เปลี่ยนสิทธิ์ ${targetName} เป็นสมาชิก`;
      }
      return `${actorName} เปลี่ยนสิทธิ์ ${targetName}`;

    case 'ownership.transferred':
      return `${actorName} โอนความเป็นเจ้าของให้ ${targetName}`;

    case 'member.added':
      return `${actorName} เพิ่ม ${targetName} เข้ากลุ่ม`;

    case 'member.removed':
      return `${actorName} ลบ ${targetName} ออกจากกลุ่ม`;

    case 'member.left':
      return `${actorName} ออกจากกลุ่ม`;

    case 'group.name_changed':
      const oldName = activity.old_value?.name || 'ไม่ระบุ';
      const newName = activity.new_value?.name || 'ไม่ระบุ';
      return `${actorName} เปลี่ยนชื่อกลุ่มจาก "${oldName}" เป็น "${newName}"`;

    case 'group.icon_changed':
      return `${actorName} เปลี่ยนรูปกลุ่ม`;

    case 'group.created':
      return `${actorName} สร้างกลุ่ม`;

    default:
      return `${actorName} ทำการเปลี่ยนแปลง`;
  }
}
