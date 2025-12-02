# Typing Indicator - Fix Guide & Recommendations

**วันที่:** 2025-01-30
**จาก:** Backend Team
**ถึง:** Frontend Team
**เรื่อง:** คำแนะนำแก้ไข Typing Indicator

---

## 📊 สรุปการวิเคราะห์

Frontend วิเคราะห์ได้ดีมาก! ✅ แต่มี **3 จุดสำคัญ** ที่ขาดหายไป:

---

## 🔥 Issue #1: Message Format Unwrapping (Critical!)

### ❌ ปัญหาหลักที่พลาดไป:

Backend ส่ง message แบบนี้:
```json
{
  "type": "message.typing",
  "data": {
    "user_id": "uuid",
    "username": "john_doe",
    "display_name": "John Doe",
    "conversation_id": "uuid",
    "is_typing": true
  },
  "timestamp": "2025-01-30T10:30:00Z",
  "success": true
}
```

**แต่ WebSocketConnection emit อย่างนี้:**
```typescript
// ❌ ผิด - emit ทั้ง message object
eventEmitter.emit('message.typing', message);
```

**ผลลัพธ์:**
- `handleTypingEvent` รับ: `{type, data, timestamp, success}`
- แต่ expect: `{user_id, username, conversation_id, is_typing}`
- → `eventData.user_id` = `undefined`
- → `eventData.conversation_id` = `undefined`
- → ไม่ทำงาน! ❌

### ✅ วิธีแก้ที่ถูกต้อง:

**Option 1: Unwrap ใน WebSocketConnection (แนะนำ)**

```typescript
// File: src/services/websocket/WebSocketConnection.ts
private handleMessage(event: MessageEvent): void {
  const message = JSON.parse(event.data);

  // ✅ ถูก - unwrap message.data ก่อน emit
  if (message.type === 'message.typing') {
    eventEmitter.emit('message.typing', message.data); // ← เปลี่ยนจาก message เป็น message.data
  }

  if (message.type === 'user_typing') {
    eventEmitter.emit('user_typing', message.data); // ← เปลี่ยนจาก message เป็น message.data
  }
}
```

**Option 2: แก้ใน handleTypingEvent (ไม่แนะนำ)**

```typescript
// File: src/hooks/useTypingIndicator.ts
const handleTypingEvent = useCallback((eventData: any) => {
  console.log('[TypingIndicator] 📨 Received typing event:', eventData);

  // ✅ ถ้า emit ทั้ง message object มา ต้อง unwrap
  const data = eventData.data || eventData; // unwrap ถ้ามี

  if (!data.conversation_id || !data.user_id) {
    return;
  }

  if (data.conversation_id !== conversationId) {
    return;
  }

  // ใช้ data แทน eventData
  if (data.is_typing) {
    setTypingUsers(prev => {
      const exists = prev.some(user => user.userId === data.user_id);
      if (!exists) {
        return [...prev, {
          userId: data.user_id,
          username: data.username || 'Unknown',
          displayName: data.display_name || data.username || 'Unknown'
        }];
      }
      return prev;
    });
  } else {
    setTypingUsers(prev => prev.filter(user => user.userId !== data.user_id));
  }
}, [conversationId]);
```

**แนะนำ Option 1** เพราะ:
- แก้ที่เดียว (WebSocketConnection)
- แก้ทุก event type พร้อมกัน
- Consistent กับ WebSocket spec

---

## 🔥 Issue #2: Missing Event Constants

### ❌ ขาดหายไป:

ใน `src/services/websocket/constants.ts` ยังไม่มี:
```typescript
TYPING_START = "typing_start",
TYPING_STOP = "typing_stop",
USER_TYPING = "user_typing",
```

### ✅ วิธีแก้:

เพิ่มใน `MessageType` enum:

```typescript
export enum MessageType {
  // Connection management
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  PING = "ping",
  PONG = "pong",

  MESSAGE_SEND = "message.send",
  MESSAGE_RECEIVE = "message.receive",
  MESSAGE_UPDATED = "message.updated",
  MESSAGE_DELETE = "message.delete",
  MESSAGE_READ = "message.read",

  // Typing indicators
  MESSAGE_TYPING = "message.typing",      // ✅ เก่า (backward compatible)
  TYPING_START = "typing_start",          // 🆕 เพิ่ม
  TYPING_STOP = "typing_stop",            // 🆕 เพิ่ม
  USER_TYPING = "user_typing",            // 🆕 เพิ่ม

  CONVERSATION_CREATE = "conversation.create",
  // ... rest of the enum
}
```

