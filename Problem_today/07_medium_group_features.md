# 07 - MEDIUM PRIORITY: ฟีเจอร์กลุ่ม (Group Chat Features)

**ลำดับความสำคัญ: 🟡 MEDIUM PRIORITY**
**ระดับความยาก: ⭐⭐ ปานกลาง**

---

## 📋 รายการปัญหา

### #7: สร้างกลุ่มแล้ว ตั้งคนอื่นเป็นแอดมินไม่ได้

**ปัญหา:**
- ไม่สามารถเปลี่ยนสิทธิ์สมาชิกเป็น admin ได้
- มี admin คนเดียว (ผู้สร้างกลุ่ม)

**วิธีแก้:**

### Frontend:
1. **Group Member Management UI:**
   ```typescript
   interface GroupMember {
     userId: string;
     user: User;
     role: 'owner' | 'admin' | 'member';
     joinedAt: Date;
   }

   const MemberItem = ({ member, currentUserRole }) => {
     const canPromote = currentUserRole === 'owner' || currentUserRole === 'admin';

     return (
       <div className="member-item">
         <Avatar src={member.user.avatar} />
         <div>
           <p>{member.user.displayName}</p>
           <Badge>{member.role}</Badge>
         </div>

         {canPromote && member.role !== 'owner' && (
           <Dropdown>
             {member.role === 'member' && (
               <MenuItem onClick={() => promoteToAdmin(member.userId)}>
                 Promote to Admin
               </MenuItem>
             )}
             {member.role === 'admin' && (
               <MenuItem onClick={() => demoteToMember(member.userId)}>
                 Demote to Member
               </MenuItem>
             )}
             <MenuItem onClick={() => removeMember(member.userId)}>
               Remove from Group
             </MenuItem>
           </Dropdown>
         )}
       </div>
     );
   };
   ```

2. **Role-based Permissions:**
   ```typescript
   const PERMISSIONS = {
     owner: [
       'promote_admin',
       'demote_admin',
       'remove_member',
       'edit_group_info',
       'delete_group',
       'transfer_ownership'
     ],
     admin: [
       'remove_member',
       'edit_group_info'
     ],
     member: []
   };

   const hasPermission = (userRole: Role, permission: string) => {
     return PERMISSIONS[userRole]?.includes(permission);
   };
   ```

3. **Transfer Ownership:**
   ```typescript
   // เฉพาะ owner เท่านั้นที่โอนได้
   const transferOwnership = async (newOwnerId: string) => {
     if (!confirm('Are you sure you want to transfer ownership?')) return;

     await api.transferGroupOwnership(groupId, newOwnerId);
     // Current owner → Admin
     // New owner → Owner
   };
   ```

**Backend ต้องทำ:**
✅ **ต้องทำ:**

1. **API Endpoints:**
   ```typescript
   PUT /api/groups/{groupId}/members/{userId}/role
   Body: { role: 'admin' | 'member' }

   POST /api/groups/{groupId}/transfer-ownership
   Body: { newOwnerId: string }

   DELETE /api/groups/{groupId}/members/{userId}
   ```

2. **Permission Validation:**
   ```typescript
   // Backend must validate:
   // - Only owner/admin can change roles
   // - Owner cannot be demoted (must transfer first)
   // - Cannot remove owner (must transfer or delete group)
   ```

3. **Response:**
   ```json
   {
     "groupId": "group_123",
     "members": [
       {
         "userId": "user_456",
         "role": "owner",
         "joinedAt": "2024-01-01T10:00:00Z"
       },
       {
         "userId": "user_789",
         "role": "admin",
         "joinedAt": "2024-01-02T10:00:00Z"
       }
     ]
   }
   ```

4. **WebSocket Events:**
   ```typescript
   // Broadcast to all group members:
   {
     event: 'group.member.role_changed',
     data: {
       groupId: 'group_123',
       userId: 'user_789',
       oldRole: 'member',
       newRole: 'admin',
       changedBy: 'user_456'
     }
   }
   ```

---

### #9: ไม่มีประวัติแก้ไขกลุ่ม

