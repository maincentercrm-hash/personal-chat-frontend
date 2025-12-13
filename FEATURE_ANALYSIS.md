# Feature Analysis: Pin Message & Friend Request Chat

## 1. Pin Message (ปักหมุดข้อความ)

### สถานะปัจจุบัน

| Component | Status | รายละเอียด |
|-----------|--------|------------|
| Backend Model | ✅ มีแล้ว | `is_pinned`, `pinned_by`, `pinned_at` fields ใน Message |
| Backend Service | ✅ มีแล้ว | `PinMessage()`, `UnpinMessage()`, `GetPinnedMessages()` |
| Backend API | ✅ มีแล้ว | PUT/DELETE `/messages/:messageId/pin`, GET `/pinned-messages` |
| Frontend API | ❌ ไม่มี | ต้องเพิ่ม endpoints ใน constants และ service |
| Frontend Store | ❌ ไม่มี | ต้องเพิ่ม pinned messages state |
| Frontend UI | ❌ ไม่มี | ต้องเพิ่ม Pinned Messages Panel |

### Backend API ที่มีอยู่แล้ว

```
PUT    /api/v1/conversations/:conversationId/messages/:messageId/pin    # Pin message
DELETE /api/v1/conversations/:conversationId/messages/:messageId/pin    # Unpin message
GET    /api/v1/conversations/:conversationId/pinned-messages            # Get pinned messages
```

### สิ่งที่ต้องทำ (Frontend เท่านั้น)

#### 1.1 เพิ่ม API Constants
```typescript
// src/constants/api/standardApiConstants.ts
export const MESSAGE_PIN_API = {
  PIN_MESSAGE: (conversationId: string, messageId: string) =>
    `/conversations/${conversationId}/messages/${messageId}/pin`,
  UNPIN_MESSAGE: (conversationId: string, messageId: string) =>
    `/conversations/${conversationId}/messages/${messageId}/pin`,
  GET_PINNED_MESSAGES: (conversationId: string) =>
    `/conversations/${conversationId}/pinned-messages`,
};
```

#### 1.2 เพิ่ม Service Methods
```typescript
// src/services/messageService.ts
pinMessage: (conversationId: string, messageId: string) => Promise<ApiResponse>
unpinMessage: (conversationId: string, messageId: string) => Promise<ApiResponse>
getPinnedMessages: (conversationId: string) => Promise<ApiResponse<MessageDTO[]>>
```

#### 1.3 เพิ่ม Store State
```typescript
// src/stores/conversationStore.ts หรือสร้างใหม่
pinnedMessages: Record<string, MessageDTO[]>  // conversationId -> pinned messages
setPinnedMessages: (conversationId: string, messages: MessageDTO[]) => void
addPinnedMessage: (conversationId: string, message: MessageDTO) => void
removePinnedMessage: (conversationId: string, messageId: string) => void
```

#### 1.4 เพิ่ม UI Components

**PinnedMessagesBar** - แถบเล็กๆ ด้านบน chat แสดงจำนวน pinned messages
```
┌─────────────────────────────────────────┐
│ 📌 3 pinned messages            [View]  │
└─────────────────────────────────────────┘
```

**PinnedMessagesPanel** - Panel แสดงรายการ pinned messages (เหมือน Telegram)
```
┌─────────────────────────────────────────┐
│ 📌 Pinned Messages                   ✕  │
├─────────────────────────────────────────┤
│ [Message 1 preview...]         [Unpin]  │
│ [Message 2 preview...]         [Unpin]  │
│ [Message 3 preview...]         [Unpin]  │
└─────────────────────────────────────────┘
```

#### 1.5 เพิ่ม Context Menu Action
```typescript
// MessageContextMenu.tsx - เพิ่ม handler
onPin: () => {
  if (message.is_pinned) {
    unpinMessage(conversationId, message.id);
  } else {
    pinMessage(conversationId, message.id);
  }
}
```

### ระยะเวลาประมาณ
- API + Service: 1-2 ชั่วโมง
- Store: 1 ชั่วโมง
- UI Components: 3-4 ชั่วโมง
- **รวม: 5-7 ชั่วโมง**

---

## 2. Friend Request Chat (ส่งข้อความขณะรอเพื่อนยอมรับ)

### สถานะปัจจุบัน

| Component | Status | รายละเอียด |
|-----------|--------|------------|
| Friend System | ✅ มีแล้ว | ครบทุก function |
| Create Conversation | ⚠️ จำกัด | **ต้องเป็นเพื่อนก่อน** ถึงจะสร้าง conversation ได้ |

### ปัญหาปัจจุบัน

```go
// conversations_service.go - บล็อคไม่ให้สร้าง conversation ถ้าไม่ใช่เพื่อน
isFriend, err := s.checkFriendship(userID, friendID)
if !isFriend {
    return nil, errors.New("you must be friends to start a chat")
}
```

### แนวทางแก้ไข

#### Option A: Message Request System (แนะนำ - เหมือน Instagram/Facebook)

**Concept:**
- เมื่อส่ง friend request → สามารถส่งข้อความ 1 ข้อความได้ (เป็น "message request")
- ฝั่งผู้รับเห็นเป็น "Message Request" แยกจาก chat ปกติ
- เมื่อ accept friend → conversation กลายเป็นปกติ
- เมื่อ reject/ignore → message request หายไป

**สิ่งที่ต้องเพิ่ม (Backend):**

