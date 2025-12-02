# ✅ Backend Solution: Notification และ Read Status

**Status: ✅ Backend พร้อมใช้งานแล้ว - Frontend ต้องปรับปรุงเพื่อใช้ API ที่ถูกต้อง**

---

## 📋 สรุปปัญหาและการแก้ไข

### #24: ยังไม่กดอ่าน แต่ notification หาย

#### ✅ Backend Features ที่พร้อมใช้งาน:

**1. Message Read Tracking System ✅**
- **Model:** `MessageRead` - domain/models/message_read.go
  ```go
  type MessageRead struct {
      ID        uuid.UUID
      MessageID uuid.UUID
      UserID    uuid.UUID
      ReadAt    time.Time
  }
  ```
- ✅ Track แต่ละข้อความว่าใครอ่านเมื่อไร
- ✅ รองรับ group chat (หลายคนอ่าน)

**2. Conversation Member Last Read ✅**
- **Field:** `last_read_at` ใน `conversation_members` table
- ✅ บันทึกเวลาอ่านล่าสุดของแต่ละคน
- ✅ ใช้คำนวณ unread count

**3. API Endpoints ✅**

**Mark Messages as Read:**
```http
POST /api/v1/conversations/:conversationId/messages/:messageId/read

Response:
{
  "success": true,
  "message": "Message marked as read"
}
```

**Mark All Messages as Read:**
```http
POST /api/v1/conversations/:conversationId/messages/read-all

Response:
{
  "success": true,
  "message": "All messages marked as read",
  "data": {
    "conversation_id": "uuid",
    "marked_count": 5
  }
}
```

**Get Unread Counts:**
```http
GET /api/v1/conversations/unread

Response:
{
  "success": true,
  "data": [
    {
      "conversation_id": "uuid",
      "unread_count": 3,
      "last_message": {
        "id": "uuid",
        "content": "...",
        "created_at": "..."
      }
    }
  ]
}
```

**4. WebSocket Events ✅**

**เมื่อมีคนอ่านข้อความ:**
```javascript
// Event: message.read
{
  "type": "message.read",
  "data": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "user_id": "uuid",
    "read_at": "2024-01-27T10:30:00Z"
  }
}
```

**เมื่อมีคนอ่านข้อความทั้งหมด:**
```javascript
// Event: message.read_all
{
  "type": "message.read_all",
  "data": {
    "conversation_id": "uuid",
    "user_id": "uuid",
    "read_at": "2024-01-27T10:30:00Z"
  }
}
```

**5. Unread Count Calculation ✅**
- ✅ คำนวณจาก `messages.created_at > conversation_members.last_read_at`
- ✅ ไม่นับข้อความที่ถูกลบ (`is_deleted = false`)
- ✅ ไม่นับข้อความของตัวเอง

---

### #25: คนส่งขึ้นอ่านแล้ว ทั้งที่ยังไม่อ่าน

#### ✅ Backend Features ที่พร้อมใช้งาน:

**1. Message Status Tracking ✅**
- **Model:** `Message` มี fields:
  ```go
  type Message struct {
      Status      string     // "sent", "delivered", "read"
      DeliveredAt *time.Time
      ReadAt      *time.Time

      // Associations
      Reads []*MessageRead // ข้อมูลว่าใครอ่านเมื่อไร
  }
  ```

**2. Read Status per User (Group Chat) ✅**
- **Repository:** `GetMessageReads()` - รายชื่อคนที่อ่าน
  ```go
  func GetMessageReads(messageID uuid.UUID) ([]*MessageRead, error)
  ```
- ✅ รองรับการแสดงว่าใครอ่านแล้วในกลุ่ม
- ✅ พร้อม timestamp ที่อ่าน

**3. Real-time Read Receipts ✅**

**WebSocket Event เมื่อข้อความถูกอ่าน:**
```javascript
// Event: message.read
{
  "type": "message.read",
  "data": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "user_id": "uuid",        // ใครอ่าน
    "read_at": "2024-01-27T10:30:00Z"
  }
}
```

