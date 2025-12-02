# แผนการปรับปรุง Chat UI/UX - Frontend Implementation Plan

**วันที่:** 2025-01-30
**อ้างอิงจาก:**
- `BACKEND_REQUIREMENTS_CHAT_UI_UX.md` (ส่งให้ Backend)
- `D:\Admin\Desktop\MY PROJECT\chat-backend-v2-main\FRONTEND_REQUIREMENTS_STATUS.md` (ตอบกลับจาก Backend)

---

## 📊 สรุปภาพรวม

| สถานะ | จำนวน | รายละเอียด |
|-------|-------|------------|
| ✅ มีอยู่แล้ว (Frontend) | 3 | Online status tracking, WebSocket subscriptions, User status store |
| ✅ มีอยู่แล้ว (Backend) | 4 | Presence API, WebSocket integration, Typing indicator, Database fields |
| ⚠️ ต้องปรับปรุง | 5 | Event names, Response formats, Broadcasting, Auto-stop, User info |
| 🆕 ต้องสร้างใหม่ | 2 | UI Components, Enhanced features |

---

## 🔍 การวิเคราะห์ระบบที่มีอยู่แล้ว

### ✅ Frontend - ระบบที่มีอยู่แล้ว

#### 1. Online Status Hook ✅
**ที่ตั้ง:** `src/hooks/useOnlineStatus.ts`

**Features:**
- ✅ Subscribe/unsubscribe to user status via WebSocket
- ✅ Event listeners: `message:user.online`, `message:user.offline`, `message:user.status`
- ✅ Auto-cleanup on unmount
- ✅ Loading states management
- ✅ Prevent duplicate subscriptions

**Functions:**
```typescript
const {
  isLoading,
  userStatuses,
  isUserOnline,
  isUserOffline,
  isUserBusy,
  isUserAway,
  getLastActiveTime
} = useOnlineStatus(userIds);
```

#### 2. User Store ✅
**ที่ตั้ง:** `src/stores/userStore.ts`

**State:**
```typescript
userStatuses: Record<string, UserStatusItem>
// UserStatusItem = {
//   user_id: string
//   status: 'online' | 'offline' | 'busy' | 'away'
//   last_active_at: string
// }
```

**Methods:**
- ✅ `fetchUserStatuses(userIds)` - ดึงจาก REST API
- ✅ `updateUserStatus(userId, isOnline, timestamp)` - อัปเดตจาก WebSocket
- ✅ รองรับทั้ง Array และ Object response format

#### 3. WebSocket Context ✅
**ที่ตั้ง:** `src/contexts/WebSocketContext.tsx`

**Methods:**
- ✅ `subscribeToUserStatus(userId)`
- ✅ `unsubscribeFromUserStatus(userId)`
- ✅ `getSubscribedUserStatuses()`
- ✅ `addEventListener(event, callback)`

---

### ✅ Backend - ระบบที่มีอยู่แล้ว

จากไฟล์ `FRONTEND_REQUIREMENTS_STATUS.md`:

#### 1. Presence Service ✅
**ตำแหน่ง:** `application/serviceimpl/presence_service.go`

**REST API Endpoints:**
```http
# Single user
GET /api/v1/presence/user/:userId

# Multiple users (batch)
POST /api/v1/presence/users
Body: { "user_ids": ["uuid1", "uuid2"] }

# Online friends
GET /api/v1/presence/friends/online
```

**Features:**
- ✅ Redis-based online status tracking
- ✅ SetUserOnline/SetUserOffline
- ✅ IsUserOnline check
- ✅ Batch query support
- ✅ TTL management (5 minutes)

#### 2. Database Field ✅
**ตำแหน่ง:** `domain/models/user.go:22`

```go
type User struct {
    LastActiveAt *time.Time `json:"last_active_at,omitempty"`
    // ต้องเพิ่ม: last_seen (แยกจาก last_active_at)
}
```

#### 3. WebSocket Typing Indicator ✅
**ตำแหน่ง:** `interfaces/websocket/handlers.go:145-176`

**Event Type:** `message.typing` (⚠️ ต่างจาก spec)

**รูปแบบปัจจุบัน:**
```json
// ส่ง
{
  "type": "message.typing",
  "data": {
    "conversation_id": "uuid",
    "is_typing": true
  }
}

// รับ
{
  "type": "message.typing",
  "data": {
    "user_id": "uuid",
    "conversation_id": "uuid",
    "is_typing": true
  }
}
```

⚠️ **ขาด:** `username`, `display_name`

---

## 🎯 สิ่งที่ต้องดำเนินการ

### Priority 1: Backend Improvements (ต้องรอ Backend)

