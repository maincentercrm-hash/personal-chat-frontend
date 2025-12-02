# 🔧 Backend Requirements Summary

**เอกสารนี้รวบรวมสิ่งที่ Backend ต้องทำเพื่อรองรับการแก้ไขปัญหาทั้งหมด**

---

## 🔴 CRITICAL PRIORITY (ต้องทำก่อนสุด)

### 1. Message Edit Sync (#22)
**WebSocket Event สำหรับการแก้ไขข้อความ**

```typescript
// Event: message.updated
{
  event: 'message.updated',
  data: {
    messageId: string;
    conversationId: string;
    newContent: string;
    editedAt: string;
  }
}
```

**APIs:**
- `PUT /api/messages/{id}` - แก้ไขข้อความ (มีอยู่แล้วหรือไม่?)

---

## 🔴 HIGH PRIORITY

### 2. Notification & Read Status (#24, #25)
**ระบบ Read Receipt และ Notification ที่ถูกต้อง**

**APIs:**
```typescript
// Mark as read
POST /api/conversations/{id}/read
Body: { lastReadMessageId: string }
Response: { unreadCount: number }

// Unread counts
GET /api/conversations/unread-counts
Response: {
  conversations: Array<{
    conversationId: string;
    unreadCount: number;
  }>
}
```

**WebSocket Events:**
```typescript
// Message delivered
{
  event: 'message.delivered',
  data: {
    messageId: string;
    deliveredAt: string;
  }
}

// Message read
{
  event: 'message.read',
  data: {
    conversationId: string;
    userId: string;
    lastReadMessageId: string;
    readAt: string;
  }
}
```

**Message Schema Update:**
```typescript
{
  messageId: string;
  status: 'sent' | 'delivered' | 'read';
  deliveredAt?: Date;
  readAt?: Date;
  readBy?: Array<{  // For group chat
    userId: string;
    readAt: Date;
  }>;
}
```

---

### 3. Block User (#26, #27) ⚠️ CRITICAL BUG

**APIs:**
```typescript
POST /api/users/{userId}/block
POST /api/users/{userId}/unblock
GET /api/users/blocked          // รายชื่อคนที่เราบล็อค
GET /api/users/blocked-by       // รายชื่อคนที่บล็อคเรา (optional)
```

**Block Enforcement (CRITICAL):**
```typescript
// ต้อง validate ทุกครั้งก่อนส่งข้อความ
async function canSendMessage(senderId, receiverId) {
  const isBlocked = await checkBlockStatus(senderId, receiverId);
  if (isBlocked) {
    throw new Error('Cannot send message to blocked user');
  }
}

// WebSocket message filtering
// ก่อนส่งข้อความผ่าน WebSocket → ตรวจสอบ block status
```

**Response Format:**
```json
{
  "userId": "user_123",
  "blockStatus": {
    "isBlocked": false,      // เราบล็อคคนนี้หรือไม่
    "isBlockedBy": false     // คนนี้บล็อคเราหรือไม่
  }
}
```

**WebSocket Event:**
```typescript
{
  event: 'user.blocked',
  data: {
    blockerId: string;
    blockedUserId: string;
    blockedAt: string;
  }
}
```

---

### 4. Friend Request System (#15)

**APIs:**
```typescript
// Friend requests
GET /api/friend-requests/received
GET /api/friend-requests/sent
POST /api/friend-requests/{userId}      // Send request
POST /api/friend-requests/{id}/accept
POST /api/friend-requests/{id}/reject
DELETE /api/friend-requests/{id}        // Cancel request

// Prevent duplicates
// Return error if pending request exists
```

**Response:**
```json
{
  "id": "req_123",
  "from": {
    "id": "user_456",
    "username": "john_doe",
    "displayName": "John Doe",
    "avatar": "..."
  },
  "to": { ... },
  "status": "pending" | "accepted" | "rejected",
  "createdAt": "2024-01-01T10:00:00Z"
}
```

**WebSocket Events:**
```typescript
{
  event: 'friend_request.received',
  data: { requestId, from: User }
}

{
  event: 'friend_request.accepted',
  data: { requestId, to: User }
}

{
  event: 'friend_request.rejected',
  data: { requestId }
}
```

