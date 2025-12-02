# Frontend: Group Features Integration Plan

**วันที่:** 2025-11-28 (Updated)
**Backend Status:** 90% Ready (จะพร้อม 100% ใน ~40 นาที)
**Frontend Task:** เตรียมพร้อมรับ API
**Convention:** ✅ ใช้ snake_case (ตรงกับ API เดิม)

---

## 📋 สรุปจาก Backend

### ✅ API Endpoints ที่พร้อมใช้งาน

```typescript
// 1. Update Member Role (Promote/Demote)
PATCH /api/v1/conversations/:conversationId/members/:userId/role
Body: { "role": "admin" | "member" }

// 2. Transfer Ownership
POST /api/v1/conversations/:conversationId/transfer-ownership
Body: { "new_owner_id": "uuid" }  // ✅ snake_case

// 3. Get Activities
GET /api/v1/conversations/:conversationId/activities
Query: ?limit=20&offset=0&type=member.role_changed
```

### ✅ WebSocket Events

```typescript
// กำลังจะเปลี่ยนเป็น (รอ Backend แก้)
"conversation.member_role_changed"      // เมื่อเปลี่ยน role
"conversation.ownership_transferred"    // เมื่อโอนเจ้าของ
"conversation.activity.new"             // เมื่อมี activity ใหม่ (ใหม่)
```

---

## 🎯 Frontend Implementation Tasks

### Phase 1: Types & Constants (30 นาที)

#### 1.1 สร้าง Types

**ไฟล์:** `src/types/group.types.ts` (สร้างใหม่)

```typescript
// User role in group/conversation
export type ConversationRole = 'owner' | 'admin' | 'member';

// Member with role
export interface ConversationMemberDTO {
  id: string;
  conversation_id: string;  // ✅ snake_case
  user_id: string;          // ✅ snake_case
  role: ConversationRole;
  joined_at: string;        // ✅ snake_case
  user: {
    id: string;
    username: string;
    display_name: string;        // ✅ snake_case
    profile_image_url?: string;  // ✅ snake_case
  };
}

// Activity types
export type ActivityType =
  | 'group_created'
  | 'group_deleted'
  | 'group_name_changed'
  | 'group_description_changed'
  | 'group_avatar_changed'
  | 'member_added'
  | 'member_removed'
  | 'member_left'
  | 'member_joined'
  | 'member_promoted'
  | 'member_demoted'
  | 'ownership_transferred';

// Activity item
export interface ActivityDTO {
  id: string;
  conversation_id: string;  // ✅ snake_case
  type: ActivityType;
  actor: {
    id: string;
    username: string;
    display_name: string;        // ✅ snake_case
    profile_image_url?: string;  // ✅ snake_case
  };
  target?: {
    id: string;
    username: string;
    display_name: string;        // ✅ snake_case
    profile_image_url?: string;  // ✅ snake_case
  };
  old_value?: any;   // ✅ snake_case
  new_value?: any;   // ✅ snake_case
  created_at: string; // ✅ snake_case
}

// Activities response
export interface ActivitiesResponse {
  activities: ActivityDTO[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}
```

---

#### 1.2 สร้าง Constants

**ไฟล์:** `src/constants/group.constants.ts` (สร้างใหม่)

```typescript
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
    canPromoteToAdmin: false,
    canDemoteAdmin: false,
    canRemoveMember: true,
    canRemoveAdmin: false,
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

// Activity type labels (for display)
export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  group_created: 'สร้างกลุ่ม',
  group_deleted: 'ลบกลุ่ม',
  group_name_changed: 'เปลี่ยนชื่อกลุ่ม',
  group_description_changed: 'เปลี่ยนคำอธิบาย',
  group_avatar_changed: 'เปลี่ยนรูปกลุ่ม',
  member_added: 'เพิ่มสมาชิก',
  member_removed: 'ลบสมาชิก',
  member_left: 'ออกจากกลุ่ม',
  member_joined: 'เข้าร่วมกลุ่ม',
  member_promoted: 'เลื่อนตำแหน่ง',
  member_demoted: 'ลดตำแหน่ง',
  ownership_transferred: 'โอนความเป็นเจ้าของ',
};
```

