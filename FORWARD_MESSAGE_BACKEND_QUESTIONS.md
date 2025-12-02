# Forward Message - Backend WebSocket Integration Questions

## 📋 สรุป: เมื่อ Forward Message เกิดอะไรขึ้นกับ Conversation?

### 🎯 Target Conversation (ปลายทาง - ที่รับข้อความ)

#### 1. **Message Creation**
- ✅ สร้าง message ใหม่ใน target conversation
- ✅ Message ID ใหม่ (ไม่ใช่ ID เดิม)
- ✅ Sender = ผู้ที่กด Forward (ไม่ใช่ sender เดิม)
- ✅ Timestamp = เวลาที่ Forward (ไม่ใช่เวลาต้นฉบับ)
- ✅ Content/Media = คัดลอกจากต้นฉบับ

#### 2. **Conversation Metadata Updates**
```typescript
{
  conversation_id: "target-conv-id",
  last_message: "forwarded content...",
  last_message_at: "2025-01-02T12:00:00Z",  // เวลาที่ forward
  updated_at: "2025-01-02T12:00:00Z",
  // Conversation ขึ้นไปอยู่บนสุดของ conversation list
}
```

#### 3. **Unread Count**
- ✅ Unread count เพิ่มขึ้นสำหรับสมาชิกทุกคน (ยกเว้นผู้ Forward)
- ✅ ถ้า Forward 3 messages → Unread +3

#### 4. **Conversation List Position**
- ✅ Conversation ขึ้นไปอยู่บนสุด (sorted by last_message_at)
- ✅ Badge แสดงจำนวน unread

---

### 📤 Source Conversation (ต้นทาง - ที่ส่ง)

#### ไม่มีการเปลี่ยนแปลง!
- ❌ ไม่มี message ใหม่
- ❌ Metadata ไม่เปลี่ยน
- ❌ Unread count ไม่เปลี่ยน
- ✅ อยู่เหมือนเดิม (ไม่กระทบอะไร)

---

## 🔌 WebSocket Events - Backend Implementation

### ❓ คำถามสำหรับ Backend Team

#### 1. **Event Type for Forwarded Messages**

**คำถาม:**
```
เมื่อ forward message แล้ว backend ส่ง WebSocket event อะไร?
```

**ตัวเลือก:**

**Option A: ใช้ `new_message` event ธรรมดา**
```json
{
  "type": "new_message",
  "conversation_id": "target-conv-id",
  "message": {
    "id": "new-uuid",
    "sender_id": "forwarder-uuid",
    "sender_name": "John Doe",
    "message_type": "text",
    "content": "Hello",
    "created_at": "2025-01-02T12:00:00Z"
  }
}
```
**ข้อดี:**
- ✅ Frontend รับเหมือน message ธรรมดา (ไม่ต้องเขียน logic ใหม่)
- ✅ Simple implementation

**ข้อเสีย:**
- ❌ ไม่รู้ว่า message นี้ถูก forward มา
- ❌ ไม่มี metadata เกี่ยวกับ original message

---

**Option B: ใช้ `message_forwarded` event พิเศษ**
```json
{
  "type": "message_forwarded",
  "conversation_id": "target-conv-id",
  "message": {
    "id": "new-uuid",
    "sender_id": "forwarder-uuid",
    "sender_name": "John Doe",
    "message_type": "text",
    "content": "Hello",
    "created_at": "2025-01-02T12:00:00Z",

    // ✨ Forward-specific metadata
    "is_forwarded": true,
    "original_message_id": "original-uuid",
    "original_sender_id": "original-sender-uuid",
    "original_sender_name": "Original Person",
    "original_conversation_id": "source-conv-id",
    "forwarded_by": "forwarder-uuid",
    "forwarded_at": "2025-01-02T12:00:00Z"
  }
}
```
**ข้อดี:**
- ✅ Frontend รู้ว่าเป็น forwarded message
- ✅ แสดง UI พิเศษได้ (เช่น "Forwarded from John")
- ✅ Track forward history
- ✅ สามารถ jump to original message (ถ้าอยู่ใน conversation เดียวกัน)

**ข้อเสีย:**
- ❌ Frontend ต้องเพิ่ม logic รองรับ event ใหม่
- ❌ Complex implementation

**🙋 คำถาม: Backend เลือกใช้ Option ไหน?**

---

#### 2. **Conversation Updated Event**

**คำถาม:**
```
หลังจาก forward message แล้ว backend ส่ง `conversation_updated` event ไหม?
เพื่อ update conversation metadata (last_message, last_message_at, unread_count)?
```

