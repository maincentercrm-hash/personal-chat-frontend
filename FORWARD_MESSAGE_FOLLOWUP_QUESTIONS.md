# Forward Message - Follow-up Questions for Backend

**Date:** 2025-01-02
**Ref:** FORWARD_MESSAGES_WEBSOCKET_UPDATE.md

---

## ✅ สิ่งที่เข้าใจแล้ว

1. ✅ Backend ส่ง `message.new` event (ใช้ event เดิม)
2. ✅ มี `is_forwarded` และ `forwarded_from` metadata
3. ✅ ส่ง 1 event ต่อ 1 message (ไม่ใช่ batch event)
4. ✅ Backward compatible (Frontend ที่มีอยู่ทำงานได้ทันที)

---

## ❓ คำถามที่ยังไม่ชัด

### 1. **Conversation Metadata Update**

**คำถาม:**
```
เมื่อ forward message แล้ว Backend ส่ง `conversation_updated` event แยกหรือไม่?
หรือ Frontend ต้อง manually update conversation metadata เอง?
```

**ข้อมูลที่ต้องการ:**
- `last_message`
- `last_message_at`
- `last_message_type`
- `last_message_sender_id`
- `updated_at`

**Scenario:**
```
User A forward message ไปหา Conversation X
→ Conversation X ควรขึ้นไปอยู่บนสุดของ conversation list
→ แสดง last_message เป็นข้อความที่ forward มา
```

**Option A: Backend ส่ง event แยก**
```json
{
  "event": "conversation.updated",
  "conversation_id": "...",
  "data": {
    "last_message": "Hello",
    "last_message_at": "2025-01-02T12:00:00Z",
    "last_message_type": "text"
  }
}
```

**Option B: Frontend update เอง**
```typescript
// Frontend manually update after receiving message.new
updateConversation(conversation_id, {
  last_message: message.content,
  last_message_at: message.created_at
});
```

**🙋 Backend ใช้วิธีไหน?**

---

### 2. **Unread Count Update**

**คำถาม:**
```
Unread count update อย่างไร?
```

**Option A: มาใน `message.new` event**
```json
{
  "event": "message.new",
  "data": {
    "id": "...",
    "content": "...",
    // ✅ มี unread_count ใน event
    "unread_count": 5
  }
}
```

**Option B: Frontend คำนวณเอง**
```typescript
// Frontend increment locally
if (message.sender_id !== currentUserId) {
  conversation.unread_count += 1;
}
```

**Option C: มี event แยก**
```json
{
  "event": "unread_count.updated",
  "conversation_id": "...",
  "unread_count": 5
}
```

**🙋 Backend ใช้วิธีไหน?**

---

### 3. **Batch Forward Performance**

**คำถาม:**
```
เมื่อ forward 10 messages พร้อมกัน
Frontend จะได้รับ 10 events แยกกัน ใช่ไหม?
Events เหล่านี้ส่งพร้อมกันหรือเป็น sequence?
```

**Concern:**
- ถ้าส่ง 10 events พร้อมกัน → UI อาจ "กระตุก" (jank)
- ต้อง implement batch rendering ใน Frontend

**Possible Solution (Frontend):**
```typescript
// Debounce rendering
const messageQueue = [];
socket.on('message.new', (data) => {
  messageQueue.push(data);

  // Wait 100ms then render all at once
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    renderMessages(messageQueue);
    messageQueue = [];
  }, 100);
});
```

**🙋 คำถาม:**
1. Events ส่งพร้อมกัน (parallel) หรือ ทีละตัว (sequential)?
2. มี delay ระหว่าง events หรือไม่?
3. Backend แนะนำให้ Frontend ทำ batch rendering หรือไม่?

---

### 4. **Error Handling via WebSocket**

**คำถาม:**
```
ถ้า forward message ล้มเหลว (permission denied, conversation deleted, etc.)
Backend ส่ง error event กลับมาไหม?
```

**Scenario:**
```
User A forward 3 messages ไป 2 conversations:
- Conversation X: Success ✅
- Conversation Y: Permission Denied ❌

HTTP Response จะบอกว่า partial success
แต่ WebSocket จะส่ง error event หรือไม่?
```

**Expected Error Event:**
```json
{
  "event": "forward.error",
  "conversation_id": "conv-y",
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You are not a member of this conversation"
  }
}
```

**🙋 Backend ส่ง error event via WebSocket หรือไม่?**
- ถ้าส่ง → Frontend handle อย่างไร?
- ถ้าไม่ส่ง → Frontend rely on HTTP response only?

---

### 5. **Album Message Forward**

**คำถาม:**
```
เมื่อ forward album message (มีหลาย files)
WebSocket event จะส่ง album_files array ครบถ้วนหรือไม่?
```

**Expected Event:**
```json
{
  "event": "message.new",
  "data": {
    "message_type": "album",
    "content": "Caption",
    "album_files": [
      {
        "id": "file1",
        "file_type": "image",
        "media_url": "https://...",
        "media_thumbnail_url": "https://...",
        "position": 0
      },
      // ... more files
    ],
    "is_forwarded": true,
    "forwarded_from": { ... }
  }
}
```