---

## 🔥 Issue #3: WebSocketEventMap Type Definition

### ❌ ขาดหายไป:

`WebSocketEventMap` interface อาจไม่มี typing สำหรับ `user_typing`

### ✅ วิธีแก้:

เพิ่มใน `WebSocketEventMap`:

```typescript
// File: src/services/websocket/types.ts (หรือไฟล์ที่เกี่ยวข้อง)
export interface WebSocketEventMap {
  'connect': void;
  'disconnect': void;
  'message.typing': TypingEventData;  // ✅ มีอยู่แล้ว
  'user_typing': TypingEventData;      // 🆕 เพิ่ม
  'typing_start': { conversation_id: string };  // 🆕 เพิ่ม
  'typing_stop': { conversation_id: string };   // 🆕 เพิ่ม
  // ... rest of the map
}

export interface TypingEventData {
  user_id: string;
  username: string;
  display_name: string;
  conversation_id: string;
  is_typing: boolean;
}
```

---

## 📝 Step-by-Step Fix Guide

### Step 1: เพิ่ม Event Constants

**File:** `src/services/websocket/constants.ts`

```typescript
export enum MessageType {
  // ... existing events ...

  // Typing indicators
  MESSAGE_TYPING = "message.typing",
  TYPING_START = "typing_start",        // 🆕
  TYPING_STOP = "typing_stop",          // 🆕
  USER_TYPING = "user_typing",          // 🆕

  // ... rest ...
}
```

### Step 2: Update Type Definitions

**File:** `src/services/websocket/types.ts`

```typescript
export interface TypingEventData {
  user_id: string;
  username: string;
  display_name: string;
  conversation_id: string;
  is_typing: boolean;
}

export interface WebSocketEventMap {
  'message.typing': TypingEventData;
  'user_typing': TypingEventData;       // 🆕
  'typing_start': { conversation_id: string };  // 🆕
  'typing_stop': { conversation_id: string };   // 🆕
  // ... rest ...
}
```

### Step 3: Fix WebSocketConnection (Critical!)

**File:** `src/services/websocket/WebSocketConnection.ts`

```typescript
private handleMessage(event: MessageEvent): void {
  try {
    const message = JSON.parse(event.data);

    console.log('[WebSocketConnection] 📨 Received:', message.type);

    // Handle typing events - unwrap data!
    if (message.type === 'message.typing' || message.type === 'user_typing') {
      console.log('[WebSocketConnection] 🔔 Emitting typing event:', message.type);
      console.log('[WebSocketConnection] 🔔 Data:', message.data);

      // ✅ CRITICAL: Emit message.data (not message)
      eventEmitter.emit(message.type, message.data);
      return;
    }

    // Handle other message types...
    // For consistency, unwrap all events:
    if (message.data !== undefined) {
      eventEmitter.emit(message.type, message.data);
    } else {
      eventEmitter.emit(message.type, message);
    }

  } catch (error) {
    console.error('[WebSocketConnection] ❌ Error parsing message:', error);
  }
}
```

### Step 4: Verify useTypingIndicator

**File:** `src/hooks/useTypingIndicator.ts`

ตรวจสอบว่า handleTypingEvent รับ data format ถูกต้อง:

```typescript
const handleTypingEvent = useCallback((data: TypingEventData) => {
  console.log('[TypingIndicator] 📨 Received:', data);
  console.log('[TypingIndicator] 🆔 Conversation:', data.conversation_id);
  console.log('[TypingIndicator] 👤 User:', data.user_id, data.display_name);
  console.log('[TypingIndicator] ⌨️ Is typing:', data.is_typing);

  // Validate data structure
  if (!data || !data.conversation_id || !data.user_id) {
    console.warn('[TypingIndicator] ⚠️ Invalid data:', data);
    return;
  }

  // Check conversation match
  if (data.conversation_id !== conversationId) {
    console.log('[TypingIndicator] ⏭️ Different conversation, ignoring');
    return;
  }

  // Check self-typing
  if (data.user_id === currentUserId) {
    console.log('[TypingIndicator] ⏭️ Self-typing, ignoring');
    return;
  }

  // Update typing users
  if (data.is_typing) {
    console.log('[TypingIndicator] ✅ Adding user:', data.display_name);
    setTypingUsers(prev => {
      const exists = prev.some(user => user.userId === data.user_id);
      if (!exists) {
        return [...prev, {
          userId: data.user_id,
          username: data.username || 'Unknown',
          displayName: data.display_name || data.username || 'Unknown'
        }];
      }
      return prev;
    });
  } else {
    console.log('[TypingIndicator] ❌ Removing user:', data.display_name);
    setTypingUsers(prev => prev.filter(user => user.userId !== data.user_id));
  }
}, [conversationId, currentUserId]);
```