**ผู้ส่งข้อความจะได้รับ event นี้** → สามารถ update UI แสดง ✓✓ สีฟ้า

**4. Get Message Read Status ✅**
```http
GET /api/v1/messages/:messageId

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "...",
    "status": "read",
    "read_at": "2024-01-27T10:30:00Z",
    "reads": [
      {
        "user_id": "user_1",
        "read_at": "2024-01-27T10:30:00Z"
      },
      {
        "user_id": "user_2",
        "read_at": "2024-01-27T10:35:00Z"
      }
    ]
  }
}
```

---

## 🎯 Business Logic ที่ Backend จัดการให้

### Auto-Update Read Status ✅
เมื่อ user mark message as read:
1. ✅ สร้าง `MessageRead` record
2. ✅ อัปเดต `conversation_members.last_read_at`
3. ✅ อัปเดต `messages.status` → "read"
4. ✅ อัปเดต `messages.read_at`
5. ✅ ส่ง WebSocket event `message.read` ไปหาผู้ส่ง

### Prevent Duplicate Reads ✅
```go
// ตรวจสอบว่าอ่านแล้วหรือยัง
isRead, err := messageRepo.IsMessageRead(messageID, userID)
if isRead {
    return nil // ถ้าอ่านแล้ว ไม่ต้องทำอะไร
}
```

### Sender Exclusion ✅
- ✅ ผู้ส่งไม่นับเป็น unread
- ✅ ผู้ส่งถูก mark as read อัตโนมัติ

---

## 📊 Service Layer Implementation

### MessageReadService ✅

**File:** `application/serviceimpl/message_read_service.go`

**Methods:**
```go
// Mark single message as read
MarkMessageAsRead(conversationID, messageID, userID uuid.UUID) error

// Mark all messages as read
MarkAllMessagesAsRead(conversationID, userID uuid.UUID) error

// Get unread messages count
GetUnreadMessagesCount(conversationID, userID uuid.UUID) (int64, error)

// Get list of users who read a message
GetMessageReads(messageID, userID uuid.UUID) ([]*models.MessageRead, error)
```

**Features:**
- ✅ Permission checks (ต้องเป็นสมาชิกของ conversation)
- ✅ WebSocket notifications
- ✅ Database transactions
- ✅ Error handling

---

## 🔧 Frontend Integration Guide

### การใช้งานที่ถูกต้อง

**1. Mark as Read เมื่อ User เปิดแชท:**
```typescript
// ✅ ถูกต้อง: เมื่อ navigate เข้า conversation
const openConversation = async (conversationId: string) => {
  // Navigate to conversation
  router.push(`/chat/${conversationId}`);

  // Mark all as read
  await api.post(`/conversations/${conversationId}/messages/read-all`);
};
```

**2. Mark as Read แบบ Incremental (Intersection Observer):**
```typescript
// ✅ ถูกต้อง: เมื่อ message เข้า viewport จริงๆ
const observer = new IntersectionObserver((entries) => {
  entries.forEach(async (entry) => {
    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
      const messageId = entry.target.dataset.messageId;
      await api.post(`/conversations/${conversationId}/messages/${messageId}/read`);
    }
  });
}, { threshold: 0.5 });
```

**3. Listen WebSocket Events:**
```typescript
// ✅ ฟัง read events เพื่อ update UI
socket.on('message.read', (data) => {
  // Update read status ของข้อความที่ user ส่ง
  updateMessageReadStatus(data.message_id, data.user_id, data.read_at);
});

socket.on('message.read_all', (data) => {
  // Mark conversation as all read
  markConversationAsRead(data.conversation_id);
});
```

**4. Get Unread Counts:**
```typescript
// ✅ Fetch unread counts เมื่อ app load
const fetchUnreadCounts = async () => {
  const response = await api.get('/conversations/unread');
  const unreadCounts = response.data.data;

  // Update badge counts
  unreadCounts.forEach(({ conversation_id, unread_count }) => {
    updateConversationBadge(conversation_id, unread_count);
  });
};
```