**Option: Message Requests (แนะนำ)**
```typescript
// ให้ส่งข้อความได้โดยไม่ต้องเป็นเพื่อนก่อน
POST /api/conversations/message-request/{userId}
GET /api/conversations/message-requests
POST /api/conversations/message-requests/{id}/accept
POST /api/conversations/message-requests/{id}/reject

// Conversation type
enum ConversationType {
  NORMAL = 'normal',
  MESSAGE_REQUEST = 'message_request'
}
```

---

## 🟡 MEDIUM PRIORITY

### 5. Video Upload (#10)

**File Upload:**
```typescript
POST /api/upload/video
Content-Type: multipart/form-data
Max size: 100MB

// Allowed types
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime'
];
```

**Response:**
```json
{
  "id": "file_123",
  "url": "https://cdn.example.com/video.mp4",
  "thumbnail": "https://cdn.example.com/thumb.jpg",
  "duration": 120,
  "size": 52428800,
  "mimeType": "video/mp4",
  "width": 1920,
  "height": 1080
}
```

**Recommendations:**
- ใช้ CDN (S3, Cloudinary, etc.)
- Generate thumbnail
- Get video metadata (duration, resolution)
- Optional: Video compression

---

### 6. Online Status & User Presence (#6)

**APIs:**
```typescript
GET /api/users/{id}/online-status
Response: {
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
}
```

**WebSocket Events:**
```typescript
{
  event: 'user.online',
  data: { userId: string }
}

{
  event: 'user.offline',
  data: {
    userId: string,
    lastSeen: string
  }
}

{
  event: 'user.typing',
  data: {
    userId: string,
    conversationId: string
  }
}
```

---

### 7. Group Member Roles (#7)

**APIs:**
```typescript
// Change member role
PUT /api/groups/{groupId}/members/{userId}/role
Body: { role: 'admin' | 'member' }

// Transfer ownership
POST /api/groups/{groupId}/transfer-ownership
Body: { newOwnerId: string }

// Remove member
DELETE /api/groups/{groupId}/members/{userId}
```

**Permission Validation:**
```typescript
// Backend must validate:
// - Only owner/admin can change roles
// - Owner cannot be demoted (must transfer first)
// - Cannot remove owner
```

**WebSocket Event:**
```typescript
{
  event: 'group.member.role_changed',
  data: {
    groupId: string;
    userId: string;
    oldRole: string;
    newRole: string;
    changedBy: string;
  }
}
```

---

### 8. Group Activity Log (#9)

**Database:**
```typescript
// Table: group_activities
{
  id: string;
  groupId: string;
  type: 'member_added' | 'member_removed' | 'role_changed' | ...;
  actorId: string;
  targetId?: string;
  oldValue?: JSON;
  newValue?: JSON;
  createdAt: Date;
}
```

**API:**
```typescript
GET /api/groups/{groupId}/activities
Query: { limit: number, offset: number }

Response: {
  activities: Array<{
    id: string;
    type: string;
    actor: User;
    target?: User;
    oldValue?: any;
    newValue?: any;
    timestamp: Date;
  }>;
  total: number;
}
```

**Log All Changes:**
- สร้างกลุ่ม
- เปลี่ยนชื่อกลุ่ม
- เปลี่ยนรูปกลุ่ม
- เพิ่ม/ลบสมาชิก
- เปลี่ยน role
- โอน ownership

---

## 🟢 LOW PRIORITY (Feature Requests)

### 9. Mentions / Tags (#8)

**Message Schema:**
```typescript
{
  content: string;
  mentions: Array<{
    userId: string;
    startIndex: number;
    length: number;
  }>;
}
```

**API:**
```typescript
POST /api/messages
Body: {
  conversationId: string;
  content: string;
  mentions: MentionData[];
}
```

**Notification:**
- ส่ง notification ให้คนที่ถูก mention
- Push notification + WebSocket event

---

### 10. Pin Conversations (#12)

**API:**
```typescript
PUT /api/conversations/{id}/pin
DELETE /api/conversations/{id}/pin

// Add field
{
  isPinned: boolean;
  pinnedAt?: Date;
}
```