1. **เพิ่ม Field ใน UserFriendship**
```go
type UserFriendship struct {
    // ... existing fields
    InitialMessage    *string    `json:"initial_message,omitempty"`     // ข้อความแรกที่ส่งพร้อม request
    InitialMessageAt  *time.Time `json:"initial_message_at,omitempty"`
}
```

2. **แก้ไข SendFriendRequest**
```go
func (s *service) SendFriendRequest(userID, friendID uuid.UUID, initialMessage *string) error {
    // ... existing logic
    friendship.InitialMessage = initialMessage
    // ...
}
```

3. **เพิ่ม API Endpoint**
```
POST /api/v1/friendships/request-with-message
Body: { "friend_id": "...", "message": "สวัสดีครับ อยากทำความรู้จัก" }
```

**สิ่งที่ต้องเพิ่ม (Frontend):**

1. **UI สำหรับส่งข้อความพร้อม Friend Request**
```
┌─────────────────────────────────────────┐
│ Add Friend                              │
├─────────────────────────────────────────┤
│ [Search user...]                        │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 👤 John Doe                   [Add] │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Message (optional):                     │
│ ┌─────────────────────────────────────┐ │
│ │ สวัสดีครับ...                       │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

2. **Message Requests Tab**
```
┌─────────────────────────────────────────┐
│ [Chats] [Message Requests (2)]          │
├─────────────────────────────────────────┤
│ 👤 Jane: "Hi! Nice to meet..."  [Accept]│
│ 👤 Bob: "Hey, I saw your..."    [Accept]│
└─────────────────────────────────────────┘
```

---

#### Option B: Allow Chat with Pending Friends (ง่ายกว่า)

**Concept:**
- เมื่อส่ง friend request → สร้าง conversation ได้เลย แต่มี flag `is_pending`
- ผู้รับเห็น conversation แต่มี banner "Friend request pending"
- ผู้รับสามารถอ่านได้แต่ตอบไม่ได้ จนกว่าจะ accept
- เมื่อ accept → conversation ใช้งานได้ปกติ
- เมื่อ reject → conversation ถูกซ่อน/ลบ

**สิ่งที่ต้องเพิ่ม (Backend):**

1. **แก้ไข Conversation Model**
```go
type Conversation struct {
    // ... existing fields
    IsPendingFriend bool `json:"is_pending_friend" gorm:"default:false"`
}
```

2. **แก้ไข CreateDirectConversation**
```go
func (s *service) CreateDirectConversation(userID, friendID uuid.UUID) (*Conversation, error) {
    // Check friendship status
    status, _ := s.friendshipRepo.GetStatus(userID, friendID)

    if status == "blocked" {
        return nil, errors.New("cannot chat with blocked user")
    }

    conv := &Conversation{
        Type: "direct",
        IsPendingFriend: status == "pending" || status == "none",
    }

    // If not friends, auto-send friend request
    if status == "none" {
        s.friendshipService.SendFriendRequest(userID, friendID)
    }

    return conv, nil
}
```

3. **เพิ่ม Logic ใน SendMessage**
```go
func (s *service) SendMessage(userID, conversationID uuid.UUID, content string) error {
    conv, _ := s.convRepo.GetByID(conversationID)

    // ถ้า pending และไม่ใช่คนส่ง request → ไม่ให้ส่ง
    if conv.IsPendingFriend && !s.isRequester(userID, conv) {
        return errors.New("accept friend request to reply")
    }

    // ... send message
}
```

**สิ่งที่ต้องเพิ่ม (Frontend):**

1. **Pending Banner ใน Chat**
```
┌─────────────────────────────────────────┐
│ ⚠️ Friend request pending               │
│ [Accept] [Decline]                      │
└─────────────────────────────────────────┘
│                                         │
│ Messages...                             │
│                                         │
├─────────────────────────────────────────┤
│ Accept friend request to reply          │
└─────────────────────────────────────────┘
```

---

### เปรียบเทียบ Options

| Criteria | Option A (Message Request) | Option B (Pending Chat) |
|----------|---------------------------|------------------------|
| ความซับซ้อน | ปานกลาง | สูง |
| UX | ดีมาก (เหมือน Instagram) | ดี |
| Privacy | สูง (แยก tab) | ปานกลาง |
| Backend Changes | น้อย | มาก |
| Frontend Changes | ปานกลาง | มาก |
| **แนะนำ** | ✅ | |

### ระยะเวลาประมาณ

**Option A:**
- Backend: 2-3 ชั่วโมง
- Frontend: 4-5 ชั่วโมง
- **รวม: 6-8 ชั่วโมง**

**Option B:**
- Backend: 4-6 ชั่วโมง
- Frontend: 6-8 ชั่วโมง
- **รวม: 10-14 ชั่วโมง**

---

## สรุป

| Feature | ความเป็นไปได้ | Backend | Frontend | เวลาประมาณ |
|---------|--------------|---------|----------|-----------|
| **Pin Message** | ✅ ทำได้เลย | ไม่ต้องแก้ | ต้องเพิ่ม | 5-7 ชม. |
| **Friend Request Chat** | ✅ ทำได้ | ต้องแก้เล็กน้อย | ต้องเพิ่ม | 6-14 ชม. |

### ลำดับการทำแนะนำ

1. **Pin Message** - ทำก่อนเพราะ backend พร้อมแล้ว
2. **Friend Request Chat (Option A)** - ทำทีหลังเพราะต้องแก้ทั้ง backend และ frontend