---

### Phase 2: API Service (45 นาที)

**ไฟล์:** `src/services/groupService.ts` (สร้างใหม่)

```typescript
import apiClient from '@/utils/apiClient';
import { ConversationRole, ActivitiesResponse } from '@/types/group.types';

/**
 * Update member role (Promote/Demote)
 */
export async function updateMemberRole(
  conversationId: string,
  userId: string,
  role: ConversationRole
): Promise<void> {
  await apiClient.patch(
    `/api/v1/conversations/${conversationId}/members/${userId}/role`,
    { role }
  );
}

/**
 * Transfer group ownership
 */
export async function transferOwnership(
  conversationId: string,
  newOwnerId: string
): Promise<void> {
  await apiClient.post(
    `/api/v1/conversations/${conversationId}/transfer-ownership`,
    { new_owner_id: newOwnerId }  // ✅ API expects snake_case
  );
}

/**
 * Get group activities
 */
export async function getActivities(
  conversationId: string,
  params?: {
    limit?: number;
    offset?: number;
    type?: string;
  }
): Promise<ActivitiesResponse> {
  const response = await apiClient.get(
    `/api/v1/conversations/${conversationId}/activities`,
    { params }
  );
  return response.data.data;
}

/**
 * Format activity message for display
 */
export function formatActivityMessage(activity: ActivityDTO): string {
  const actorName = activity.actor.display_name;   // ✅ snake_case
  const targetName = activity.target?.display_name; // ✅ snake_case

  switch (activity.type) {
    case 'member_promoted':
      return `${actorName} เปลี่ยนสิทธิ์ ${targetName} เป็นผู้ดูแล`;

    case 'member_demoted':
      return `${actorName} เปลี่ยนสิทธิ์ ${targetName} เป็นสมาชิก`;

    case 'ownership_transferred':
      return `${actorName} โอนความเป็นเจ้าของให้ ${targetName}`;

    case 'member_added':
      return `${actorName} เพิ่ม ${targetName} เข้ากลุ่ม`;

    case 'member_removed':
      return `${actorName} ลบ ${targetName} ออกจากกลุ่ม`;

    case 'member_left':
      return `${actorName} ออกจากกลุ่ม`;

    case 'group_name_changed':
      return `${actorName} เปลี่ยนชื่อกลุ่มจาก "${activity.old_value}" เป็น "${activity.new_value}"`; // ✅ snake_case

    case 'group_avatar_changed':
      return `${actorName} เปลี่ยนรูปกลุ่ม`;

    default:
      return `${actorName} ทำการเปลี่ยนแปลง`;
  }
}
```

---

### Phase 3: WebSocket Integration (30 นาที)

**ไฟล์:** `src/services/websocket/constants.ts`

เพิ่ม event types:

```typescript
export const WEBSOCKET_EVENTS = {
  // ... existing events ...

  // Group/Conversation events (ใหม่)
  CONVERSATION_MEMBER_ROLE_CHANGED: 'conversation.member_role_changed',
  CONVERSATION_OWNERSHIP_TRANSFERRED: 'conversation.ownership_transferred',
  CONVERSATION_ACTIVITY_NEW: 'conversation.activity.new',
} as const;
```

---

**ไฟล์:** `src/services/websocket/WebSocketConnection.ts`

เพิ่ม event handlers:

