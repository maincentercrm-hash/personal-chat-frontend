# 🚀 Frontend: Group Features Implementation Guide

**วันที่:** 2025-11-28
**Backend Status:** ✅ 100% พร้อมใช้งาน (snake_case)
**Build Status:** ✅ Passing
**Timeline:** 6-8 ชั่วโมง

---

## 📋 สรุปจาก Backend

Backend แจ้งว่า**ทำเสร็จทั้งหมดแล้ว** ใน ~53 นาที:

### ✅ ฟีเจอร์ที่พร้อมใช้งาน:

1. **API Endpoints (3 ตัว):**
   - ✅ PATCH `/api/v1/conversations/:id/members/:userId/role`
   - ✅ POST `/api/v1/conversations/:id/transfer-ownership`
   - ✅ GET `/api/v1/conversations/:id/activities?type=...&limit=...&offset=...`

2. **WebSocket Events (3 events):**
   - ✅ `conversation.member_role_changed`
   - ✅ `conversation.ownership_transferred`
   - ✅ `conversation.activity.new` (ใหม่!)

3. **Features:**
   - ✅ Permission validation (Owner/Admin/Member)
   - ✅ Activity logging (8 types)
   - ✅ Activity type filtering
   - ✅ User info populated (actor, target)

4. **Convention:**
   - ✅ **snake_case ทั้งหมด** (ตามที่ขอ)

---

## 🎯 Frontend Implementation Steps

### 📦 Phase 1: Types & Constants (30 นาที)

#### 1.1 สร้าง Group Types

**ไฟล์:** `src/types/group.types.ts` (สร้างใหม่)

```typescript
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

// Activity types (จาก Backend)
export type ActivityType =
  | 'group.created'
  | 'group.name_changed'
  | 'group.icon_changed'
  | 'member.added'
  | 'member.removed'
  | 'member.role_changed'
  | 'ownership.transferred'
  | 'member.left';

// Activity DTO (ตรงกับ Backend Response)
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
```

---

#### 1.2 สร้าง Permission Constants

**ไฟล์:** `src/constants/group.constants.ts` (สร้างใหม่)

```typescript
import { ConversationRole } from '@/types/group.types';

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
    canPromoteToAdmin: false,    // ❌ Only owner
    canDemoteAdmin: false,        // ❌ Only owner
    canRemoveMember: true,        // ✅ Can remove members
    canRemoveAdmin: false,        // ❌ Cannot remove other admins
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
```

---

### 📡 Phase 2: API Service (45 นาที)

**ไฟล์:** `src/services/groupService.ts` (สร้างใหม่)

```typescript
import apiClient from '@/utils/apiClient';
import {
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
  const response = await apiClient.patch(
    `/api/v1/conversations/${conversationId}/members/${userId}/role`,
    { role } as ChangeRoleRequest
  );
  return response.data;
}

/**
 * Transfer group ownership
 */
export async function transferOwnership(
  conversationId: string,
  newOwnerId: string
): Promise<void> {
  const response = await apiClient.post(
    `/api/v1/conversations/${conversationId}/transfer-ownership`,
    { new_owner_id: newOwnerId } as TransferOwnershipRequest
  );
  return response.data;
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
  const response = await apiClient.get(
    `/api/v1/conversations/${conversationId}/activities`,
    { params }
  );
  return response.data.data;
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
      return `${actorName} เปลี่ยนชื่อกลุ่มจาก "${activity.old_value}" เป็น "${activity.new_value}"`;

    case 'group.icon_changed':
      return `${actorName} เปลี่ยนรูปกลุ่ม`;

    case 'group.created':
      return `${actorName} สร้างกลุ่ม`;

    default:
      return `${actorName} ทำการเปลี่ยนแปลง`;
  }
}
```

---

### 🔌 Phase 3: WebSocket Integration (30 นาที)

#### 3.1 เพิ่ม Event Constants

**ไฟล์:** `src/services/websocket/constants.ts`