**🙋 คำถาม:**
1. `album_files` array ถูกคัดลอกครบทุก file หรือไม่?
2. `media_url` และ `media_thumbnail_url` ใช้ได้ (ไม่ต้อง re-upload)?
3. `position` field ถูกรักษาไว้หรือไม่?
4. ถ้า album มี 50 files → มี size limit หรือไม่?

---

### 6. **Forward Event Order & Timing**

**คำถาม:**
```
เมื่อ forward 3 messages ไปหา Conversation X
Events จะถูกส่งในลำดับอย่างไร?
```

**Scenario:**
```
Forward: Message A, Message B, Message C
```

**Expected Order:**
```
1. message.new (Message A)
2. message.new (Message B)
3. message.new (Message C)
4. conversation.updated? (ถ้ามี)
```

**🙋 คำถาม:**
1. Order guaranteed หรือไม่? (Message A จะมาก่อน B เสมอ?)
2. มี delay ระหว่าง events หรือไม่?
3. conversation.updated event มาตอนไหน? (หลัง message สุดท้าย?)

---

### 7. **Push Notification**

**คำถาม:**
```
เมื่อ User B ได้รับ forwarded message
Push notification จะแสดงอย่างไร?
```

**Option A: แสดงแบบปกติ**
```
John sent a message
```

**Option B: แสดงว่าเป็น forwarded**
```
John forwarded a message
```

**Option C: แสดง context เพิ่มเติม**
```
John forwarded a message from Alice
```

**🙋 Backend ส่ง push notification แบบไหน?**

---

### 8. **Multiple Conversations Target**

**คำถาม:**
```
เมื่อ forward 1 message ไปหา 3 conversations พร้อมกัน
WebSocket events ถูกส่งอย่างไร?
```

**Expected:**
```
// Conversation X
{
  "event": "message.new",
  "conversation_id": "conv-x",
  "data": { ... }
}

// Conversation Y
{
  "event": "message.new",
  "conversation_id": "conv-y",
  "data": { ... }
}

// Conversation Z
{
  "event": "message.new",
  "conversation_id": "conv-z",
  "data": { ... }
}
```

**🙋 คำถาม:**
1. Events ส่งพร้อมกัน (parallel) หรือ ทีละตัว?
2. ถ้า Conversation Y fail → Conversation X และ Z ยังได้รับ event ปกติ?

---

### 9. **WebSocket Reconnection**

**คำถาม:**
```
ถ้า Frontend WebSocket disconnect ชั่วคราว
แล้ว reconnect กลับมา
จะ miss forwarded messages หรือไม่?
```

**Scenario:**
```
1. User A WebSocket disconnect (network issue)
2. User B forward message ไปหา User A
3. User A reconnect กลับมา
```

**🙋 คำถาม:**
1. User A จะได้รับ message ที่พลาดไปหรือไม่?
2. ต้อง fetch messages manually หลัง reconnect?
3. Backend มี "missed messages" queue หรือไม่?

---

### 10. **Forward Count & History**

**คำถาม:**
```
ถ้า Message A ถูก forward หลายครั้ง
Backend track forward count หรือไม่?
```

**Potential Field:**
```json
{
  "forward_count": 3,
  "forward_history": [
    {
      "forwarded_by": "user1",
      "forwarded_at": "2025-01-01T10:00:00Z",
      "target_conversation_id": "conv1"
    },
    {
      "forwarded_by": "user2",
      "forwarded_at": "2025-01-01T11:00:00Z",
      "target_conversation_id": "conv2"
    }
  ]
}
```

**🙋 Backend track forward history หรือไม่?**
- ถ้า track → ส่งมาใน WebSocket event หรือไม่?
- Frontend ควรแสดง UI อย่างไร?

---

## 📝 Summary of Questions

### High Priority (ส่งผลต่อ Implementation):
1. ✅ **Conversation metadata update** - Event แยกหรือ Frontend update เอง?
2. ✅ **Unread count mechanism** - มาใน event หรือ Frontend คำนวณ?
3. ✅ **Batch forward performance** - Events ส่งพร้อมกันหรือไม่?
4. ✅ **Album message support** - album_files array ครบหรือไม่?

### Medium Priority (ส่งผลต่อ UX):
5. ✅ **Error handling** - มี error event via WebSocket หรือไม่?
6. ✅ **Event order** - Guaranteed order หรือไม่?
7. ✅ **Multiple conversations** - Events ส่งอย่างไร?

### Low Priority (Nice to Have):
8. ⚪ **Push notification** - แสดงอย่างไร?
9. ⚪ **WebSocket reconnection** - Missed messages handling?
10. ⚪ **Forward history** - Track หรือไม่?

---

## 🎯 Recommended Testing Plan

### Phase 1: Basic Forward (ต้องทดสอบก่อน deploy)
- [ ] Forward 1 text message
- [ ] Forward 3 messages (batch)
- [ ] Forward to 2 conversations
- [ ] Check conversation list order
- [ ] Check unread count

### Phase 2: Advanced Forward
- [ ] Forward album message
- [ ] Forward with offline/online user
- [ ] Forward with permission error
- [ ] Forward 20+ messages (stress test)

### Phase 3: Edge Cases
- [ ] WebSocket disconnect during forward
- [ ] Forward deleted message
- [ ] Forward to deleted conversation

---

**Created:** 2025-01-02
**Status:** ⏳ Waiting for Backend Response
**Priority:** 🔴 High