#### 1.1 WebSocket `user_status` Event Broadcasting 🔴
**สถานะ:** ยังไม่มี - Backend ต้องสร้างใหม่

**ที่ต้องการ:**
```json
// เมื่อ user online
{
  "type": "user_status",
  "data": {
    "user_id": "uuid",
    "status": "online",
    "timestamp": "2025-01-30T10:30:00Z"
  }
}

// เมื่อ user offline
{
  "type": "user_status",
  "data": {
    "user_id": "uuid",
    "status": "offline",
    "last_seen": "2025-01-30T10:30:00Z"
  }
}
```

**ผลกระทบต่อ Frontend:**
- ✅ Frontend มี event listener `message:user.status` อยู่แล้ว
- ⚠️ แต่ต้องปรับให้รองรับ event type `user_status` ด้วย

---

#### 1.2 Typing Auto-Stop Mechanism 🔴
**สถานะ:** ยังไม่มี - Backend ต้องเพิ่ม

**ที่ต้องการ:**
- หลังจาก 5 วินาที ถ้าไม่ได้รับ `typing_stop`
- Backend ส่ง `is_typing: false` อัตโนมัติ

**ผลกระทบต่อ Frontend:**
- ✅ ไม่มี - Backend จัดการเอง
- 💡 Frontend ควรมี local timeout เป็น fallback

---

#### 1.3 Typing Event User Info 🟡
**สถานะ:** ต้องเพิ่ม `username`, `display_name`

**ที่ต้องการ:**
```json
{
  "type": "user_typing",
  "data": {
    "conversation_id": "uuid",
    "user_id": "uuid",
    "username": "john_doe",        // 🆕 เพิ่ม
    "display_name": "John Doe",    // 🆕 เพิ่ม
    "is_typing": true
  }
}
```

**ผลกระทบต่อ Frontend:**
- ⚠️ ต้องปรับ typing indicator UI ให้แสดงชื่อ

---

#### 1.4 REST API Response Format 🟡
**สถานะ:** Response format ไม่ตรง spec

**ปัจจุบัน:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "is_online": true,
    "last_active_at": "2025-01-30T10:30:00Z"
  }
}
```

**ที่ต้องการ:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "status": "online",           // 🆕 เพิ่ม
    "is_online": true,
    "last_seen": "2025-01-30T10:30:00Z"  // ⚠️ เปลี่ยนชื่อ
  }
}
```

**ผลกระทบต่อ Frontend:**
- ✅ `userStore.fetchUserStatuses()` รองรับทั้งสองแบบอยู่แล้ว
- แต่ควรปรับให้ใช้ `last_seen` เป็นหลัก

---

#### 1.5 Rate Limiting for Typing Events 🟢
**สถานะ:** Optional - เพิ่ม performance

**ที่ต้องการ:**
- Backend: จำกัดไม่เกิน 1 event/วินาที
- Frontend: Debounce typing events

---

### Priority 2: Frontend Improvements (ทำได้เลย)

#### 2.1 Chat Header - Online Status Display 🟢
**ที่ตั้ง:** `src/components/standard/conversation/ChatHeader.tsx`

**ต้องการ:**
- [ ] แสดง online/offline status dot
- [ ] แสดง "Online" / "Last seen X minutes ago"
- [ ] ใช้ `useOnlineStatus(chatPartnerId)` ที่มีอยู่แล้ว

**Implementation:**
```tsx
// ใน ChatHeader.tsx
const { isUserOnline, getLastActiveTime } = useOnlineStatus([chatPartnerId]);

// แสดง status
{isUserOnline(chatPartnerId) ? (
  <span className="text-green-500">● Online</span>
) : (
  <span className="text-gray-400">
    Last seen {formatLastSeen(getLastActiveTime(chatPartnerId))}
  </span>
)}
```

**Files to Modify:**
- ✏️ `src/components/standard/conversation/ChatHeader.tsx`
- 🆕 `src/utils/formatLastSeen.ts` (helper function)

---

#### 2.2 Typing Indicator UI Component 🟢
**ที่ตั้ง:** สร้างใหม่ `src/components/shared/TypingIndicator.tsx`

**ต้องการ:**
- [ ] แสดง "John is typing..."
- [ ] แสดง "John and Sarah are typing..."
- [ ] แสดง "John, Sarah and 2 others are typing..."
- [ ] แสดง animated dots (...)

**Implementation:**
```tsx
// ใหม่: src/components/shared/TypingIndicator.tsx
interface TypingIndicatorProps {
  typingUsers: Array<{
    user_id: string;
    username: string;
    display_name: string;
  }>;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;

  const text = formatTypingText(typingUsers);

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span>{text}</span>
      <AnimatedDots />
    </div>
  );
};
```