```typescript
import { WEBSOCKET_EVENTS } from './constants';

class WebSocketConnection {
  // ... existing code ...

  private setupEventListeners() {
    // ... existing listeners ...

    // Member role changed
    this.socket.on(
      WEBSOCKET_EVENTS.CONVERSATION_MEMBER_ROLE_CHANGED,
      (data: {
        conversation_id: string;  // ✅ snake_case
        user_id: string;          // ✅ snake_case
        new_role: ConversationRole; // ✅ snake_case
        changed_at: string;       // ✅ snake_case
      }) => {
        console.log('[WebSocket] Member role changed:', data);
        // TODO: Update store/UI
      }
    );

    // Ownership transferred
    this.socket.on(
      WEBSOCKET_EVENTS.CONVERSATION_OWNERSHIP_TRANSFERRED,
      (data: {
        conversation_id: string;  // ✅ snake_case
        old_owner_id: string;     // ✅ snake_case
        new_owner_id: string;     // ✅ snake_case
        transferred_at: string;   // ✅ snake_case
      }) => {
        console.log('[WebSocket] Ownership transferred:', data);
        // TODO: Update store/UI
      }
    );

    // New activity
    this.socket.on(
      WEBSOCKET_EVENTS.CONVERSATION_ACTIVITY_NEW,
      (data: {
        conversation_id: string;  // ✅ snake_case
        activity: ActivityDTO;
      }) => {
        console.log('[WebSocket] New activity:', data);
        // TODO: Update activity log UI
      }
    );
  }
}
```

---

### Phase 4: UI Components (2-3 ชม.)

#### 4.1 Member List with Roles

**ไฟล์:** `src/components/group/MemberList.tsx` (สร้างใหม่)

```typescript
import React from 'react';
import { ConversationMemberDTO } from '@/types/group.types';
import { MemberItem } from './MemberItem';

interface MemberListProps {
  members: ConversationMemberDTO[];
  currentUserId: string;
  currentUserRole: ConversationRole;
  onPromote: (userId: string) => void;
  onDemote: (userId: string) => void;
  onRemove: (userId: string) => void;
  onTransferOwnership: (userId: string) => void;
}

export function MemberList({
  members,
  currentUserId,
  currentUserRole,
  onPromote,
  onDemote,
  onRemove,
  onTransferOwnership,
}: MemberListProps) {
  // Sort: owner first, then admins, then members
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  return (
    <div className="space-y-2">
      {sortedMembers.map((member) => (
        <MemberItem
          key={member.id}
          member={member}
          isCurrentUser={member.userId === currentUserId}
          currentUserRole={currentUserRole}
          onPromote={onPromote}
          onDemote={onDemote}
          onRemove={onRemove}
          onTransferOwnership={onTransferOwnership}
        />
      ))}
    </div>
  );
}
```

---

#### 4.2 Member Item with Actions

**ไฟล์:** `src/components/group/MemberItem.tsx` (สร้างใหม่)

