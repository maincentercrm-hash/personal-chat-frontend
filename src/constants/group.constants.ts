// src/constants/group.constants.ts
import type { ConversationRole } from '@/types/group.types';

// Permission matrix
export const PERMISSIONS = {
  owner: {
    canPromoteToAdmin: true,
    canDemoteAdmin: true,
    canRemoveMember: true,
    canRemoveAdmin: true,
    canEditGroupInfo: true,
    canDeleteGroup: true,
    canTransferOwnership: true,
  },
  admin: {
    canPromoteToAdmin: false,    // Only owner
    canDemoteAdmin: false,        // Only owner
    canRemoveMember: true,        // Can remove members
    canRemoveAdmin: false,        // Cannot remove other admins
    canEditGroupInfo: true,
    canDeleteGroup: false,
    canTransferOwnership: false,
  },
  member: {
    canPromoteToAdmin: false,
    canDemoteAdmin: false,
    canRemoveMember: false,
    canRemoveAdmin: false,
    canEditGroupInfo: false,
    canDeleteGroup: false,
    canTransferOwnership: false,
  },
} as const;

// Helper function
export function hasPermission(
  role: ConversationRole,
  permission: keyof typeof PERMISSIONS.owner
): boolean {
  return PERMISSIONS[role]?.[permission] ?? false;
}

// Activity type labels (Thai)
export const ACTIVITY_LABELS: Record<string, string> = {
  'group.created': 'สร้างกลุ่ม',
  'group.name_changed': 'เปลี่ยนชื่อกลุ่ม',
  'group.icon_changed': 'เปลี่ยนรูปกลุ่ม',
  'member.added': 'เพิ่มสมาชิก',
  'member.removed': 'ลบสมาชิก',
  'member.role_changed': 'เปลี่ยนสิทธิ์',
  'ownership.transferred': 'โอนความเป็นเจ้าของ',
  'member.left': 'ออกจากกลุ่ม',
};

// Role badges
export const ROLE_CONFIG = {
  owner: {
    label: 'เจ้าของกลุ่ม',
    variant: 'default' as const,
    color: 'text-yellow-600',
  },
  admin: {
    label: 'ผู้ดูแล',
    variant: 'secondary' as const,
    color: 'text-blue-600',
  },
  member: {
    label: 'สมาชิก',
    variant: 'outline' as const,
    color: 'text-gray-600',
  },
};
