# Backend Requirements: Block User Feature

## สรุปปัญหาที่พบ

### ✅ #26: Block list ไม่ update ทันที
**สถานะ:** ✅ แก้ไขเสร็จแล้ว (Frontend)
- Frontend refetch blocked users หลัง block/unblock
- WebSocket events `user.blocked` และ `user.unblocked` ทำงานถูกต้อง

### ⚠️ #27: หลัง Block แล้วยังส่งข้อความได้
**ปัญหาที่พบ:**
1. **Blocker Side (คนที่ block):** ✅ แก้ไขเสร็จแล้ว - Frontend disable UI
2. **Blocked User Side (คนที่ถูก block):** ❌ ยังพิมพ์และกด send ได้ แต่ backend reject
3. **Group Chat:** ❌ ถ้ามีคนที่ block กันอยู่ในกลุ่ม ส่งข้อความไม่ได้

---

## Backend ต้องแก้ไข

### 1. ✅ WebSocket Events ที่มีอยู่แล้ว (ทำงานถูกต้อง)

```typescript
// เมื่อ User A block User B
event: "user.blocked"
data: {
  blocker_id: "user-a-id",     // คนที่ทำการ block
  blocked_user_id: "user-b-id" // คนที่ถูก block
}
// ส่งไปที่: User A (blocker) เท่านั้น

// เมื่อ User A unblock User B
event: "user.unblocked"
data: {
  unblocker_id: "user-a-id",     // คนที่ทำการ unblock
  unblocked_user_id: "user-b-id" // คนที่ถูก unblock
}
// ส่งไปที่: User A (unblocker) เท่านั้น
```

### 2. ❌ WebSocket Event ที่ต้องเพิ่ม (สำหรับ Blocked User Side)

**ต้องการ:** แจ้งให้ User B รู้ว่าถูก User A block

```typescript
// เมื่อ User A block User B
event: "user.blocked_by"
data: {
  blocker_id: "user-a-id",       // คนที่ block เรา
  blocker_name: "User A",        // ชื่อคนที่ block (optional)
  blocked_user_id: "user-b-id",  // เรา (คนที่ถูก block)
  conversation_id: "conv-id",    // conversation ที่เกี่ยวข้อง (ถ้ามี)
  blocked_at: "2025-01-27T10:00:00Z"
}
// ส่งไปที่: User B (blocked user) ด้วย ⚠️ สำคัญ!

// หมายเหตุ: ไม่ต้องส่ง blocker_name ก็ได้ ให้ส่งแค่ blocker_id
// Frontend จะ handle เองว่าจะแสดงอะไร
```

**วัตถุประสงค์:**
- Frontend ของ User B จะได้รับ event นี้
- แสดง UI แจ้งเตือนว่า "คุณถูก [ชื่อ] block แล้ว ไม่สามารถส่งข้อความได้"
- Disable message input สำหรับ conversation นั้น

---

### 3. ❌ API Behavior ที่ต้องแก้ไข

#### 3.1 Send Message API (ปัจจุบัน - มีปัญหา)

**ปัจจุบัน:**
```http
POST /api/v1/conversations/{conversation_id}/messages/text
Body: { "content": "Hello" }

Response (เมื่อถูก block):
Status: 400 Bad Request
{
  "success": false,
  "message": "cannot send message: user is blocked"
}
```

**ปัญหา:**
- Error message ไม่ชัดเจนว่าเราถูก block หรือเรา block คนอื่น
- Frontend ต้อง parse error message (ไม่ดี)

**แนะนำให้ปรับเป็น:**
```http
Response (เมื่อเราถูกคนอื่น block):
Status: 403 Forbidden
{
  "success": false,
  "error_code": "BLOCKED_BY_USER",  // ⚠️ สำคัญ - ใช้ error code
  "message": "คุณถูกผู้ใช้นี้บล็อก ไม่สามารถส่งข้อความได้",
  "blocker_id": "user-a-id"  // optional - ช่วยให้ frontend รู้ว่าใครบล็อกเรา
}

Response (เมื่อเราบล็อกคนอื่น):
Status: 403 Forbidden
{
  "success": false,
  "error_code": "USER_BLOCKED",  // ⚠️ สำคัญ - ใช้ error code ต่างกัน
  "message": "คุณได้บล็อกผู้ใช้นี้แล้ว ไม่สามารถส่งข้อความได้",
  "blocked_user_id": "user-b-id"  // optional
}
```