**Files to Create:**
- 🆕 `src/components/shared/TypingIndicator.tsx`
- 🆕 `src/components/shared/AnimatedDots.tsx`
- 🆕 `src/utils/formatTypingText.ts`

---

#### 2.3 Typing Indicator Hook 🟢
**ที่ตั้ง:** สร้างใหม่ `src/hooks/useTypingIndicator.ts`

**ต้องการ:**
- [ ] Listen to WebSocket `message.typing` events
- [ ] Track typing users per conversation
- [ ] Auto-remove after 5 seconds (local fallback)
- [ ] Debounce outgoing typing events

**Implementation:**
```typescript
// ใหม่: src/hooks/useTypingIndicator.ts
export const useTypingIndicator = (conversationId: string) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const { addEventListener, send } = useWebSocketContext();

  // Listen to typing events
  useEffect(() => {
    const unsubscribe = addEventListener('message.typing', (data) => {
      if (data.conversation_id === conversationId) {
        handleTypingEvent(data);
      }
    });

    return unsubscribe;
  }, [conversationId]);

  // Send typing event (debounced)
  const sendTyping = useDebouncedCallback((isTyping: boolean) => {
    send('message.typing', {
      conversation_id: conversationId,
      is_typing: isTyping
    });
  }, 1000);

  return { typingUsers, sendTyping };
};
```

**Files to Create:**
- 🆕 `src/hooks/useTypingIndicator.ts`
- 🆕 `src/types/typing.types.ts`

---

#### 2.4 Debounced Typing Events 🟢
**ที่ตั้ง:** `src/components/shared/MessageInput.tsx`

**ต้องการ:**
- [ ] ส่ง `typing_start` เมื่อเริ่มพิมพ์
- [ ] ส่ง `typing_stop` เมื่อหยุดพิมพ์ 3 วินาที
- [ ] Debounce ไม่ให้ส่งบ่อยเกิน 1 ครั้ง/วินาที

**Implementation:**
```tsx
// ใน MessageInput.tsx
const { sendTyping } = useTypingIndicator(conversationId);
const typingTimeoutRef = useRef<NodeJS.Timeout>();

const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setValue(e.target.value);

  // ส่ง typing_start
  sendTyping(true);

  // ตั้ง timeout สำหรับ typing_stop
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
  }

  typingTimeoutRef.current = setTimeout(() => {
    sendTyping(false);
  }, 3000);
};
```

**Files to Modify:**
- ✏️ `src/components/shared/MessageInput.tsx`
- ✏️ `src/components/shared/MessageInputArea.tsx`

---

#### 2.5 Last Seen Formatter 🟢
**ที่ตั้ง:** สร้างใหม่ `src/utils/formatLastSeen.ts`

**ต้องการ:**
- [ ] "Active now" - ถ้า < 1 นาที
- [ ] "Active 5m ago" - ถ้า < 1 ชั่วโมง
- [ ] "Active 2h ago" - ถ้า < 24 ชั่วโมง
- [ ] "Active yesterday" - ถ้าเมื่อวาน
- [ ] "Last seen Jan 29" - ถ้านานกว่า

**Implementation:**
```typescript
// ใหม่: src/utils/formatLastSeen.ts
export const formatLastSeen = (lastActiveTime: Date | null): string => {
  if (!lastActiveTime) return 'Offline';

  const now = new Date();
  const diff = now.getTime() - lastActiveTime.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Active now';
  if (minutes < 60) return `Active ${minutes}m ago`;
  if (hours < 24) return `Active ${hours}h ago`;
  if (days === 1) return 'Active yesterday';

  return `Last seen ${lastActiveTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })}`;
};
```

**Files to Create:**
- 🆕 `src/utils/formatLastSeen.ts`

---

#### 2.6 Event Type Compatibility Layer 🟡
**ที่ตั้ง:** `src/services/websocket/constants.ts`

**ต้องการ:**
- [ ] รองรับทั้ง `message.typing` และ `typing_start/typing_stop`
- [ ] รองรับทั้ง `message:user.status` และ `user_status`

**Implementation:**
```typescript
// ใน constants.ts
export const WEBSOCKET_EVENTS = {
  // User status - รองรับทั้งสองแบบ
  USER_STATUS: ['user_status', 'message:user.status'],
  USER_ONLINE: ['user_online', 'message:user.online'],
  USER_OFFLINE: ['user_offline', 'message:user.offline'],

  // Typing - รองรับทั้งสองแบบ
  TYPING: ['user_typing', 'message.typing'],
  TYPING_START: ['typing_start', 'message.typing.start'],
  TYPING_STOP: ['typing_stop', 'message.typing.stop'],
} as const;
```

