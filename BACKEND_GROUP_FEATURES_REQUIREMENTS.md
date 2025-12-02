# Backend Requirements: Group Features

**สร้างเมื่อ:** 2025-11-28
**ฟีเจอร์:** Role Management (#7) และ Activity Log (#9)
**จุดประสงค์:** เอกสารนี้ระบุสิ่งที่ Backend ต้องตรวจสอบและพัฒนาเพื่อรองรับฟีเจอร์กลุ่มใหม่

---

## 📋 สรุปฟีเจอร์

### #7: Role Management (การจัดการสิทธิ์สมาชิก)
- ✅ Promote สมาชิกเป็น Admin
- ✅ Demote Admin กลับเป็นสมาชิกทั่วไป
- ✅ โอนความเป็นเจ้าของกลุ่ม (Transfer Ownership)
- ✅ ลบสมาชิกออกจากกลุ่ม
- ✅ ระบบ Permission-based Actions

### #9: Activity Log (ประวัติการเปลี่ยนแปลงกลุ่ม)
- ✅ บันทึกทุกการเปลี่ยนแปลงในกลุ่ม
- ✅ แสดงประวัติการเพิ่ม/ลบสมาชิก
- ✅ แสดงประวัติการเปลี่ยนแปลง role
- ✅ แสดงประวัติการแก้ไขข้อมูลกลุ่ม
- ✅ Real-time updates ผ่าน WebSocket

---

## #7: Role Management - Backend Requirements

### ✅ API Endpoints ที่ต้องมี

#### 1. Update Member Role
```http
PUT /api/groups/{groupId}/members/{userId}/role
Content-Type: application/json
Authorization: Bearer {token}

Request Body:
{
  "role": "admin" | "member"
}

Success Response (200):
{
  "success": true,
  "data": {
    "groupId": "group_123",
    "userId": "user_789",
    "role": "admin",
    "updatedAt": "2024-01-01T10:00:00Z"
  }
}

Error Responses:
- 403 Forbidden: "Only owner can promote/demote admins"
- 404 Not Found: "User not found in group"
- 400 Bad Request: "Cannot demote owner"
```

**Backend ต้องตรวจสอบ:**
- [ ] API endpoint นี้มีหรือยัง?
- [ ] Permission validation: เฉพาะ owner ถึงจะเปลี่ยน role ได้
- [ ] ห้าม demote owner (ต้อง transfer ownership ก่อน)
- [ ] ห้าม promote/demote ตัวเอง
- [ ] Response format ตรงตามที่กำหนดหรือไม่?

---

#### 2. Transfer Group Ownership
```http
POST /api/groups/{groupId}/transfer-ownership
Content-Type: application/json
Authorization: Bearer {token}

Request Body:
{
  "newOwnerId": "user_456"
}

Success Response (200):
{
  "success": true,
  "data": {
    "groupId": "group_123",
    "oldOwnerId": "user_789",
    "newOwnerId": "user_456",
    "transferredAt": "2024-01-01T10:00:00Z"
  }
}

Error Responses:
- 403 Forbidden: "Only owner can transfer ownership"
- 404 Not Found: "Target user not in group"
- 400 Bad Request: "Cannot transfer to yourself"
```

**Backend ต้องทำ:**
- [ ] API endpoint สำหรับ transfer ownership
- [ ] Validation: เฉพาะ owner เท่านั้นที่โอนได้
- [ ] เมื่อโอนแล้ว:
  - [ ] owner เดิม → กลายเป็น admin
  - [ ] owner ใหม่ → กลายเป็น owner
- [ ] ห้ามโอนให้ตัวเอง
- [ ] ห้ามโอนให้คนที่ไม่ได้อยู่ในกลุ่ม

---

#### 3. Remove Member from Group
```http
DELETE /api/groups/{groupId}/members/{userId}
Authorization: Bearer {token}

Success Response (200):
{
  "success": true,
  "data": {
    "groupId": "group_123",
    "removedUserId": "user_456",
    "removedBy": "user_789",
    "removedAt": "2024-01-01T10:00:00Z"
  }
}

Error Responses:
- 403 Forbidden: "No permission to remove members"
- 400 Bad Request: "Cannot remove owner"
- 404 Not Found: "User not found in group"
```

**Backend ต้องตรวจสอบ:**
- [ ] API endpoint นี้มีหรือยัง?
- [ ] Permission rules:
  - [ ] Owner สามารถลบ admin และ member ได้
  - [ ] Admin สามารถลบ member ได้ (แต่ลบ admin ไม่ได้)
  - [ ] Member ลบใครไม่ได้
- [ ] ห้ามลบ owner (ต้อง transfer ownership หรือ delete group)
- [ ] ห้ามลบตัวเอง (ใช้ leave group แทน)

---

### ✅ Permission Validation Rules

**Backend ต้องมี logic นี้:**

```typescript
// Permission matrix
const PERMISSIONS = {
  owner: {
    promoteToAdmin: true,
    demoteAdmin: true,
    removeMember: true,
    removeAdmin: true,
    editGroupInfo: true,
    deleteGroup: true,
    transferOwnership: true
  },
  admin: {
    promoteToAdmin: false,      // ❌ Only owner
    demoteAdmin: false,          // ❌ Only owner
    removeMember: true,          // ✅ Can remove members only
    removeAdmin: false,          // ❌ Cannot remove other admins
    editGroupInfo: true,
    deleteGroup: false,
    transferOwnership: false
  },
  member: {
    // ❌ No admin permissions
    promoteToAdmin: false,
    demoteAdmin: false,
    removeMember: false,
    removeAdmin: false,
    editGroupInfo: false,
    deleteGroup: false,
    transferOwnership: false
  }
}
```

**Backend ต้องเช็ค:**
- [ ] มี middleware/function สำหรับเช็ค permission หรือยัง?
- [ ] ทุก API ที่เกี่ยวกับ role management ต้องมี permission check
- [ ] Return 403 Forbidden ถ้าไม่มีสิทธิ์
- [ ] Log ทุก action เพื่อ security audit

---

### ✅ WebSocket Events

**Backend ต้อง broadcast events เหล่านี้:**

#### Event: Member Role Changed
```json
{
  "event": "group.member.role_changed",
  "data": {
    "groupId": "group_123",
    "userId": "user_789",
    "oldRole": "member",
    "newRole": "admin",
    "changedBy": "user_456",
    "changedAt": "2024-01-01T10:00:00Z"
  }
}
```

**ส่งถึง:** ทุกสมาชิกในกลุ่ม

---

#### Event: Ownership Transferred
```json
{
  "event": "group.ownership_transferred",
  "data": {
    "groupId": "group_123",
    "oldOwnerId": "user_456",
    "newOwnerId": "user_789",
    "transferredAt": "2024-01-01T10:00:00Z"
  }
}
```

**ส่งถึง:** ทุกสมาชิกในกลุ่ม

---

#### Event: Member Removed
```json
{
  "event": "group.member.removed",
  "data": {
    "groupId": "group_123",
    "removedUserId": "user_456",
    "removedBy": "user_789",
    "removedAt": "2024-01-01T10:00:00Z"
  }
}
```

**ส่งถึง:**
- ทุกสมาชิกในกลุ่ม (รวม user ที่ถูกลบ)
- User ที่ถูกลบต้องได้รับ event เพื่อ update UI

---

**Backend ต้องเช็ค:**
- [ ] WebSocket server มีการ broadcast events เหล่านี้หรือยัง?
- [ ] Event format ตรงตามที่กำหนดหรือไม่?
- [ ] ส่งไปถึงทุกสมาชิกในกลุ่มหรือไม่?
- [ ] มีการ handle error กรณีส่ง event ไม่สำเร็จหรือไม่?

---

### ✅ Database Schema

**Backend ต้องเช็คว่า `group_members` table มี column เหล่านี้:**

```sql
CREATE TABLE group_members (
  id VARCHAR(255) PRIMARY KEY,
  group_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_group_user (group_id, user_id)
);
```

**เช็ค:**
- [ ] มี column `role` หรือยัง?
- [ ] `role` เป็น enum('owner', 'admin', 'member') หรือไม่?
- [ ] มี constraint ห้ามมี user ซ้ำในกลุ่มเดียวกันหรือไม่?
- [ ] มีการ index group_id และ user_id หรือไม่?

---

## #9: Activity Log - Backend Requirements

### ✅ Database Schema

**Backend ต้องสร้าง table ใหม่:**

```sql
CREATE TABLE group_activities (
  id VARCHAR(255) PRIMARY KEY,
  group_id VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  actor_id VARCHAR(255) NOT NULL,      -- คนที่ทำ action
  target_id VARCHAR(255),                -- คนที่ถูกกระทำ (optional)
  old_value JSON,                        -- ค่าเก่า (สำหรับการแก้ไข)
  new_value JSON,                        -- ค่าใหม่
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_group_created (group_id, created_at DESC)
);
```

**เช็ค:**
- [ ] Table `group_activities` มีหรือยัง?
- [ ] มี column ครบตามที่กำหนดหรือไม่?
- [ ] มี index สำหรับ query ตาม group_id + created_at หรือไม่?
- [ ] Foreign keys ถูกต้องหรือไม่?

---

### ✅ Activity Types

**Backend ต้องรองรับ activity types เหล่านี้:**

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
  MEMBER_PROMOTED = 'member_promoted',        // member → admin
  MEMBER_DEMOTED = 'member_demoted',          // admin → member
  OWNERSHIP_TRANSFERRED = 'ownership_transferred'
}
```

**เช็ค:**
- [ ] Backend มี enum/constant สำหรับ activity types หรือยัง?
- [ ] ครบทุก type ที่กำหนดหรือไม่?

---

### ✅ API Endpoint

```http
GET /api/groups/{groupId}/activities
Authorization: Bearer {token}
Query Parameters:
  - limit: number (default: 20, max: 100)
  - offset: number (default: 0)
  - type: string (optional, filter by activity type)