**Expected Event:**
```json
{
  "type": "conversation_updated",
  "conversation_id": "target-conv-id",
  "updates": {
    "last_message": "Hello",
    "last_message_at": "2025-01-02T12:00:00Z",
    "last_message_type": "text",
    "last_message_sender_id": "forwarder-uuid",
    "last_message_sender_name": "John Doe",
    "updated_at": "2025-01-02T12:00:00Z"
  }
}
```

**🙋 คำถาม:**
1. Backend ส่ง event นี้หรือไม่?
2. ถ้าไม่ส่ง → Frontend ต้อง manually update conversation metadata เอง?
3. Event นี้ส่งหลัง `new_message` หรือก่อน?

---

#### 3. **Unread Count Update**

**คำถาม:**
```
หลังจาก forward message แล้ว unread count ของ target conversation เพิ่มขึ้นอย่างไร?
```

**Scenarios:**

**Scenario A: Backend ส่ง unread count ใน `new_message` event**
```json
{
  "type": "new_message",
  "conversation_id": "target-conv-id",
  "message": { ... },
  "unread_count": 5  // ✅ อัพเดตใน event เลย
}
```

**Scenario B: Frontend คำนวณเอง**
```typescript
// Frontend increment unread count locally
if (message.sender_id !== currentUserId) {
  conversation.unread_count += 1;
}
```

**Scenario C: Backend ส่ง `unread_count_updated` event แยก**
```json
{
  "type": "unread_count_updated",
  "conversation_id": "target-conv-id",
  "unread_count": 5
}
```

**🙋 คำถาม: Backend ใช้วิธีไหน?**

---

#### 4. **Batch Forward - Multiple Messages**

**คำถาม:**
```
เมื่อ forward หลาย messages พร้อมกัน (เช่น 5 messages)
Backend ส่ง WebSocket event อย่างไร?
```

**Option A: ส่ง event ทีละ message (5 events)**
```json
// Event 1
{ "type": "new_message", "message": { "id": "msg1" } }
// Event 2
{ "type": "new_message", "message": { "id": "msg2" } }
// Event 3
{ "type": "new_message", "message": { "id": "msg3" } }
// Event 4
{ "type": "new_message", "message": { "id": "msg4" } }
// Event 5
{ "type": "new_message", "message": { "id": "msg5" } }
```

**ข้อดี:**
- ✅ Simple
- ✅ Frontend handle ง่าย (เหมือน message ปกติ)

**ข้อเสีย:**
- ❌ หลาย events (อาจ lag ถ้า forward มาก)
- ❌ Frontend render ทีละ message (อาจกระตุก)

---

**Option B: ส่ง batch event เดียว**
```json
{
  "type": "messages_forwarded",
  "conversation_id": "target-conv-id",
  "messages": [
    { "id": "msg1", "content": "..." },
    { "id": "msg2", "content": "..." },
    { "id": "msg3", "content": "..." },
    { "id": "msg4", "content": "..." },
    { "id": "msg5", "content": "..." }
  ],
  "batch_size": 5,
  "forwarded_by": "forwarder-uuid"
}
```

**ข้อดี:**
- ✅ 1 event เดียว (efficient)
- ✅ Frontend render ครั้งเดียว (smooth)
- ✅ แสดง "John forwarded 5 messages" notification

**ข้อเสีย:**
- ❌ Frontend ต้องรองรับ batch event
- ❌ Complex implementation

**🙋 คำถาม: Backend ใช้วิธีไหน?**

---

#### 5. **Forward to Multiple Conversations**

**คำถาม:**
```
เมื่อ forward 1 message ไปหลาย conversations พร้อมกัน
(เช่น forward 3 messages ไป 2 conversations = 6 messages created)
Backend ส่ง WebSocket events อย่างไร?
```

**Expected Events:**
```json
// Conversation 1
{
  "type": "new_message",
  "conversation_id": "conv1",
  "message": { "id": "msg1" }
}
{
  "type": "new_message",
  "conversation_id": "conv1",
  "message": { "id": "msg2" }
}
{
  "type": "new_message",
  "conversation_id": "conv1",
  "message": { "id": "msg3" }
}

// Conversation 2
{
  "type": "new_message",
  "conversation_id": "conv2",
  "message": { "id": "msg4" }
}
{
  "type": "new_message",
  "conversation_id": "conv2",
  "message": { "id": "msg5" }
}
{
  "type": "new_message",
  "conversation_id": "conv2",
  "message": { "id": "msg6" }
}
```

**🙋 คำถาม:**
1. Backend ส่ง events ทั้งหมดหรือไม่?
2. Events ส่งพร้อมกันหรือเป็น batch?
3. มี event เดียวสำหรับ "forwarded to multiple conversations" หรือไม่?

---

#### 6. **Forward Album Messages**

**คำถาม:**
```
เมื่อ forward album message (มี 5 images + 2 files)
Backend ส่ง WebSocket event อย่างไร?
```