---

## ❌ สิ่งที่ Frontend ไม่ควรทำ

**1. ❌ Mark as read on hover:**
```typescript
// ❌ ผิด: อย่า mark as read แค่ hover
<ConversationItem
  onMouseEnter={() => markAsRead()} // ❌ ผิด
/>
```

**2. ❌ Mark as read on preview load:**
```typescript
// ❌ ผิด: อย่า mark as read แค่ load preview
const loadPreview = async (conversationId) => {
  const messages = await fetchMessages(conversationId);
  await markAsRead(conversationId); // ❌ ผิด
};
```

**3. ❌ Auto mark as read on message fetch:**
```typescript
// ❌ ผิด: อย่า mark as read ทันทีที่ fetch
useEffect(() => {
  fetchMessages(conversationId);
  markAsRead(conversationId); // ❌ ผิด - ยัง render ไม่เสร็จ
}, [conversationId]);
```

**4. ❌ Mark as read in background tab:**
```typescript
// ❌ ผิด: อย่า mark as read ถ้า tab ไม่ active
if (!document.hidden) {
  markAsRead(); // ✅ ถูก
}
```

---

## 📋 Checklist สำหรับ Frontend

### Must Fix:
- [ ] เปลี่ยนจาก auto-mark-as-read → manual trigger เมื่อ user เปิดแชทจริงๆ
- [ ] เพิ่ม Intersection Observer สำหรับ mark individual messages
- [ ] ฟัง WebSocket events: `message.read`, `message.read_all`
- [ ] แสดง read receipts ตาม backend data (✓ sent, ✓✓ delivered, ✓✓ read)
- [ ] Update badge counts เมื่อได้รับ WebSocket events
- [ ] ตรวจสอบ document.hidden ก่อน mark as read

### Nice to Have:
- [ ] Debounce mark-as-read requests
- [ ] Batch mark-as-read requests
- [ ] Offline queue สำหรับ mark-as-read
- [ ] Visual feedback เมื่อ marking as read

---

## 🎯 Testing Guide

### Test Case #24: Notification Badge
```
1. User A ส่งข้อความให้ User B
   ✅ Expected: User B เห็น badge (1) ที่ conversation

2. User B hover conversation (ไม่เปิด)
   ✅ Expected: Badge ยังอยู่ (1)

3. User B click เข้า conversation
   ✅ Expected: Badge หาย (0)

4. User B ออกจาก conversation
   User A ส่งข้อความใหม่
   ✅ Expected: Badge กลับมา (1)
```

### Test Case #25: Read Receipt
```
1. User A ส่งข้อความ
   ✅ Expected: User A เห็น ✓ (sent)

2. User B ได้รับ (ยังไม่เปิด)
   ✅ Expected: User A เห็น ✓✓ (delivered)

3. User B เปิดแชท และอ่านข้อความ
   ✅ Expected: User A เห็น ✓✓ สีฟ้า (read)

4. Group Chat: User B และ User C อ่าน
   ✅ Expected: User A เห็น "อ่านโดย 2 คน" หรือรายชื่อ
```

---

## ✅ สรุป

### Backend Status: ✅ พร้อมใช้งานครบ 100%

**Features ที่มีให้:**
- ✅ Message Read Tracking (per user)
- ✅ Last Read Timestamp (per conversation member)
- ✅ Unread Count API
- ✅ Mark as Read API (single + all)
- ✅ WebSocket Events (real-time)
- ✅ Read Status for Group Chat
- ✅ Permission Checks
- ✅ Auto-create read for sender

**Frontend ต้องทำ:**
- 🔧 ปรับ logic การ mark as read ให้ถูกต้อง
- 🔧 ใช้ Intersection Observer
- 🔧 ฟัง WebSocket events
- 🔧 แสดง read receipts จาก backend data
- 🔧 Check document visibility

**ประมาณเวลาแก้ Frontend:** 3-4 ชั่วโมง