Success Response (200):
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "act_123",
        "type": "member_promoted",
        "actor": {
          "id": "user_456",
          "name": "John Doe",
          "avatar": "https://..."
        },
        "target": {
          "id": "user_789",
          "name": "Jane Smith",
          "avatar": "https://..."
        },
        "oldValue": "member",
        "newValue": "admin",
        "createdAt": "2024-01-01T10:00:00Z"
      },
      {
        "id": "act_124",
        "type": "group_name_changed",
        "actor": {
          "id": "user_456",
          "name": "John Doe",
          "avatar": "https://..."
        },
        "oldValue": "Old Group Name",
        "newValue": "New Group Name",
        "createdAt": "2024-01-01T09:30:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**Backend ต้องเช็ค:**
- [ ] API endpoint นี้มีหรือยัง?
- [ ] รองรับ pagination (limit, offset) หรือไม่?
- [ ] รองรับ filter by type หรือไม่?
- [ ] Response format ตรงตามที่กำหนดหรือไม่?
- [ ] เรียงลำดับจากใหม่สุดไปเก่าสุด (DESC) หรือไม่?
- [ ] Include user info (actor, target) หรือ return แค่ userId?

---

### ✅ Auto-Logging Activities

**Backend ต้องบันทึก activity เมื่อมีการกระทำเหล่านี้:**

#### 1. เมื่อสร้างกลุ่ม
```typescript
await logGroupActivity({
  groupId: newGroup.id,
  type: 'group_created',
  actorId: creatorUserId,
  targetId: null
});
```

#### 2. เมื่อเพิ่มสมาชิก
```typescript
await logGroupActivity({
  groupId: group.id,
  type: 'member_added',
  actorId: currentUserId,
  targetId: newMemberId
});
```

#### 3. เมื่อลบสมาชิก
```typescript
await logGroupActivity({
  groupId: group.id,
  type: 'member_removed',
  actorId: currentUserId,
  targetId: removedUserId
});
```

#### 4. เมื่อสมาชิกออกกลุ่มเอง
```typescript
await logGroupActivity({
  groupId: group.id,
  type: 'member_left',
  actorId: userId,
  targetId: userId  // actor และ target เป็นคนเดียวกัน
});
```

#### 5. เมื่อเปลี่ยน role
```typescript
await logGroupActivity({
  groupId: group.id,
  type: 'member_promoted',  // หรือ 'member_demoted'
  actorId: currentUserId,
  targetId: targetUserId,
  oldValue: 'member',
  newValue: 'admin'
});
```

#### 6. เมื่อโอน ownership
```typescript
await logGroupActivity({
  groupId: group.id,
  type: 'ownership_transferred',
  actorId: oldOwnerId,
  targetId: newOwnerId,
  oldValue: oldOwnerId,
  newValue: newOwnerId
});
```

#### 7. เมื่อแก้ไขชื่อกลุ่ม
```typescript
await logGroupActivity({
  groupId: group.id,
  type: 'group_name_changed',
  actorId: currentUserId,
  oldValue: 'Old Name',
  newValue: 'New Name'
});
```

#### 8. เมื่อเปลี่ยนรูปกลุ่ม
```typescript
await logGroupActivity({
  groupId: group.id,
  type: 'group_avatar_changed',
  actorId: currentUserId,
  oldValue: 'old_avatar_url',
  newValue: 'new_avatar_url'
});
```

**Backend ต้องเช็ค:**
- [ ] มี function/service สำหรับบันทึก activity หรือยัง?
- [ ] ทุก endpoint ที่เกี่ยวข้องกับกลุ่มเรียกใช้ logging หรือไม่?
- [ ] Logging ทำงานแบบ async (ไม่ block main flow) หรือไม่?
- [ ] มีการ handle error ถ้า logging ล้มเหลวหรือไม่?

---

### ✅ WebSocket Events for Activities

**Backend ต้อง broadcast event ใหม่เมื่อมี activity:**

```json
{
  "event": "group.activity.new",
  "data": {
    "groupId": "group_123",
    "activity": {
      "id": "act_123",
      "type": "member_promoted",
      "actor": {
        "id": "user_456",
        "name": "John Doe",
        "avatar": "https://..."
      },
      "target": {
        "id": "user_789",
        "name": "Jane Smith",
        "avatar": "https://..."
      },
      "oldValue": "member",
      "newValue": "admin",
      "createdAt": "2024-01-01T10:00:00Z"
    }
  }
}
```

**ส่งถึง:** ทุกสมาชิกในกลุ่มที่เปิด Activity Log อยู่

**เช็ค:**
- [ ] WebSocket event สำหรับ activity ใหม่มีหรือยัง?
- [ ] Format ถูกต้องหรือไม่?
- [ ] ส่ง real-time ทุกครั้งที่มี activity ใหม่หรือไม่?

---

### ✅ Optional: Formatted Messages

**Backend อาจส่ง formatted message มาเลย (Frontend ไม่ต้อง format เอง):**

```json
{
  "id": "act_123",
  "type": "member_promoted",
  "message": "John promoted Jane to admin",
  "messageLocalized": {
    "en": "John promoted Jane to admin",
    "th": "John เปลี่ยนสิทธิ์ Jane เป็นผู้ดูแล"
  },
  "createdAt": "2024-01-01T10:00:00Z"
}
```

**เช็ค:**
- [ ] Backend จะส่ง formatted message มาให้หรือไม่?
- [ ] รองรับหลายภาษาหรือไม่?
- [ ] หรือให้ Frontend format เอง?

---

## 🔍 Security Checklist

**Backend ต้องตรวจสอบ:**

### Authentication & Authorization
- [ ] ทุก API ต้องมี authentication (Bearer token)
- [ ] Validate ว่า user เป็นสมาชิกของกลุ่มก่อนทำ action
- [ ] Validate permission ตาม role (owner/admin/member)
- [ ] Return 401 Unauthorized ถ้าไม่ได้ login
- [ ] Return 403 Forbidden ถ้าไม่มีสิทธิ์
- [ ] Return 404 Not Found ถ้าไม่พบกลุ่ม/user

### Input Validation
- [ ] Validate groupId format (UUID, length, etc.)
- [ ] Validate userId format
- [ ] Validate role เป็น enum ที่กำหนดเท่านั้น
- [ ] Validate pagination parameters (limit, offset)
- [ ] Sanitize input เพื่อป้องกัน SQL injection

### Business Logic Validation
- [ ] ห้าม promote/demote owner
- [ ] ห้ามโอน ownership ให้ตัวเอง
- [ ] ห้ามลบ owner ออกจากกลุ่ม
- [ ] ห้ามมี owner มากกว่า 1 คน
- [ ] Validate user อยู่ในกลุ่มก่อนทำ action

### Logging & Monitoring
- [ ] Log ทุก permission-related error
- [ ] Log ทุก role change สำหรับ audit
- [ ] Monitor suspicious activities (เช่น promote/demote บ่อยเกินไป)

---

## 🧪 Testing Checklist

**Backend ต้องทำ unit tests สำหรับ:**

### Role Management Tests
- [ ] ✅ Owner promote member → admin สำเร็จ
- [ ] ✅ Owner demote admin → member สำเร็จ
- [ ] ✅ Owner transfer ownership → เปลี่ยน owner สำเร็จ
- [ ] ❌ Admin promote member → ได้ 403 Forbidden
- [ ] ❌ Member promote → ได้ 403 Forbidden
- [ ] ❌ Demote owner → ได้ 400 Bad Request
- [ ] ❌ Transfer ownership ให้ตัวเอง → ได้ 400 Bad Request
- [ ] ❌ Remove owner → ได้ 400 Bad Request
- [ ] ✅ Owner remove admin → สำเร็จ
- [ ] ✅ Admin remove member → สำเร็จ
- [ ] ❌ Admin remove another admin → ได้ 403 Forbidden

### Activity Log Tests
- [ ] ✅ Create group → บันทึก activity
- [ ] ✅ Add member → บันทึก activity
- [ ] ✅ Remove member → บันทึก activity
- [ ] ✅ Promote member → บันทึก activity
- [ ] ✅ Demote admin → บันทึก activity
- [ ] ✅ Transfer ownership → บันทึก activity
- [ ] ✅ Change group name → บันทึก activity
- [ ] ✅ GET /activities → return ถูกต้อง
- [ ] ✅ Pagination ทำงาน
- [ ] ✅ Filter by type ทำงาน

### WebSocket Tests
- [ ] ✅ Role changed → broadcast to all members
- [ ] ✅ Member removed → broadcast to all members
- [ ] ✅ Ownership transferred → broadcast to all members
- [ ] ✅ New activity → broadcast to group members

---

## 📊 Response Summary

**Backend ต้องตอบกลับมาว่า:**

1. **API Endpoints:**
   - [ ] PUT `/api/groups/{groupId}/members/{userId}/role` - มี/ไม่มี
   - [ ] POST `/api/groups/{groupId}/transfer-ownership` - มี/ไม่มี
   - [ ] DELETE `/api/groups/{groupId}/members/{userId}` - มี/ไม่มี
   - [ ] GET `/api/groups/{groupId}/activities` - มี/ไม่มี

2. **Database:**
   - [ ] `group_members.role` column - มี/ไม่มี
   - [ ] `group_activities` table - มี/ไม่มี

3. **Permission System:**
   - [ ] Role-based permission validation - มี/ไม่มี
   - [ ] Owner/Admin/Member rules - ถูกต้อง/ต้องแก้ไข

4. **WebSocket Events:**
   - [ ] `group.member.role_changed` - มี/ไม่มี
   - [ ] `group.ownership_transferred` - มี/ไม่มี
   - [ ] `group.member.removed` - มี/ไม่มี
   - [ ] `group.activity.new` - มี/ไม่มี

5. **Activity Logging:**
   - [ ] Auto-log system - มี/ไม่มี
   - [ ] ครบทุก activity type หรือไม่

6. **สิ่งที่ต้องพัฒนาเพิ่ม:**
   - ระบุส่วนที่ยังไม่มีและต้องทำ

---

## 📝 คำถามสำหรับ Backend Team

1. **Database Schema:**
   - Table `group_members` มี column `role` หรือยังครับ?
   - Table `group_activities` มีแล้วหรือยังครับ? ถ้ายังต้องสร้างใหม่

2. **API Endpoints:**
   - API สำหรับ promote/demote member มีแล้วหรือยัง?
   - API สำหรับ transfer ownership มีหรือยัง?
   - API สำหรับดึง activity log มีหรือยัง?

3. **Permission System:**
   - ตอนนี้มีระบบ permission validation แล้วหรือยัง?
   - Role-based access control ทำงานอย่างไรครับ?

4. **WebSocket:**
   - WebSocket events สำหรับ role management มีหรือยัง?
   - WebSocket สำหรับ activity log มีหรือยัง?

5. **Activity Logging:**
   - มี service/function สำหรับบันทึก activity อัตโนมัติหรือยัง?
   - บันทึกครบทุก action หรือยัง?

6. **Timeline:**
   - ถ้ายังไม่มี ประมาณว่าจะทำเสร็จเมื่อไหร่ครับ?
   - มีอะไรที่ต้องการความช่วยเหลือจาก Frontend หรือไม่?

---

## 🎯 สรุป Priority

### Priority 1 (ต้องมีก่อน Frontend จะทำได้):
1. ✅ API: PUT `/api/groups/{groupId}/members/{userId}/role`
2. ✅ API: POST `/api/groups/{groupId}/transfer-ownership`
3. ✅ API: DELETE `/api/groups/{groupId}/members/{userId}`
4. ✅ Permission validation system
5. ✅ WebSocket events for role changes

### Priority 2 (ควรมีสำหรับ UX ที่ดี):
1. ✅ Table `group_activities`
2. ✅ API: GET `/api/groups/{groupId}/activities`
3. ✅ Auto-logging system
4. ✅ WebSocket event: `group.activity.new`

### Nice to Have:
1. ⭐ Formatted activity messages from Backend
2. ⭐ Multi-language support
3. ⭐ Activity filtering และ search

---

**หมายเหตุ:** กรุณาตรวจสอบและตอบกลับมาเป็นข้อ ๆ ว่าส่วนไหนมีแล้ว ส่วนไหนต้องพัฒนาเพิ่ม และประมาณการเวลาที่จะใช้ครับ 🙏