**Expected Event:**
```json
{
  "type": "new_message",
  "conversation_id": "target-conv-id",
  "message": {
    "id": "new-uuid",
    "message_type": "album",
    "content": "Caption here",
    "album_files": [
      {
        "id": "file1",
        "file_type": "image",
        "media_url": "https://...",
        "media_thumbnail_url": "https://...",
        "position": 0
      },
      // ... 6 more files
    ]
  }
}
```

**🙋 คำถาม:**
1. Backend คัดลอก `album_files` array ครบทุก file หรือไม่?
2. `media_url` และ `media_thumbnail_url` ยังใช้ได้ (ไม่ต้อง re-upload)?
3. `position` field ถูกรักษาไว้หรือไม่?
4. ถ้า album มี 50 files → มี size limit หรือไม่?

---

#### 7. **Error Handling via WebSocket**

**คำถาม:**
```
ถ้า forward ล้มเหลว (เช่น permission denied, conversation deleted)
Backend ส่ง error event กลับมาไหม?
```

**Expected Error Event:**
```json
{
  "type": "forward_error",
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You are not a member of this conversation",
    "conversation_id": "target-conv-id",
    "failed_message_ids": ["msg1", "msg2"]
  }
}
```

**หรือ:**
- ❌ ไม่ส่ง error event (Frontend handle via HTTP response only)

**🙋 คำถาม: Backend ส่ง error event via WebSocket หรือไม่?**

---

#### 8. **Forward Notification**

**คำถาม:**
```
เมื่อมี message ถูก forward เข้า conversation
สมาชิกคนอื่นได้รับ notification อย่างไร?
```

**Option A: ใช้ push notification ธรรมดา**
```
"John sent a message"
```

**Option B: ใช้ push notification พิเศษ**
```
"John forwarded a message"
```

**🙋 คำถาม:**
1. Backend แยก notification type ระหว่าง new message กับ forwarded message หรือไม่?
2. Push notification payload มี `is_forwarded` flag หรือไม่?

---

#### 9. **Forward History & Metadata**

**คำถาม:**
```
Backend เก็บ metadata เกี่ยวกับ forward history หรือไม่?
```

**Potential Fields in Message:**
```typescript
interface Message {
  id: string;
  // ... other fields

  // Forward metadata
  is_forwarded?: boolean;
  original_message_id?: string;
  original_sender_id?: string;
  original_sender_name?: string;
  original_conversation_id?: string;
  forwarded_by?: string;
  forwarded_at?: string;
  forward_count?: number; // จำนวนครั้งที่ message นี้ถูก forward
}
```

**🙋 คำถาม:**
1. Backend เก็บ fields เหล่านี้หรือไม่?
2. ถ้าเก็บ → ส่งมาใน WebSocket event ไหม?
3. Frontend ควรแสดง UI อย่างไร? (เช่น "Forwarded from John • Original: @Alice")

---

## 🎯 Summary: สิ่งที่ Frontend ต้องการรู้

### 1. **WebSocket Events ที่คาดหวัง**
```typescript
// 1. เมื่อ forward message
type: "new_message" | "message_forwarded" | "messages_forwarded"

// 2. เมื่อ conversation metadata update
type: "conversation_updated"

// 3. เมื่อ unread count เปลี่ยน
type: "unread_count_updated"

// 4. เมื่อ forward error
type: "forward_error"
```

### 2. **Event Payload ที่ต้องการ**
```typescript
interface ForwardMessageEvent {
  type: string;
  conversation_id: string;
  message: {
    id: string;
    sender_id: string;
    sender_name: string;
    message_type: string;
    content: string;
    media_url?: string;
    album_files?: AlbumFile[];
    created_at: string;

    // Forward-specific (optional, แต่มีจะดี!)
    is_forwarded?: boolean;
    original_message_id?: string;
    original_sender_name?: string;
    forwarded_by?: string;
  };

  // Metadata updates (optional)
  unread_count?: number;
  last_message_at?: string;
}
```

### 3. **Event Order**
```
เมื่อ forward 3 messages ไป 1 conversation:

1. new_message (message 1)
2. new_message (message 2)
3. new_message (message 3)
4. conversation_updated (ถ้ามี)
5. unread_count_updated (ถ้ามี)

หรือ:

1. messages_forwarded (batch 3 messages)
2. conversation_updated
```

**🙋 คำถาม: Event order ที่แน่นอนคืออะไร?**

---

## 📝 Frontend Implementation Plan

### ถ้า Backend ใช้ `new_message` Event (Option A)