**ประโยชน์:**
- Frontend ใช้ `error_code` แทนการ parse message
- แยก case ได้ชัดเจน (เราบล็อก vs ถูกบล็อก)
- Status code 403 เหมาะสมกว่า 400

---

#### 3.2 Group Chat Behavior (ต้องแก้ไข!)

**ปัจจุบัน:**
```
ถ้าใน group chat มี User A และ User B ที่ block กัน
→ ทั้ง A และ B ส่งข้อความใน group ไม่ได้ ❌
```

**ต้องการ:**
```
Block ควรใช้กับ Direct Chat เท่านั้น
ใน Group Chat:
- User A block User B แล้ว
- ✅ A ยังส่งข้อความใน group ได้
- ✅ B ยังส่งข้อความใน group ได้
- ❌ A กับ B ส่งข้อความ direct ถึงกันไม่ได้เท่านั้น
```

**แนะนำการตรวจสอบ:**
```go
// Pseudo code
func canSendMessage(conversationID, senderID string) bool {
  conversation := getConversation(conversationID)

  // ถ้าเป็น group chat → อนุญาตให้ส่งเสมอ (ไม่ check block)
  if conversation.Type == "group" {
    return true
  }

  // ถ้าเป็น direct chat → ตรวจสอบ block status
  if conversation.Type == "direct" {
    otherUserID := getOtherUserInConversation(conversationID, senderID)

    // ตรวจสอบว่า sender block other user หรือไม่
    if isBlocked(senderID, otherUserID) {
      return false  // error_code: "USER_BLOCKED"
    }

    // ตรวจสอบว่า sender ถูก other user block หรือไม่
    if isBlocked(otherUserID, senderID) {
      return false  // error_code: "BLOCKED_BY_USER"
    }

    return true
  }

  return true
}
```

---

### 4. ❌ GET Blocked Users API (ตรวจสอบ)

**ควรมี endpoint:**
```http
GET /api/v1/users/blocked

Response:
{
  "success": true,
  "data": [
    {
      "id": "user-b-id",
      "username": "userB",
      "display_name": "User B",
      "profile_image_url": "https://...",
      "blocked_at": "2025-01-27T10:00:00Z"
    }
  ]
}
```

**ตรวจสอบ:**
- ✅ API นี้มีอยู่แล้วหรือไม่?
- ✅ Frontend เรียกใช้ได้ถูกต้องหรือไม่?

---

### 5. ❌ GET "Blocked By" API (สำหรับ Blocked User Side - Optional)

**Optional:** ถ้าต้องการให้ blocked user รู้ว่าถูกใครบ้าง block

```http
GET /api/v1/users/blocked-by

Response:
{
  "success": true,
  "message": "รายการผู้ใช้ที่บล็อกคุณ",
  "data": [
    {
      "id": "user-a-id",
      "username": "userA",
      "display_name": "User A",
      "profile_image_url": "https://...",
      "blocked_at": "2025-01-27T10:00:00Z"
    }
  ]
}
```

**หมายเหตุ:**
- Endpoint นี้ไม่จำเป็นถ้าใช้ WebSocket event `user.blocked_by` แทน
- แต่ถ้ามี จะช่วยให้ Frontend sync ข้อมูลได้ดีขึ้นหลัง refresh

---

## สรุป Changes ที่ต้องทำ

### ✅ WebSocket (ต้องเพิ่ม)
1. เพิ่ม event `user.blocked_by` ส่งไปที่คนที่ถูก block ด้วย

### ✅ API Response (ต้องปรับ)
1. Send Message API ให้ return error_code แทน error message
   - `BLOCKED_BY_USER`: ถูกคนอื่น block
   - `USER_BLOCKED`: เราบล็อกคนอื่น
2. ใช้ HTTP Status 403 แทน 400

### ✅ Business Logic (ต้องแก้)
1. Group Chat: อนุญาตให้ส่งข้อความได้แม้มี blocked users
2. Direct Chat: ยังคง block ตามเดิม

### ⚠️ Optional (ถ้ามีเวลา)
1. GET /api/v1/users/blocked-by endpoint