```typescript
export const WEBSOCKET_EVENTS = {
  // ... existing events ...

  // Group/Conversation Management
  CONVERSATION_MEMBER_ROLE_CHANGED: 'conversation.member_role_changed',
  CONVERSATION_OWNERSHIP_TRANSFERRED: 'conversation.ownership_transferred',
  CONVERSATION_ACTIVITY_NEW: 'conversation.activity.new',
} as const;
```

---

#### 3.2 เพิ่ม Event Handlers

**ไฟล์:** `src/services/websocket/WebSocketConnection.ts`

```typescript
import { WEBSOCKET_EVENTS } from './constants';
import {
  MemberRoleChangedEvent,
  OwnershipTransferredEvent,
  ActivityNewEvent,
} from '@/types/group.types';

class WebSocketConnection {
  // ... existing code ...

  private setupEventListeners() {
    // ... existing listeners ...

    // Member role changed
    this.socket.on(
      WEBSOCKET_EVENTS.CONVERSATION_MEMBER_ROLE_CHANGED,
      (data: MemberRoleChangedEvent) => {
        console.log('[WebSocket] Member role changed:', data);

        // TODO: Update conversation store
        // - Update member role in members list
        // - Update current user role if affected
        // - Show notification
      }
    );

    // Ownership transferred
    this.socket.on(
      WEBSOCKET_EVENTS.CONVERSATION_OWNERSHIP_TRANSFERRED,
      (data: OwnershipTransferredEvent) => {
        console.log('[WebSocket] Ownership transferred:', data);

        // TODO: Update conversation store
        // - Change old owner → admin
        // - Change new owner → owner
        // - Update UI permissions
        // - Show notification
      }
    );

    // New activity (for real-time activity log)
    this.socket.on(
      WEBSOCKET_EVENTS.CONVERSATION_ACTIVITY_NEW,
      (data: ActivityNewEvent) => {
        console.log('[WebSocket] New activity:', data);

        // TODO: Update activity log
        // - Prepend new activity to list
        // - Update total count
        // - Show notification (optional)
      }
    );
  }
}
```

---

### 🎨 Phase 4: UI Components (2-3 ชม.)