**Frontend Code:**
```typescript
// WebSocket listener
socket.on('new_message', (data) => {
  const { conversation_id, message } = data;

  // Add message to conversation
  addMessageToConversation(conversation_id, message);

  // Update conversation metadata
  updateConversationLastMessage(conversation_id, {
    last_message: message.content,
    last_message_at: message.created_at,
    last_message_type: message.message_type
  });

  // Increment unread count (if not sender)
  if (message.sender_id !== currentUserId) {
    incrementUnreadCount(conversation_id);
  }

  // Scroll to bottom (if at bottom)
  if (isAtBottom) {
    scrollToBottom();
  }

  // Show notification (if conversation not active)
  if (conversation_id !== activeConversationId) {
    showNotification(`${message.sender_name} sent a message`);
  }
});
```

---

### ถ้า Backend ใช้ `message_forwarded` Event (Option B)

**Frontend Code:**
```typescript
// WebSocket listener
socket.on('message_forwarded', (data) => {
  const { conversation_id, message } = data;

  // Add message to conversation
  addMessageToConversation(conversation_id, message);

  // Update conversation metadata
  updateConversationLastMessage(conversation_id, {
    last_message: message.content,
    last_message_at: message.created_at,
    last_message_type: message.message_type
  });

  // Increment unread count
  if (message.sender_id !== currentUserId) {
    incrementUnreadCount(conversation_id);
  }

  // ✨ Show forwarded message UI
  if (message.is_forwarded) {
    // แสดง badge "Forwarded" หรือ "From: @OriginalSender"
    renderForwardedBadge(message);
  }

  // Show notification with forward context
  if (conversation_id !== activeConversationId) {
    showNotification(
      `${message.sender_name} forwarded a message from ${message.original_sender_name}`
    );
  }
});
```

---

### ถ้า Backend ใช้ Batch Event (messages_forwarded)

**Frontend Code:**
```typescript
socket.on('messages_forwarded', (data) => {
  const { conversation_id, messages, batch_size, forwarded_by } = data;

  // Add all messages at once (batch insert)
  addMessagesToConversation(conversation_id, messages);

  // Update conversation with last message
  const lastMessage = messages[messages.length - 1];
  updateConversationLastMessage(conversation_id, {
    last_message: lastMessage.content,
    last_message_at: lastMessage.created_at,
    last_message_type: lastMessage.message_type
  });

  // Increment unread count by batch size
  if (forwarded_by !== currentUserId) {
    incrementUnreadCount(conversation_id, batch_size);
  }

  // Show batch notification
  showNotification(`${forwarded_by} forwarded ${batch_size} messages`);
});
```

---

## 🔍 Testing Checklist

### WebSocket Events to Test

- [ ] **Forward 1 message → 1 conversation**
  - [ ] `new_message` event received?
  - [ ] Message added to conversation?
  - [ ] Conversation moved to top?
  - [ ] Unread count increased?

- [ ] **Forward 3 messages → 1 conversation**
  - [ ] 3 separate `new_message` events? หรือ 1 batch event?
  - [ ] Messages ถูก order ถูกต้อง?
  - [ ] Unread count +3?

- [ ] **Forward 1 message → 2 conversations**
  - [ ] Events ส่งไปทั้ง 2 conversations?
  - [ ] ทั้ง 2 conversations ขึ้นไปอยู่บนสุด?

- [ ] **Forward album message**
  - [ ] `album_files` array ครบถ้วน?
  - [ ] Images/videos แสดงได้?

- [ ] **Forward ล้มเหลว (permission error)**
  - [ ] Error event received? หรือ silent fail?
  - [ ] Frontend แสดง error message?

- [ ] **Conversation metadata update**
  - [ ] `conversation_updated` event received?
  - [ ] `last_message`, `last_message_at` ถูกต้อง?

---

## 🙏 Request to Backend Team

**กรุณาตอบคำถามต่อไปนี้:**

1. ✅ Backend ส่ง WebSocket event type ไหนเมื่อ forward message?
2. ✅ Event payload มี fields อะไรบ้าง? (ขอ example JSON)
3. ✅ Batch forward ส่ง events อย่างไร?
4. ✅ Conversation metadata update มี event แยกหรือไม่?
5. ✅ Unread count มี event แยกหรือไม่?
6. ✅ Forward metadata (is_forwarded, original_sender, etc.) มีหรือไม่?
7. ✅ Error handling via WebSocket มีหรือไม่?
8. ✅ Event order ที่แน่นอนคืออะไร?
9. ✅ Album forward รองรับ size limit เท่าไหร่?
10. ✅ Push notification แยก type ระหว่าง new message กับ forwarded message หรือไม่?

**ขอ Example Events:**
```json
// Example 1: Forward 1 text message
{ ... }

// Example 2: Forward 3 messages (batch)
{ ... }

// Example 3: Forward album message
{ ... }

// Example 4: Forward error
{ ... }
```

---

**Created:** 2025-01-02
**Status:** ⏳ Waiting for Backend Response
**Priority:** 🔴 High (blocking forward message implementation)