---

## Test Cases สำหรับ Backend

### Test Case 1: Direct Chat - Blocker Side
```
Given: User A block User B
When: User A พยายามส่งข้อความให้ B
Then:
  - Status: 403 Forbidden
  - error_code: "USER_BLOCKED"
  - Frontend แสดง: "คุณได้บล็อก [ชื่อ] แล้ว ไม่สามารถส่งข้อความได้"
```

### Test Case 2: Direct Chat - Blocked User Side
```
Given: User A block User B
When: User B พยายามส่งข้อความให้ A
Then:
  - Status: 403 Forbidden
  - error_code: "BLOCKED_BY_USER"
  - WebSocket event "user.blocked_by" ถูกส่งไปที่ User B
  - Frontend แสดง: "คุณถูก [ชื่อ] block แล้ว ไม่สามารถส่งข้อความได้"
```

### Test Case 3: Group Chat with Blocked Users
```
Given:
  - Group มี User A, User B, User C
  - User A block User B
When:
  - User A ส่งข้อความใน group
  - User B ส่งข้อความใน group
Then:
  - ✅ ทั้ง A และ B ส่งได้ปกติ
  - ✅ ทุกคนเห็นข้อความทั้งหมด
  - ❌ A กับ B ส่ง direct message ถึงกันไม่ได้
```

### Test Case 4: WebSocket Event
```
Given: User A block User B
When: Block action เกิดขึ้น
Then:
  - ✅ User A ได้รับ event "user.blocked" (เดิม)
  - ✅ User B ได้รับ event "user.blocked_by" (ใหม่!)
```

---

## Frontend จะใช้ข้อมูลอย่างไร

### 1. จาก WebSocket Event `user.blocked_by`
```typescript
// Frontend จะ listen event นี้
addEventListener('message:user.blocked_by', (data) => {
  const { blocker_id, conversation_id } = data;

  // 1. เพิ่ม blocker_id เข้า "blockedByUsers" array
  friendshipStore.addBlockedByUser(blocker_id);

  // 2. ถ้าอยู่ที่ conversation ที่ถูก block → แสดง UI
  if (currentConversationId === conversation_id) {
    showBlockedMessage();
  }

  // 3. แสดง toast notification
  toast.warning('คุณถูกผู้ใช้คนหนึ่งบล็อก');
});
```

### 2. จาก API Error Response
```typescript
// เมื่อส่งข้อความแล้วได้ error
try {
  await sendMessage(content);
} catch (error) {
  if (error.error_code === 'BLOCKED_BY_USER') {
    // แสดง UI ว่าถูก block
    showBlockedByUserMessage(error.blocker_id);
  } else if (error.error_code === 'USER_BLOCKED') {
    // แสดง UI ว่าเราบล็อกคนนี้แล้ว (ไม่ควรเกิด เพราะ frontend ป้องกันไว้แล้ว)
    showUserBlockedMessage();
  }
}
```

---

## คำถามสำหรับ Backend Team

1. **WebSocket:** มี event `user.blocked` และ `user.unblocked` อยู่แล้วใช่ไหม? (ตอบ: ✅ ใช่)
2. **WebSocket:** สามารถเพิ่ม event `user.blocked_by` ได้ไหม? (ต้องการ)
3. **API:** Send Message API ปัจจุบัน return error อะไรเมื่อถูก block? (ต้องเช็ค)
4. **Logic:** ปัจจุบัน group chat ส่งข้อความได้ไหมถ้ามี blocked users? (ต้องแก้)
5. **Endpoint:** มี GET /api/v1/users/blocked หรือไม่? (ต้องเช็ค)

---

## Priority

### 🔴 High Priority (ต้องทำ)
1. Group Chat: อนุญาตให้ส่งข้อความได้แม้มี blocked users
2. API: เพิ่ม error_code ใน Send Message API response

### 🟡 Medium Priority (ควรทำ)
3. WebSocket: เพิ่ม event `user.blocked_by`

### 🟢 Low Priority (ถ้ามีเวลา)
4. GET /api/v1/users/blocked-by endpoint

---

## ติดต่อ

ถ้ามีคำถามเพิ่มเติม หรือต้องการข้อมูลเพิ่มเติมจาก Frontend แจ้งมาได้เลยครับ