**Files to Modify:**
- ✏️ `src/services/websocket/constants.ts`
- ✏️ `src/hooks/useOnlineStatus.ts` (ใช้ compatibility layer)

---

### Priority 3: Optional Enhancements (ถ้ามีเวลา)

#### 3.1 Privacy Settings - Hide Last Seen 🟢
**ต้องการ:**
- [ ] Settings page: Toggle "Show my last seen"
- [ ] API: POST /api/v1/users/settings
- [ ] Respect other users' privacy settings

**Files to Create:**
- 🆕 `src/components/settings/PrivacySettings.tsx`
- 🆕 `src/services/privacyService.ts`

---

#### 3.2 Away Status Detection 🟢
**ต้องการ:**
- [ ] Auto-set to "away" after 5 minutes of inactivity
- [ ] Detect mouse/keyboard activity

**Files to Create:**
- 🆕 `src/hooks/useIdleDetection.ts`

---

#### 3.3 Typing Indicator in Conversation List 🟢
**ที่ตั้ง:** `src/components/standard/conversation/ConversationItem.tsx`

**ต้องการ:**
- [ ] แสดง "typing..." ใน preview message
- [ ] แทนที่ last message ชั่วคราว

---

## 📋 Action Items Summary

### 🔴 Blocked - รอ Backend (Estimated: 5-7 days)

1. **WebSocket `user_status` Broadcasting**
   - [ ] Event type: `user_status`
   - [ ] Broadcast to friends on connect/disconnect
   - [ ] Include `last_seen` timestamp

2. **Typing Auto-Stop Mechanism**
   - [ ] Auto-stop after 5 seconds
   - [ ] Cleanup routine every 1 minute

3. **Typing User Info**
   - [ ] Add `username` and `display_name` to response

4. **REST API Format**
   - [ ] Add `status` field
   - [ ] Rename `last_active_at` → `last_seen`

5. **Rate Limiting**
   - [ ] Limit typing events to 1/second

---

### 🟢 Can Start Now - Frontend (Estimated: 3-4 days)

#### Phase 1: UI Components (Day 1-2)
- [ ] **Chat Header - Online Status**
  - [ ] ใช้ `useOnlineStatus` hook ที่มีอยู่
  - [ ] แสดง online dot + last seen text
  - [ ] ทดสอบกับ mock data

- [ ] **Format Utilities**
  - [ ] `formatLastSeen.ts` - แสดงเวลาแบบ relative
  - [ ] `formatTypingText.ts` - แสดงรายชื่อคนกำลังพิมพ์

- [ ] **Typing Indicator Component**
  - [ ] `TypingIndicator.tsx` - UI component
  - [ ] `AnimatedDots.tsx` - animated dots

#### Phase 2: Hooks & Logic (Day 2-3)
- [ ] **Typing Indicator Hook**
  - [ ] `useTypingIndicator.ts`
  - [ ] Track typing users per conversation
  - [ ] Local 5-second timeout (fallback)

- [ ] **Debounced Typing**
  - [ ] ปรับ `MessageInput.tsx`
  - [ ] Debounce typing events (1 second)
  - [ ] Auto-stop after 3 seconds idle

#### Phase 3: Integration & Testing (Day 3-4)
- [ ] **Event Compatibility Layer**
  - [ ] รองรับทั้ง old และ new event types
  - [ ] ปรับ `useOnlineStatus.ts`

- [ ] **Testing**
  - [ ] ทดสอบ online status display
  - [ ] ทดสอบ typing indicator
  - [ ] ทดสอบ last seen formatting

---

## 🧪 Testing Plan

### Unit Tests
- [ ] `formatLastSeen.ts` - ทดสอบทุก time range
- [ ] `formatTypingText.ts` - ทดสอบ 1, 2, 3+ users
- [ ] `useTypingIndicator.ts` - ทดสอบ auto-cleanup

### Integration Tests
- [ ] Online status แสดงถูกต้องหลังจาก WebSocket connect
- [ ] Typing indicator แสดงและหายไปตาม timing
- [ ] Last seen อัปเดตเมื่อ user offline

### E2E Tests
- [ ] User A เห็น User B online เมื่อ User B เข้าระบบ
- [ ] User A เห็น "User B is typing..." เมื่อ User B พิมพ์
- [ ] Typing หายไปหลัง 5 วินาที

---

## 📊 Progress Tracking