### Step 5: Listen to Both Events

**File:** `src/hooks/useTypingIndicator.ts`

```typescript
useEffect(() => {
  if (!conversationId) {
    console.warn('[TypingIndicator] ⚠️ No conversationId provided');
    return;
  }

  console.log('[TypingIndicator] 🎧 Registering listeners for:', conversationId);

  // Listen to both old and new events
  const unsubscribeOld = addEventListener('message.typing', handleTypingEvent);
  const unsubscribeNew = addEventListener('user_typing', handleTypingEvent);

  console.log('[TypingIndicator] ✅ Listeners registered');

  return () => {
    console.log('[TypingIndicator] 🗑️ Unregistering listeners');
    unsubscribeOld();
    unsubscribeNew();
  };
}, [addEventListener, handleTypingEvent, conversationId]);
```

---

## 🧪 Testing Checklist

### Phase 1: Verify Fixes

- [ ] เพิ่ม constants: `TYPING_START`, `TYPING_STOP`, `USER_TYPING`
- [ ] เพิ่ม type definitions: `TypingEventData`
- [ ] แก้ WebSocketConnection: emit `message.data` (not `message`)
- [ ] เพิ่ม logs ทั้งหมดตาม Step 3-5

### Phase 2: Test Flow

1. [ ] Refresh frontend
2. [ ] เข้าไปใน conversation
3. [ ] ให้ user อื่นพิมพ์
4. [ ] เช็ค Console logs:

**Expected Logs (ถ้าถูกต้อง):**
```
[WebSocketConnection] 📨 Received: message.typing
[WebSocketConnection] 🔔 Emitting typing event: message.typing
[WebSocketConnection] 🔔 Data: {user_id: "...", username: "...", ...}
[EventEmitter] 📤 Emitting: message.typing
[EventEmitter] 📤 Listeners count: 1
[EventEmitter] ✅ Calling 1 listeners
[TypingIndicator] 📨 Received: {user_id: "...", username: "...", ...}
[TypingIndicator] 🆔 Conversation: uuid-string
[TypingIndicator] 👤 User: uuid-string John Doe
[TypingIndicator] ⌨️ Is typing: true
[TypingIndicator] ✅ Adding user: John Doe
```

5. [ ] เช็คว่าเห็น Typing Indicator UI
6. [ ] รอ 5 วินาที → ควรหายอัตโนมัติ (auto-stop)
7. [ ] ให้ user พิมพ์ต่อ → ควรแสดงอีกครั้ง

---

## 🎯 Common Pitfalls (สิ่งที่ต้องระวัง)

### 1. ลืม unwrap message.data

```typescript
// ❌ ผิด
eventEmitter.emit('message.typing', message);

// ✅ ถูก
eventEmitter.emit('message.typing', message.data);
```

### 2. ลืมเพิ่ม type definitions

ถ้าไม่เพิ่ม `WebSocketEventMap`, TypeScript จะ error:
```typescript
// Error: Property 'user_typing' does not exist on type 'WebSocketEventMap'
addEventListener('user_typing', handler);
```

### 3. ลืมตรวจสอบ conversationId

```typescript
// ❌ ไม่ดี - ไม่ check conversation
if (data.is_typing) {
  setTypingUsers(...);
}

// ✅ ดี - check conversation ก่อน
if (data.conversation_id !== conversationId) {
  return; // ignore
}
if (data.is_typing) {
  setTypingUsers(...);
}
```

### 4. ลืม filter self-typing

```typescript
// ❌ ไม่ดี - แสดง typing ของตัวเอง
if (data.is_typing) {
  setTypingUsers(...);
}

// ✅ ดี - filter ตัวเองออก
if (data.user_id === currentUserId) {
  return; // ignore self
}
if (data.is_typing) {
  setTypingUsers(...);
}
```

---

## 🔍 Debug Helper Code

เพิ่ม code นี้ใน WebSocketConnection เพื่อ debug:

```typescript
private handleMessage(event: MessageEvent): void {
  const message = JSON.parse(event.data);

  // 🐛 Debug: Log all messages
  if (message.type.includes('typing')) {
    console.group('[WebSocketConnection] 🔍 DEBUG: Typing Event');
    console.log('Full message:', message);
    console.log('Message type:', message.type);
    console.log('Message data:', message.data);
    console.log('Data structure check:');
    console.log('  - Has user_id:', !!message.data?.user_id);
    console.log('  - Has conversation_id:', !!message.data?.conversation_id);
    console.log('  - Has username:', !!message.data?.username);
    console.log('  - Has display_name:', !!message.data?.display_name);
    console.log('  - is_typing value:', message.data?.is_typing);
    console.groupEnd();
  }

  // Emit event...
}
```

**Expected Debug Output:**
```
[WebSocketConnection] 🔍 DEBUG: Typing Event
  Full message: {type: 'message.typing', data: {...}, timestamp: '...', success: true}
  Message type: message.typing
  Message data: {user_id: '...', username: 'john_doe', display_name: 'John Doe', ...}
  Data structure check:
    - Has user_id: true ✅
    - Has conversation_id: true ✅
    - Has username: true ✅
    - Has display_name: true ✅
    - is_typing value: true ✅
```

---

## 📊 Summary of Changes

| File | Change | Priority |
|------|--------|----------|
| `constants.ts` | เพิ่ม `TYPING_START`, `TYPING_STOP`, `USER_TYPING` | 🔴 Critical |
| `types.ts` | เพิ่ม `TypingEventData` interface | 🔴 Critical |
| `WebSocketConnection.ts` | Unwrap `message.data` before emit | 🔴 Critical |
| `useTypingIndicator.ts` | เพิ่ม logs และ validation | 🟡 Important |
| `MessageArea.tsx` | เพิ่ม logs สำหรับ debug | 🟢 Optional |

---

## 🎓 Key Learnings

### 1. WebSocket Message Structure

Backend ส่ง:
```json
{
  "type": "event.name",
  "data": { actual: "payload" },
  "timestamp": "...",
  "success": true
}
```

Frontend ควร:
- Parse `message.type` เพื่อ route event
- Emit `message.data` เพื่อให้ handlers ใช้งาน
- **ไม่ใช่** emit ทั้ง `message` object

### 2. Event Naming Convention

- Backend events: snake_case (`typing_start`, `user_typing`)
- Frontend constants: SCREAMING_SNAKE_CASE (`TYPING_START`, `USER_TYPING`)
- Event keys: ต้องตรงกับ Backend (`'typing_start'`, `'user_typing'`)

### 3. Type Safety

TypeScript types ช่วยป้องกัน bugs:
```typescript
// ✅ Type-safe
interface TypingEventData {
  user_id: string;
  username: string;
  display_name: string;
  conversation_id: string;
  is_typing: boolean;
}

const handleTypingEvent = (data: TypingEventData) => {
  // TypeScript จะเช็คให้ว่ามี properties ครบ
};
```

---

## 🚀 Next Steps

1. **ทำตาม Step 1-5** ตามลำดับ
2. **Test** ตาม Testing Checklist
3. **ถ่าย screenshot** ของ Console logs ส่งมาให้เช็ค
4. **ถ้ายังไม่ทำงาน** ส่ง logs ทั้งหมดมา จะช่วยหาปัญหาต่อ

---

## 💡 Additional Tips

### Tip 1: Use React DevTools

ใช้ React DevTools ดู state ของ `useTypingIndicator`:
- เช็ค `typingUsers` array
- ดูว่า state update หรือไม่

### Tip 2: Monitor Network Tab

ใช้ Browser DevTools → Network → WS:
- เช็คว่า WebSocket messages มาถึง browser
- ดู raw message format

### Tip 3: Test with Multiple Users

- เปิด 2 browser tabs (incognito + normal)
- Login คนละ user
- ทดสอบพิมพ์ไปมา

---

## 📞 Support

หากแก้ตาม guide นี้แล้วยังไม่ทำงาน:

1. Screenshot Console logs ทั้งหมด
2. Screenshot Network → WS tab
3. Screenshot React DevTools state
4. ส่งมาให้ Backend team ดูต่อ

**We're here to help! 🤝**

---

**Created by:** Backend Team
**Date:** 2025-01-30
**Version:** 1.0.0
**Status:** ✅ Ready for Implementation