#### 4.1 Group Management Hook

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
      toast.success('เลื่อนเป็นผู้ดูแลสำเร็จ');
    } catch (error: any) {
      console.error('Failed to promote:', error);
      toast.error('ไม่สามารถเลื่อนตำแหน่งได้', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function demoteToMember(userId: string) {
    try {
      setLoading(true);
      await updateMemberRole(conversationId, userId, 'member');
      toast.success('ลดเป็นสมาชิกสำเร็จ');
    } catch (error: any) {
      console.error('Failed to demote:', error);
      toast.error('ไม่สามารถลดตำแหน่งได้', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function transferOwnershipTo(userId: string) {
    const confirmed = window.confirm(
      'คุณแน่ใจหรือไม่ที่จะโอนความเป็นเจ้าของกลุ่ม?\n\nคุณจะกลายเป็นผู้ดูแลแทน และไม่สามารถยกเลิกได้'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await transferOwnership(conversationId, userId);
      toast.success('โอนความเป็นเจ้าของสำเร็จ');
    } catch (error: any) {
      console.error('Failed to transfer ownership:', error);
      toast.error('ไม่สามารถโอนความเป็นเจ้าของได้', error.response?.data?.message || error.message);
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

#### 4.2 Activity Log Hook

**ไฟล์:** `src/hooks/useActivityLog.ts` (สร้างใหม่)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { getActivities } from '@/services/groupService';
import { ActivityDTO } from '@/types/group.types';

export function useActivityLog(conversationId: string) {
  const [activities, setActivities] = useState<ActivityDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadActivities = useCallback(
    async (offset = 0, type?: string) => {
      try {
        setLoading(true);
        const response = await getActivities(conversationId, {
          limit: 20,
          offset,
          type,
        });

        if (offset === 0) {
          setActivities(response.activities);
        } else {
          setActivities((prev) => [...prev, ...response.activities]);
        }

        setTotal(response.pagination.total);
        setHasMore(offset + response.activities.length < response.pagination.total);
      } catch (error) {
        console.error('Failed to load activities:', error);
      } finally {
        setLoading(false);
      }
    },
    [conversationId]
  );

  // Load initial activities
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Add new activity (from WebSocket)
  const addActivity = useCallback((activity: ActivityDTO) => {
    setActivities((prev) => [activity, ...prev]);
    setTotal((prev) => prev + 1);
  }, []);

  return {
    activities,
    loading,
    total,
    hasMore,
    loadMore: () => loadActivities(activities.length),
    reload: () => loadActivities(0),
    addActivity,
  };
}
```

---

#### 4.3 Member List Component

**ไฟล์:** `src/components/group/MemberList.tsx` (สร้างใหม่)

```typescript
import React from 'react';
import { ConversationMemberWithRole } from '@/types/group.types';
import { MemberItem } from './MemberItem';

interface MemberListProps {
  members: ConversationMemberWithRole[];
  currentUserId: string;
  currentUserRole: 'owner' | 'admin' | 'member';
  onPromote: (userId: string) => void;
  onDemote: (userId: string) => void;
  onTransferOwnership: (userId: string) => void;
}

export function MemberList({
  members,
  currentUserId,
  currentUserRole,
  onPromote,
  onDemote,
  onTransferOwnership,
}: MemberListProps) {
  // Sort: owner first, then admins, then members
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-muted-foreground px-3 py-2">
        สมาชิก ({members.length})
      </div>
      {sortedMembers.map((member) => (
        <MemberItem
          key={member.id}
          member={member}
          isCurrentUser={member.user_id === currentUserId}
          currentUserRole={currentUserRole}
          onPromote={onPromote}
          onDemote={onDemote}
          onTransferOwnership={onTransferOwnership}
        />
      ))}
    </div>
  );
}
```

---

#### 4.4 Member Item Component

**ไฟล์:** `src/components/group/MemberItem.tsx` (สร้างใหม่)

```typescript
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Crown, Shield, User, UserMinus } from 'lucide-react';
import { ConversationMemberWithRole } from '@/types/group.types';
import { hasPermission, ROLE_CONFIG } from '@/constants/group.constants';

interface MemberItemProps {
  member: ConversationMemberWithRole;
  isCurrentUser: boolean;
  currentUserRole: 'owner' | 'admin' | 'member';
  onPromote: (userId: string) => void;
  onDemote: (userId: string) => void;
  onTransferOwnership: (userId: string) => void;
}

export function MemberItem({
  member,
  isCurrentUser,
  currentUserRole,
  onPromote,
  onDemote,
  onTransferOwnership,
}: MemberItemProps) {
  const canManage = !isCurrentUser && member.role !== 'owner';
  const config = ROLE_CONFIG[member.role];

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/50">
      <Avatar className="h-10 w-10">
        <AvatarImage src={member.user.profile_image_url} />
        <AvatarFallback>
          {member.user.display_name?.charAt(0) || '?'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {member.user.display_name}
          {isCurrentUser && (
            <span className="text-muted-foreground text-sm ml-2">(คุณ)</span>
          )}
        </p>
        <Badge variant={config.variant} className="mt-1 text-xs">
          {member.role === 'owner' && <Crown className="w-3 h-3 mr-1" />}
          {member.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
          {member.role === 'member' && <User className="w-3 h-3 mr-1" />}
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
            {hasPermission(currentUserRole, 'canPromoteToAdmin') &&
              member.role === 'member' && (
                <DropdownMenuItem onClick={() => onPromote(member.user_id)}>
                  <Shield className="w-4 h-4 mr-2" />
                  เลื่อนเป็นผู้ดูแล
                </DropdownMenuItem>
              )}

            {/* Demote to Member */}
            {hasPermission(currentUserRole, 'canDemoteAdmin') &&
              member.role === 'admin' && (
                <DropdownMenuItem onClick={() => onDemote(member.user_id)}>
                  <User className="w-4 h-4 mr-2" />
                  ลดเป็นสมาชิก
                </DropdownMenuItem>
              )}

            {/* Transfer Ownership */}
            {hasPermission(currentUserRole, 'canTransferOwnership') && (
              <>
                {(member.role === 'admin' || member.role === 'member') && (
                  <DropdownMenuSeparator />
                )}
                <DropdownMenuItem
                  onClick={() => onTransferOwnership(member.user_id)}
                  className="text-yellow-600"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  โอนความเป็นเจ้าของ
                </DropdownMenuItem>
              </>
            )}

            {/* Remove Member */}
            {hasPermission(currentUserRole, 'canRemoveMember') &&
              (member.role === 'member' ||
                (member.role === 'admin' &&
                  hasPermission(currentUserRole, 'canRemoveAdmin'))) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      /* TODO: Remove member */
                    }}
                    className="text-destructive"
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    ลบออกจากกลุ่ม
                  </DropdownMenuItem>
                </>
              )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
```

---

#### 4.5 Activity Log Component

**ไฟล์:** `src/components/group/ActivityLog.tsx` (สร้างใหม่)

```typescript
import React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Loader2, History } from 'lucide-react';
import { useActivityLog } from '@/hooks/useActivityLog';
import { formatActivityMessage } from '@/services/groupService';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityLogProps {
  conversationId: string;
}

export function ActivityLog({ conversationId }: ActivityLogProps) {
  const { activities, loading, hasMore, loadMore } =
    useActivityLog(conversationId);

  if (loading && activities.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <History className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">ยังไม่มีประวัติการเปลี่ยนแปลง</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-shrink-0 text-xs text-muted-foreground pt-0.5">
                {format(new Date(activity.created_at), 'HH:mm', { locale: th })}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{formatActivityMessage(activity)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(activity.created_at), 'dd MMM yyyy', {
                    locale: th,
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {hasMore && (
        <div className="p-4 border-t">
          <Button
            onClick={loadMore}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                กำลังโหลด...
              </>
            ) : (
              'แสดงเพิ่มเติม'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

### 🔗 Phase 5: Integration (1-2 ชม.)

#### ขั้นตอนการ Integrate:

1. **เพิ่ม Tabs ใน Group Info Sheet/Dialog:**
   - Tab "สมาชิก" → แสดง `<MemberList />`
   - Tab "ประวัติ" → แสดง `<ActivityLog />`

2. **Update Conversation Store:**
   - เพิ่ม `currentUserRole` state
   - เพิ่ม `members` state (with roles)
   - Update members เมื่อได้รับ WebSocket events

3. **Connect WebSocket Events:**
   - `conversation.member_role_changed` → Update member role in store
   - `conversation.ownership_transferred` → Update owner/admin roles
   - `conversation.activity.new` → Add to activity log

4. **Add to Existing Components:**
   - Group Info Sheet: เพิ่ม `useGroupManagement` hook
   - Group Info Sheet: ส่ง `currentUserRole` ไป `<MemberList />`

---

## 🧪 Testing Checklist

### API Testing:
- [ ] Test promote member to admin
- [ ] Test demote admin to member
- [ ] Test transfer ownership
- [ ] Test get activities (default)
- [ ] Test get activities with pagination
- [ ] Test get activities with type filter
- [ ] Test 403 error (no permission)
- [ ] Test 404 error (user not found)

### WebSocket Testing:
- [ ] Subscribe to `conversation.member_role_changed`
- [ ] Subscribe to `conversation.ownership_transferred`
- [ ] Subscribe to `conversation.activity.new`
- [ ] Verify events received in real-time
- [ ] Verify UI updates automatically

### UI Testing:
- [ ] Member list displays correct roles
- [ ] Role badges display correctly
- [ ] Dropdown menu shows correct actions
- [ ] Only show actions for allowed permissions
- [ ] Promote/demote works
- [ ] Transfer ownership works
- [ ] Activity log displays messages
- [ ] Activity log pagination works
- [ ] Activity log updates real-time
- [ ] Confirm dialogs work

### Error Testing:
- [ ] Test network error handling
- [ ] Test permission denied errors
- [ ] Test toast notifications display

---

## ⏰ Timeline Estimate

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Types & Constants | 30 min | ⏳ Pending |
| 2 | API Service | 45 min | ⏳ Pending |
| 3 | WebSocket Integration | 30 min | ⏳ Pending |
| 4.1-4.2 | Hooks | 1 hr | ⏳ Pending |
| 4.3-4.5 | UI Components | 2 hrs | ⏳ Pending |
| 5 | Integration | 1-2 hrs | ⏳ Pending |
| 6 | Testing | 1 hr | ⏳ Pending |
| **Total** | | **6-8 hrs** | |

---

## 📝 Example Usage

### ตัวอย่างการใช้งานใน Component:

```typescript
import { useGroupManagement } from '@/hooks/useGroupManagement';
import { MemberList } from '@/components/group/MemberList';
import { ActivityLog } from '@/components/group/ActivityLog';

function GroupInfoSheet({ conversationId, currentUserId, currentUserRole }) {
  const { promoteToAdmin, demoteToMember, transferOwnershipTo, loading } =
    useGroupManagement(conversationId);

  return (
    <Sheet>
      <SheetContent>
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">สมาชิก</TabsTrigger>
            <TabsTrigger value="history">ประวัติ</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <MemberList
              members={members}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onPromote={promoteToAdmin}
              onDemote={demoteToMember}
              onTransferOwnership={transferOwnershipTo}
            />
          </TabsContent>

          <TabsContent value="history">
            <ActivityLog conversationId={conversationId} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
```

---

## 🚀 Getting Started

### Step 1: อ่านเอกสาร
- ✅ อ่านไฟล์นี้ทั้งหมด
- ✅ ตรวจสอบ Backend Response Format
- ✅ เข้าใจ Permission Matrix

### Step 2: เริ่ม Implementation
1. สร้าง Types & Constants (Phase 1)
2. สร้าง API Service (Phase 2)
3. เพิ่ม WebSocket Events (Phase 3)
4. สร้าง Hooks (Phase 4.1-4.2)
5. สร้าง UI Components (Phase 4.3-4.5)
6. Integration (Phase 5)
7. Testing (Phase 6)

### Step 3: Test กับ Backend
- ใช้ API endpoints ที่พร้อมแล้ว
- Test WebSocket events
- ตรวจสอบ Response format

---

## 📚 Reference Files

- `GROUP_FEATURES_FINAL.md` - Backend Final Documentation
- `FRONTEND_GROUP_INTEGRATION_PLAN.md` - แผนเดิม (outdated)
- `BACKEND_CONVENTION_UPDATE.md` - Convention agreement

---

## 🎯 Success Criteria

เมื่อทำเสร็จควรได้:

✅ **Functionality:**
- สามารถเลื่อน/ลด role ของสมาชิกได้
- สามารถโอนความเป็นเจ้าของได้
- แสดงประวัติการเปลี่ยนแปลงได้
- อัปเดต real-time ผ่าน WebSocket

✅ **UX:**
- UI ชัดเจน ใช้งานง่าย
- แสดง role badges ถูกต้อง
- Permission-based actions
- Confirm dialogs สำหรับ destructive actions
- Toast notifications สำหรับ success/error

✅ **Code Quality:**
- Type-safe ด้วย TypeScript
- Reusable hooks และ components
- Error handling ครบถ้วน
- Consistent naming (snake_case for API)

---

**Created:** 2025-11-28
**Backend:** ✅ Ready (snake_case)
**Frontend:** ⏳ Pending Implementation
**Timeline:** 6-8 hours
**Priority:** 🟡 Medium