**ปัญหา:**
- ไม่รู้ว่าใครแก้ไขชื่อกลุ่ม, รูปกลุ่ม, เพิ่ม/ลบสมาชิก เมื่อไหร่
- ไม่มี audit log

**วิธีแก้:**

### Frontend:
1. **Group Activity Log:**
   ```typescript
   interface GroupActivity {
     id: string;
     type: 'member_added' | 'member_removed' | 'role_changed' |
           'group_name_changed' | 'group_avatar_changed' |
           'group_created' | 'member_left';
     actor: User;        // คนที่ทำ action
     target?: User;      // คนที่ถูกกระทำ (ถ้ามี)
     oldValue?: any;
     newValue?: any;
     timestamp: Date;
   }

   const ActivityLog = ({ activities }) => {
     return (
       <div className="activity-log">
         <h3>Group History</h3>
         {activities.map(activity => (
           <ActivityItem key={activity.id} activity={activity} />
         ))}
       </div>
     );
   };

   const ActivityItem = ({ activity }) => {
     const message = formatActivityMessage(activity);

     return (
       <div className="activity-item">
         <span className="timestamp">
           {format(activity.timestamp, 'MMM d, HH:mm')}
         </span>
         <p>{message}</p>
       </div>
     );
   };

   // Format messages:
   // "John added Jane to the group"
   // "John promoted Jane to admin"
   // "John changed group name from 'Old Name' to 'New Name'"
   // "Jane left the group"
   ```

2. **Show in Group Info:**
   ```typescript
   <GroupInfo>
     <Tab label="Members" />
     <Tab label="Media" />
     <Tab label="History" />  // ← New tab
   </GroupInfo>
   ```

**Backend ต้องทำ:**
✅ **ต้องทำ:**

1. **Activity Log Storage:**
   ```typescript
   // Database table: group_activities
   {
     id: string;
     groupId: string;
     type: string;
     actorId: string;
     targetId?: string;
     oldValue?: JSON;
     newValue?: JSON;
     createdAt: Date;
   }
   ```

2. **API Endpoint:**
   ```typescript
   GET /api/groups/{groupId}/activities
   Query: { limit: number, offset: number }

   Response: {
     activities: GroupActivity[];
     total: number;
   }
   ```

3. **Log All Group Changes:**
   ```typescript
   // เมื่อมีการเปลี่ยนแปลงกลุ่ม → บันทึก activity
   await logGroupActivity({
     groupId,
     type: 'member_added',
     actorId: currentUserId,
     targetId: newMemberId
   });
   ```

4. **Formatted Messages (Optional):**
   ```typescript
   // Backend อาจส่ง formatted message มาเลย
   {
     "id": "act_123",
     "type": "member_added",
     "message": "John added Jane to the group",
     "timestamp": "2024-01-01T10:00:00Z"
   }
   ```

---

## 🎯 แผนการแก้ไข (เรียงตามลำดับ)

### Phase 1: Backend Development (ต้องทำก่อน)
1. **#7 - Role Management APIs** (Backend)
   - Promote/demote APIs
   - Transfer ownership API
   - Permission validation
   - WebSocket events

2. **#9 - Activity Log** (Backend)
   - Database schema
   - Activity logging
   - API endpoint
   - Format messages

### Phase 2: Frontend - Member Management (2-3 ชม.)
1. **#7 - UI Implementation**
   - Member list with roles
   - Promote/demote actions
   - Transfer ownership dialog
   - Permission-based UI

### Phase 3: Frontend - Activity Log (1-2 ชม.)
2. **#9 - History Tab**
   - Activity log component
   - Format activity messages
   - Pagination
   - Real-time updates

### Phase 4: Testing
1. Test promote/demote
2. Test transfer ownership
3. Test remove member
4. Test activity log
5. Test permissions
6. Test WebSocket updates

---

## 📦 ไฟล์ที่ต้องแก้

**Frontend:**
- `src/components/Group/GroupInfo.tsx`
- `src/components/Group/MemberList.tsx`
- `src/components/Group/MemberItem.tsx` (สร้างใหม่)
- `src/components/Group/ActivityLog.tsx` (สร้างใหม่)
- `src/components/Group/TransferOwnershipDialog.tsx` (สร้างใหม่)
- `src/services/api/groups.ts`
- `src/types/group.ts`