```typescript
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Crown, Shield, User } from 'lucide-react';
import { ConversationMemberDTO, ConversationRole } from '@/types/group.types';
import { hasPermission } from '@/constants/group.constants';

interface MemberItemProps {
  member: ConversationMemberDTO;
  isCurrentUser: boolean;
  currentUserRole: ConversationRole;
  onPromote: (userId: string) => void;
  onDemote: (userId: string) => void;
  onRemove: (userId: string) => void;
  onTransferOwnership: (userId: string) => void;
}

export function MemberItem({
  member,
  isCurrentUser,
  currentUserRole,
  onPromote,
  onDemote,
  onRemove,
  onTransferOwnership,
}: MemberItemProps) {
  const canManage = !isCurrentUser && member.role !== 'owner';
  const canPromote = hasPermission(currentUserRole, 'canPromoteToAdmin');
  const canDemote = hasPermission(currentUserRole, 'canDemoteAdmin');
  const canRemove = hasPermission(currentUserRole, 'canRemoveMember');
  const canTransfer = hasPermission(currentUserRole, 'canTransferOwnership');

  const roleConfig = {
    owner: { icon: Crown, label: 'เจ้าของกลุ่ม', variant: 'default' as const },
    admin: { icon: Shield, label: 'ผู้ดูแล', variant: 'secondary' as const },
    member: { icon: User, label: 'สมาชิก', variant: 'outline' as const },
  };

  const config = roleConfig[member.role];
  const RoleIcon = config.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50">
      <Avatar className="h-10 w-10">
        <AvatarImage src={member.user.profile_image_url} />
        <AvatarFallback>
          {member.user.display_name?.charAt(0) || '?'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {member.user.display_name}
          {isCurrentUser && <span className="text-muted-foreground ml-2">(You)</span>}
        </p>
        <Badge variant={config.variant} className="mt-1">
          <RoleIcon className="w-3 h-3 mr-1" />
          {config.label}
        </Badge>
      </div>

      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 hover:bg-accent rounded-md">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Promote to Admin */}
            {canPromote && member.role === 'member' && (
              <DropdownMenuItem onClick={() => onPromote(member.userId)}>
                <Shield className="w-4 h-4 mr-2" />
                เลื่อนเป็นผู้ดูแล
              </DropdownMenuItem>
            )}

            {/* Demote to Member */}
            {canDemote && member.role === 'admin' && (
              <DropdownMenuItem onClick={() => onDemote(member.userId)}>
                <User className="w-4 h-4 mr-2" />
                ลดเป็นสมาชิก
              </DropdownMenuItem>
            )}

            {/* Transfer Ownership */}
            {canTransfer && (
              <DropdownMenuItem onClick={() => onTransferOwnership(member.userId)}>
                <Crown className="w-4 h-4 mr-2" />
                โอนความเป็นเจ้าของ
              </DropdownMenuItem>
            )}

            {/* Remove Member */}
            {canRemove && (
              <DropdownMenuItem
                onClick={() => onRemove(member.userId)}
                className="text-destructive"
              >
                ลบออกจากกลุ่ม
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
```

---

#### 4.3 Activity Log

**ไฟล์:** `src/components/group/ActivityLog.tsx` (สร้างใหม่)

```typescript
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { ActivityDTO } from '@/types/group.types';
import { getActivities, formatActivityMessage } from '@/services/groupService';
import { Loader2 } from 'lucide-react';

interface ActivityLogProps {
  conversationId: string;
}

export function ActivityLog({ conversationId }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [conversationId]);

  async function loadActivities(offset = 0) {
    try {
      setLoading(true);
      const response = await getActivities(conversationId, {
        limit: 20,
        offset,
      });

      if (offset === 0) {
        setActivities(response.activities);
      } else {
        setActivities((prev) => [...prev, ...response.activities]);
      }

      setHasMore(offset + response.activities.length < response.pagination.total);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading && activities.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        ยังไม่มีประวัติการเปลี่ยนแปลง
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3 p-3 rounded-lg hover:bg-accent/50">
          <div className="flex-shrink-0 text-xs text-muted-foreground">
            {format(new Date(activity.created_at), 'HH:mm', { locale: th })}
          </div>
          <div className="flex-1">
            <p className="text-sm">{formatActivityMessage(activity)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(activity.created_at), 'dd MMM yyyy', { locale: th })}
            </p>
          </div>
        </div>
      ))}

      {hasMore && (
        <button
          onClick={() => loadActivities(activities.length)}
          disabled={loading}
          className="w-full py-2 text-sm text-primary hover:underline disabled:opacity-50"
        >
          {loading ? 'กำลังโหลด...' : 'แสดงเพิ่มเติม'}
        </button>
      )}
    </div>
  );
}
```

---

### Phase 5: Integration with Existing UI (1-2 ชม.)

**ไฟล์ที่ต้องแก้:**

1. **Group Info Dialog/Sheet** - เพิ่ม tabs:
   - Members (แสดง MemberList)
   - History (แสดง ActivityLog)