---

### 11. Pin Messages (#12)

**API:**
```typescript
PUT /api/messages/{id}/pin
DELETE /api/messages/{id}/pin
GET /api/conversations/{id}/pinned-messages

// Add field
{
  isPinned: boolean;
  pinnedBy: string;
  pinnedAt: Date;
}
```

---

### 12. Search Messages (#16)

**API:**
```typescript
GET /api/messages/search
Query: {
  q: string;                    // Search query
  conversationId?: string;      // Optional
  limit?: number;
  offset?: number;
}

Response: {
  results: Array<{
    message: Message;
    conversation: Conversation;
    matchedText: string;
  }>;
  total: number;
}
```

**Implementation:**
- Full-text search (PostgreSQL, MySQL)
- หรือ Elasticsearch / Algolia

---

### 13. Forward Messages (#17)

**API:**
```typescript
POST /api/messages/forward
Body: {
  messageIds: string[];
  targetConversationIds: string[];
}

// Message format
{
  content: string;
  isForwarded: true;
  forwardedFrom: {
    messageId: string;
    senderId: string;
    conversationId: string;
  }
}
```

---

### 14. Scheduled Messages (#19)

**Database:**
```typescript
// Table: scheduled_messages
{
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  scheduledAt: Date;
  status: 'pending' | 'sent' | 'cancelled';
  sentAt?: Date;
}
```

**APIs:**
```typescript
POST /api/messages/schedule
Body: {
  conversationId: string;
  content: string;
  scheduledAt: string;
}

GET /api/messages/scheduled         // List
DELETE /api/messages/scheduled/{id} // Cancel
```

**Background Job:**
- Cron job ตรวจสอบ scheduled messages
- ส่งข้อความตามเวลาที่กำหนด

---

### 15. Jump to Date (#20)

**API:**
```typescript
GET /api/conversations/{id}/messages/by-date
Query: {
  date: string;  // YYYY-MM-DD
  limit: number;
}
```

---

### 16. Notes (#21)

**APIs:**
```typescript
POST /api/notes
GET /api/notes
PUT /api/notes/{id}
DELETE /api/notes/{id}

// Schema
{
  id: string;
  userId: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 📋 สรุป Priority

### ต้องทำก่อนสุด (CRITICAL):
1. ✅ Block User Enforcement (#27) - **BUG ร้ายแรง**
2. ✅ Message Edit Sync (#22)
3. ✅ Notification & Read Status (#24, #25)

### ต้องทำ (HIGH):
4. ✅ Friend Request System (#15)
5. ✅ Video Upload (#10)
6. ✅ Online Status (#6)

### ควรทำ (MEDIUM):
7. ⭐ Group Member Roles (#7)
8. ⭐ Group Activity Log (#9)

### ทำภายหลัง (LOW):
9. Mentions (#8)
10. Pin Conversations/Messages (#12)
11. Search (#16)
12. Forward (#17)
13. Scheduled Messages (#19)
14. Jump to Date (#20)
15. Notes (#21)

---

## 🔄 WebSocket Events Summary

```typescript
// Messages
'message.sent'
'message.delivered'
'message.read'
'message.updated'

// Users
'user.online'
'user.offline'
'user.typing'
'user.blocked'

// Friend Requests
'friend_request.received'
'friend_request.accepted'
'friend_request.rejected'
'friend_request.cancelled'

// Groups
'group.member.added'
'group.member.removed'
'group.member.role_changed'
'group.info.updated'
```

---

## 📝 หมายเหตุสำหรับทีม Backend

1. **Block User (#27)** เป็น bug ร้ายแรง ต้องแก้ก่อนสุด
2. **Read Status (#25)** ต้องแยก delivered กับ read ให้ชัดเจน
3. **Friend Request** แนะนำให้ทำแบบ Hybrid (Message Request)
4. **Video Upload** แนะนำใช้ CDN
5. **Search** แนะนำใช้ Elasticsearch สำหรับ performance
6. **Scheduled Messages** ต้องมี background job

ถ้ามีคำถามหรือต้องการรายละเอียดเพิ่มเติม สามารถดูได้ในไฟล์แต่ละหัวข้อครับ