**Backend (ต้องทำ):**
- Group member role management
- Activity logging system
- Permission validation
- WebSocket events

---

## 🎨 UI Design Suggestions

### Member List with Roles:
```
┌──────────────────────────────────┐
│  Group Members (12)              │
├──────────────────────────────────┤
│  👤 John Doe         👑 Owner    │
│     Created the group            │
├──────────────────────────────────┤
│  👤 Jane Smith       ⭐ Admin  ⋮ │
│     Online                       │
├──────────────────────────────────┤
│  👤 Bob Johnson      Member    ⋮ │
│     Last seen 2h ago             │
└──────────────────────────────────┘

Dropdown menu (⋮):
  • Promote to Admin (if owner/admin)
  • Demote to Member (if owner)
  • Remove from Group
  • View Profile
```

### Activity Log:
```
┌──────────────────────────────────┐
│  Group History                   │
├──────────────────────────────────┤
│  📅 Today                        │
│  10:30  John promoted Jane to    │
│         admin                    │
│                                  │
│  09:15  Bob joined the group     │
│                                  │
│  📅 Yesterday                    │
│  20:45  John changed group name  │
│         from "Team" to "Team A"  │
│                                  │
│  18:30  Jane added Bob           │
│                                  │
│  📅 Jan 1                        │
│  10:00  John created the group   │
└──────────────────────────────────┘
```

---

## ⚠️ Permission Rules

```typescript
const PERMISSIONS = {
  // Owner can do everything
  owner: {
    canPromoteToAdmin: true,
    canDemoteAdmin: true,
    canRemoveMember: true,
    canRemoveAdmin: true,
    canEditGroupInfo: true,
    canDeleteGroup: true,
    canTransferOwnership: true,
  },

  // Admin has limited permissions
  admin: {
    canPromoteToAdmin: false,  // Only owner
    canDemoteAdmin: false,     // Only owner
    canRemoveMember: true,     // Can remove members only
    canRemoveAdmin: false,     // Cannot remove other admins
    canEditGroupInfo: true,
    canDeleteGroup: false,
    canTransferOwnership: false,
  },

  // Member has no admin permissions
  member: {
    canPromoteToAdmin: false,
    canDemoteAdmin: false,
    canRemoveMember: false,
    canRemoveAdmin: false,
    canEditGroupInfo: false,
    canDeleteGroup: false,
    canTransferOwnership: false,
  },
};
```

---

## 📊 Activity Types

```typescript
enum GroupActivityType {
  // Group lifecycle
  GROUP_CREATED = 'group_created',
  GROUP_DELETED = 'group_deleted',

  // Group info changes
  GROUP_NAME_CHANGED = 'group_name_changed',
  GROUP_DESCRIPTION_CHANGED = 'group_description_changed',
  GROUP_AVATAR_CHANGED = 'group_avatar_changed',

  // Member changes
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',
  MEMBER_LEFT = 'member_left',
  MEMBER_JOINED = 'member_joined',

  // Role changes
  MEMBER_PROMOTED = 'member_promoted',
  MEMBER_DEMOTED = 'member_demoted',
  OWNERSHIP_TRANSFERRED = 'ownership_transferred',
}
```

---

## ✅ เงื่อนไขการ Test

**#7 - Role Management:**
- [x] Owner promote member → admin
- [x] Owner demote admin → member
- [x] Owner transfer ownership → เปลี่ยน owner สำเร็จ
- [x] Admin ไม่สามารถ promote/demote ได้
- [x] Member ไม่เห็นตัวเลือก manage roles
- [x] Remove member ทำงาน
- [x] WebSocket update roles real-time
- [x] UI แสดง badge role ถูกต้อง

**#9 - Activity Log:**
- [x] แสดง history ครบถ้วน
- [x] จัดเรียงตามเวลา (ใหม่สุดก่อน)
- [x] แสดงข้อความอ่านง่าย
- [x] Group by date
- [x] Real-time update เมื่อมี activity ใหม่
- [x] Pagination ทำงาน