2. **Conversation Store** - เพิ่ม:
   - `currentUserRole` state
   - Update role เมื่อได้รับ WebSocket event

3. **Member Management Hooks:**

**ไฟล์:** `src/hooks/useGroupManagement.ts` (สร้างใหม่)

```typescript
import { useState } from 'react';
import { updateMemberRole, transferOwnership } from '@/services/groupService';
import { toast } from '@/utils/toast';
import { ConversationRole } from '@/types/group.types';

export function useGroupManagement(conversationId: string) {
  const [loading, setLoading] = useState(false);

  async function promoteToAdmin(userId: string) {
    try {
      setLoading(true);
      await updateMemberRole(conversationId, userId, 'admin');
      toast.success('เลื่อนตำแหน่งสำเร็จ');
    } catch (error: any) {
      toast.error('เกิดข้อผิดพลาด', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function demoteToMember(userId: string) {
    try {
      setLoading(true);
      await updateMemberRole(conversationId, userId, 'member');
      toast.success('ลดตำแหน่งสำเร็จ');
    } catch (error: any) {
      toast.error('เกิดข้อผิดพลาด', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function transferOwnershipTo(userId: string) {
    const confirmed = window.confirm(
      'คุณแน่ใจหรือไม่ที่จะโอนความเป็นเจ้าของกลุ่ม? คุณจะกลายเป็นผู้ดูแลแทน'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await transferOwnership(conversationId, userId);
      toast.success('โอนความเป็นเจ้าของสำเร็จ');
    } catch (error: any) {
      toast.error('เกิดข้อผิดพลาด', error.message);
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    promoteToAdmin,
    demoteToMember,
    transferOwnershipTo,
  };
}
```

---

## 🧪 Testing Checklist

### API Testing
- [ ] Test promote member to admin
- [ ] Test demote admin to member
- [ ] Test transfer ownership
- [ ] Test get activities with pagination
- [ ] Test get activities with type filter
- [ ] Test permission validation (403 errors)

### WebSocket Testing
- [ ] Test `conversation.member_role_changed` event
- [ ] Test `conversation.ownership_transferred` event
- [ ] Test `conversation.activity.new` event
- [ ] Verify UI updates in real-time

### UI Testing
- [ ] Member list displays correct roles
- [ ] Dropdown menu shows correct actions based on permissions
- [ ] Activity log displays correct messages
- [ ] Activity log pagination works
- [ ] Confirm dialogs work for destructive actions

---

## ⏰ Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Types & Constants | 30 min | ⏳ Pending |
| 2 | API Service | 45 min | ⏳ Pending |
| 3 | WebSocket Integration | 30 min | ⏳ Pending |
| 4 | UI Components | 2-3 hrs | ⏳ Pending |
| 5 | Integration | 1-2 hrs | ⏳ Pending |
| 6 | Testing | 1 hr | ⏳ Pending |
| **Total** | | **~6-8 ชม.** | |

---

## 🚀 Next Steps

### Immediate (ตอนนี้):
1. ✅ ยกเลิกการเปลี่ยน camelCase (ประหยัดเวลา 30 นาที)
2. รอ Backend แก้ WebSocket naming + เพิ่ม features (~40 นาที)
3. ทดสอบ API endpoints ด้วย Postman/Thunder Client
4. ตรวจสอบ Response format (ต้องเป็น snake_case)

### After Backend Ready:
1. เริ่มจาก Phase 1: Types & Constants (ใช้ snake_case)
2. Phase 2: API Service
3. Phase 3: WebSocket
4. Phase 4-5: UI Implementation
5. Phase 6: Testing

---

**Created:** 2025-11-28 (Updated)
**Convention:** ✅ snake_case (ตรงกับ API เดิม)
**Status:** 📋 Planning - รอ Backend แก้ WebSocket naming (~40 นาที)
**Next:** เริ่ม Implementation เมื่อ Backend พร้อม 100%