### Week 1: Frontend Implementation
| Day | Tasks | Status |
|-----|-------|--------|
| Day 1 | Chat Header + Format Utils | ⏳ Todo |
| Day 2 | Typing Indicator Component | ⏳ Todo |
| Day 3 | Hooks & Debouncing | ⏳ Todo |
| Day 4 | Testing & Bug Fixes | ⏳ Todo |

### Week 2: Backend Integration
| Day | Tasks | Status |
|-----|-------|--------|
| Day 1-2 | รอ Backend: WebSocket events | 🔴 Blocked |
| Day 3-4 | รอ Backend: Typing auto-stop | 🔴 Blocked |
| Day 5 | Integration Testing | 🔴 Blocked |

---

## 🔗 เอกสารอ้างอิง

### Frontend Files
- `src/hooks/useOnlineStatus.ts` - Online status hook ที่มีอยู่แล้ว
- `src/stores/userStore.ts` - User status store
- `src/contexts/WebSocketContext.tsx` - WebSocket context
- `src/components/standard/conversation/ChatHeader.tsx` - Chat header component

### Backend Status Document
- `D:\Admin\Desktop\MY PROJECT\chat-backend-v2-main\FRONTEND_REQUIREMENTS_STATUS.md`

### API Documentation
- **Presence API:** `/api/v1/presence/user/:userId`
- **Batch API:** `/api/v1/presence/users`
- **Friends API:** `/api/v1/presence/friends/online`

---

## 💡 คำแนะนำสำหรับการพัฒนา

### 1. เริ่มจากสิ่งที่ไม่ blocked ก่อน
ให้เริ่มทำ Frontend UI components และ utilities ที่ไม่ต้องรอ Backend เปลี่ยน:
- ✅ Format utilities (formatLastSeen, formatTypingText)
- ✅ UI components (TypingIndicator, AnimatedDots)
- ✅ Chat Header enhancement

### 2. ใช้ Mock Data ระหว่างรอ Backend
สร้าง mock WebSocket events เพื่อทดสอบ UI:
```typescript
// Mock typing event
{
  "type": "user_typing",
  "data": {
    "user_id": "mock-uuid",
    "username": "john_doe",
    "display_name": "John Doe",
    "conversation_id": "conv-uuid",
    "is_typing": true
  }
}
```

### 3. ใช้ Feature Flags
ใช้ feature flags เพื่อเปิด/ปิด features ใหม่:
```typescript
const FEATURES = {
  TYPING_INDICATOR: true,
  ONLINE_STATUS: true,
  AUTO_AWAY: false, // ยังไม่เปิด
};
```

### 4. Backward Compatibility
รองรับทั้ง event types เก่าและใหม่เพื่อไม่ให้ระบบเดิมพัง:
- ✅ `message.typing` และ `user_typing`
- ✅ `message:user.status` และ `user_status`

---

## 🎯 คำถามที่ต้องถาม Backend Team

1. **WebSocket `user_status` event:**
   - Q: จะเริ่มพัฒนาเมื่อไหร่?
   - Q: จะ broadcast ไปหา friends อย่างไร? (all friends หรือเฉพาะที่ online?)

2. **Typing auto-stop:**
   - Q: จะใช้ in-memory cache หรือ Redis?
   - Q: มี cleanup mechanism หรือไม่?

3. **Response format changes:**
   - Q: จะรองรับ backward compatibility หรือไม่?
   - Q: จะมี API versioning หรือไม่? (v1 → v2)

4. **Timeline:**
   - Q: แต่ละ feature จะเสร็จประมาณเมื่อไหร่?
   - Q: ควร deploy ทีละ feature หรือรอจนครบทั้งหมด?

---

## 📞 Next Steps

### สำหรับ Frontend Team (เรา)
1. ✅ สร้าง UI components และ utilities ที่ไม่ blocked
2. ✅ เตรียม mock data สำหรับทดสอบ
3. ✅ เขียน unit tests
4. ⏳ รอ Backend implement WebSocket events

### สำหรับ Backend Team
1. 🔴 Implement WebSocket `user_status` broadcasting
2. 🔴 Implement typing auto-stop mechanism
3. 🔴 Add user info to typing events
4. 🔴 Update REST API response format
5. 🔴 Add rate limiting

### สำหรับทั้งสองทีม
1. 📅 Schedule sync meeting ทุกสัปดาห์
2. 🧪 Integration testing เมื่อ Backend พร้อม
3. 📊 Demo ให้ stakeholders เห็นความก้าวหน้า

---

**สร้างโดย:** Claude Code Assistant
**Version:** 1.0.0
**Last Updated:** 2025-01-30
