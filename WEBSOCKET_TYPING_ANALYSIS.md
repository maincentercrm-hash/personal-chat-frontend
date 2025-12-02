# WebSocket Typing Indicator - Root Cause Analysis

**วันที่:** 2025-01-30
**ปัญหา:** Backend ส่ง `message.typing` และ `user_typing` events แล้ว แต่ Frontend ไม่แสดง Typing Indicator
**สถานะ:** 🔍 กำลังวิเคราะห์

---

## 📊 Evidence (หลักฐาน)

### ✅ Backend (ทำงานปกติ)

```
2025/11/30 12:03:04 Message type message.typing queued to broadcast channel
2025/11/30 12:03:04 Message type user_typing queued to broadcast channel
2025/11/30 12:03:04 WebSocket Hub: Broadcasting message type: message.typing
2025/11/30 12:03:04 WebSocket Hub: Broadcasting message type: user_typing
```

**สรุป:** Backend broadcast events ถูกต้องแล้ว ✅

### ❓ Frontend (ไม่ทำงาน)

- ❌ ไม่มี `[TypingIndicator]` logs ใน Console
- ❌ ไม่แสดง Typing Indicator UI
- ✅ WebSocket เชื่อมต่อได้ (ส่ง message ปกติได้)

**สรุป:** Events ไม่ถึง `useTypingIndicator` hook ❌

---

## 🔍 WebSocket Flow Analysis

### Flow ที่ควรเป็น:

```
Backend
  ↓ broadcast
WebSocket Server
  ↓ send
Browser WebSocket API
  ↓ onmessage
WebSocketConnection.handleMessage()
  ↓ parse & emit
WebSocketEventEmitter.emit('message.typing')
  ↓ trigger callbacks
useTypingIndicator.handleTypingEvent()
  ↓ update state
MessageArea renders TypingIndicator
```

### ❓ ที่ไหนขาด?

มาเช็คทีละ layer:

---

## 🔬 Layer-by-Layer Analysis

### Layer 1: WebSocketConnection ✅ (น่าจะทำงาน)

**File:** `src/services/websocket/WebSocketConnection.ts`

**หน้าที่:** รับ WebSocket messages และ parse

**Code ที่เกี่ยวข้อง:**
```typescript
// Line ~350
private handleMessage(event: MessageEvent): void {
  const message = JSON.parse(event.data);

  // Emit specific event based on type
  if (message.type === 'message.typing') {
    eventEmitter.emit('message.typing', message);
  }
}
```

**🔍 ต้องเช็ค:**
1. ✅ มีการ parse message.type ถูกต้องหรือไม่
2. ✅ มีการ emit 'message.typing' หรือไม่
3. ⚠️ **Format ของ message ที่รับมาตรงกับที่ emit หรือไม่**

**Potential Issue:**
- อาจมีการ transform/wrap message ก่อน emit
- อาจมี prefix เพิ่มเข้ามา (เช่น `message:message.typing`)

---

### Layer 2: WebSocketEventEmitter ⚠️ (อาจมีปัญหา)

**File:** `src/services/websocket/WebSocketEventEmitter.ts`

**หน้าที่:** Emit events ไปยัง listeners

**Code ที่เกี่ยวข้อง:**
```typescript
// Line 104-125
public emit<K extends keyof WebSocketEventMap>(
  event: K,
  data?: WebSocketEventMap[K]
): void {
  const callbacks = this.events.get(event);
  if (callbacks && callbacks.length > 0) {
    callbacks.forEach(callback => callback(data));
  } else {
    // Warning (ถูก suppress แล้ว)
  }
}
```

**🔍 ต้องเช็ค:**
1. ⚠️ **มี listener ลงทะเบียนหรือไม่** (ตรงนี้น่าจะเป็นปัญหา!)
2. ⚠️ Event key ตรงกันหรือไม่ (`message.typing` vs `message:message.typing`)

**Potential Issue:**
- Listener ลงทะเบียนด้วย key `message.typing`
- แต่ emit ด้วย key อื่น (เช่น `message:message.typing`)
- → Callbacks ไม่เจอ → ไม่ trigger

---

### Layer 3: WebSocketContext ✅ (น่าจะทำงาน)

**File:** `src/contexts/WebSocketContext.tsx`

**หน้าที่:** Provide addEventListener function

**Code:**
```typescript
addEventListener: <K extends keyof WebSocketEventMap>(
  event: K,
  callback: (data: WebSocketEventMap[K]) => void
) => () => void;
```

**🔍 ต้องเช็ค:**
- ✅ Function ถูก expose ออกมาหรือไม่
- ✅ Redirect ไปที่ WebSocketManager หรือไม่

---

### Layer 4: useTypingIndicator Hook ✅ (Code ถูกต้อง)

**File:** `src/hooks/useTypingIndicator.ts`

**Code:**
```typescript
// Line 107-117
useEffect(() => {
  console.log('[TypingIndicator] 🎧 Registering event listeners');
  const unsubscribeOld = addEventListener('message.typing', handleTypingEvent);
  const unsubscribeNew = addEventListener('user_typing', handleTypingEvent);

  return () => {
    unsubscribeOld();
    unsubscribeNew();
  };
}, [addEventListener, handleTypingEvent, conversationId]);
```

**🔍 ต้องเช็ค:**
1. ✅ มีการลงทะเบียน listener
2. ⚠️ **addEventListener function ทำงานหรือไม่**
3. ⚠️ **Event key ที่ส่งไป match กับที่ emit หรือไม่**

**Expected Logs (ถ้าทำงาน):**
```
[TypingIndicator] 🎧 Registering event listeners for conversation: xxx
```

**ถ้าไม่เห็น log นี้:**
- Component ไม่ได้ mount
- useEffect ไม่ run

---

### Layer 5: MessageArea Component ✅ (Code ถูกต้อง)

**File:** `src/components/shared/MessageArea.tsx`

**Code:**
```typescript
// Line 92-95
const { typingUsers } = useTypingIndicator({
  conversationId: activeConversationId,
  currentUserId
});

// Line 166-170
{typingUsers.length > 0 && (
  <div className="...">
    <TypingIndicator typingUsers={typingUsers} />
  </div>
)}
```

**🔍 ต้องเช็ค:**
- ✅ Hook ถูกเรียกใช้
- ✅ Component render เงื่อนไข
- ⚠️ **activeConversationId มีค่าหรือไม่**

---

## 🎯 Root Cause Hypothesis (สมมติฐาน)

### Hypothesis #1: Event Key Mismatch 🔥 (โอกาสสูงสุด)

**ปัญหา:**
- Backend ส่ง: `message.typing`
- WebSocketConnection อาจ emit เป็น: `message:message.typing` (มี prefix `message:`)
- useTypingIndicator ฟัง: `message.typing` (ไม่มี prefix)
- → **Key ไม่ตรงกัน → Listener ไม่ถูก trigger**

**วิธีตรวจสอบ:**
1. เพิ่ม log ใน WebSocketConnection.handleMessage() ดูว่า emit event key อะไร
2. เพิ่ม log ใน EventEmitter.emit() ดู key ที่รับเข้ามา
3. เปรียบเทียบกับ key ที่ useTypingIndicator ลงทะเบียน

**วิธีแก้:**
- ถ้า emit `message:message.typing` → เปลี่ยนเป็น `message.typing`
- หรือ ถ้า listen `message.typing` → เปลี่ยนเป็น `message:message.typing`

---

### Hypothesis #2: Listener Registration Failed ⚠️

**ปัญหา:**
- addEventListener ไม่ได้ forward ไปที่ EventEmitter จริงๆ
- หรือ WebSocket ยังไม่ initialized ตอนที่ลงทะเบียน listener

**วิธีตรวจสอบ:**
1. เพิ่ม log ใน WebSocketContext.addEventListener()
2. เช็คว่า listener ถูกส่งไปที่ EventEmitter หรือไม่
3. ดู EventEmitter.events Map ว่ามี 'message.typing' listener หรือไม่

**วิธีแก้:**
- ตรวจสอบ WebSocketManager.on() method
- ตรวจสอบว่า EventEmitter instance ถูกต้อง (singleton)

---

### Hypothesis #3: Message Format Mismatch 🔥

**ปัญหา:**
- Backend ส่ง:
  ```json
  {
    "type": "message.typing",
    "data": {...},
    "timestamp": "...",
    "success": true
  }
  ```
- แต่ handleTypingEvent expect:
  ```json
  {
    "data": {
      "user_id": "...",
      "conversation_id": "...",
      ...
    }
  }
  ```
- → Structure ไม่ตรง → `data.data` undefined

**วิธีตรวจสอบ:**
1. เพิ่ม log ใน handleTypingEvent ดู structure ของ data
2. ดูว่า data.data มีค่าหรือไม่

**วิธีแก้:**
- ถ้า backend ส่ง `{type, data, timestamp, success}`
- แต่ emit ทั้ง object ไป
- ต้อง unwrap: `eventEmitter.emit('message.typing', message.data)` (ไม่ใช่ `message`)

---

### Hypothesis #4: conversationId Undefined 🔥

**ปัญหา:**
- MessageArea ส่ง `activeConversationId` ที่เป็น `undefined`
- useTypingIndicator ลงทะเบียนด้วย `conversationId = undefined`
- เมื่อรับ event → `eventData.conversation_id !== conversationId` → ignore

**วิธีตรวจสอบ:**
1. เพิ่ม log ดู activeConversationId ใน MessageArea
2. เพิ่ม log ดู conversationId ใน useTypingIndicator

**วิธีแก้:**
- ตรวจสอบว่า URL มี conversationId หรือไม่
- ตรวจสอบ ConversationPageDemo ว่าส่ง activeConversationId ถูกต้องหรือไม่

---

## 🔧 Action Plan (แผนการแก้ไข)

### Step 1: เพิ่ม Debug Logs ใน WebSocketConnection

**File:** `src/services/websocket/WebSocketConnection.ts`

**เพิ่ม logs:**
```typescript
private handleMessage(event: MessageEvent): void {
  const message = JSON.parse(event.data);

  console.log('[WebSocketConnection] 📨 Raw message:', message);
  console.log('[WebSocketConnection] 📨 Message type:', message.type);

  // Emit event
  if (message.type === 'message.typing' || message.type === 'user_typing') {
    console.log('[WebSocketConnection] 🔔 Emitting typing event:', message.type);
    console.log('[WebSocketConnection] 🔔 Event data:', message.data);
    eventEmitter.emit(message.type, message);
  }
}
```

**Expected Output:**
```
[WebSocketConnection] 📨 Raw message: {type: 'message.typing', data: {...}}
[WebSocketConnection] 📨 Message type: message.typing
[WebSocketConnection] 🔔 Emitting typing event: message.typing
[WebSocketConnection] 🔔 Event data: {...}
```

---

### Step 2: เพิ่ม Debug Logs ใน EventEmitter.emit()

**File:** `src/services/websocket/WebSocketEventEmitter.ts`

**เพิ่ม logs:**
```typescript
public emit<K extends keyof WebSocketEventMap>(
  event: K,
  data?: WebSocketEventMap[K]
): void {
  console.log('[EventEmitter] 📤 Emitting:', String(event));
  console.log('[EventEmitter] 📤 Listeners count:', this.events.get(event)?.length || 0);
  console.log('[EventEmitter] 📤 Data:', data);

  const callbacks = this.events.get(event);
  if (callbacks && callbacks.length > 0) {
    console.log('[EventEmitter] ✅ Calling', callbacks.length, 'listeners');
    callbacks.forEach(callback => callback(data));
  } else {
    console.log('[EventEmitter] ❌ No listeners for:', String(event));
  }
}
```

**Expected Output (ถ้าทำงาน):**
```
[EventEmitter] 📤 Emitting: message.typing
[EventEmitter] 📤 Listeners count: 1
[EventEmitter] 📤 Data: {...}
[EventEmitter] ✅ Calling 1 listeners
```

**Expected Output (ถ้ามีปัญหา):**
```
[EventEmitter] 📤 Emitting: message:message.typing  ← เห็นไหม! มี prefix!
[EventEmitter] 📤 Listeners count: 0  ← ไม่มี listener!
[EventEmitter] ❌ No listeners for: message:message.typing
```

---

### Step 3: เพิ่ม Debug Logs ใน WebSocketManager/Context

**File:** ดูว่า addEventListener forward ไปที่ไหน

**เพิ่ม logs ใน addEventListener:**
```typescript
addEventListener: <K extends keyof WebSocketEventMap>(
  event: K,
  callback: (data: WebSocketEventMap[K]) => void
) => {
  console.log('[WebSocketContext] 📝 Registering listener for:', String(event));

  const unsubscribe = WebSocketManager.on(event, callback);

  return () => {
    console.log('[WebSocketContext] 🗑️ Unregistering listener for:', String(event));
    unsubscribe();
  };
}
```

---

### Step 4: เช็ค conversationId

**File:** `src/components/shared/MessageArea.tsx`

**เพิ่ม logs:**
```typescript
const { typingUsers } = useTypingIndicator({
  conversationId: activeConversationId,
  currentUserId
});

console.log('[MessageArea] 🆔 activeConversationId:', activeConversationId);
console.log('[MessageArea] 🆔 currentUserId:', currentUserId);
```

---

### Step 5: Test Flow End-to-End

**ทดสอบโดย:**
1. Refresh หน้าเว็บ
2. เข้าไปใน conversation
3. ให้อีกฝั่งพิมพ์
4. ดู Console logs ตั้งแต่ต้นจนจบ

**Logs ที่ต้องเห็นตามลำดับ:**
```
[WebSocketConnection] 📨 Raw message: {...}
[WebSocketConnection] 🔔 Emitting typing event: message.typing
[EventEmitter] 📤 Emitting: message.typing
[EventEmitter] ✅ Calling 1 listeners
[TypingIndicator] 📨 Received typing event: {...}
[TypingIndicator] ✅ Adding user to typing list: John Doe
```

**ถ้าขาดตรงไหน → ปัญหาอยู่ที่นั่น**

---

## 📋 Checklist (ต้องทำตามลำดับ)

### Phase 1: Information Gathering
- [ ] เพิ่ม logs ทั้งหมดตาม Step 1-4
- [ ] Refresh frontend
- [ ] ให้อีกฝั่งพิมพ์
- [ ] Screenshot Console logs ทั้งหมด
- [ ] วิเคราะห์ logs ดูว่าขาดตรงไหน

### Phase 2: Root Cause Identification
- [ ] ดู WebSocketConnection logs → emit event key อะไร
- [ ] ดู EventEmitter logs → มี listener หรือไม่
- [ ] ดู TypingIndicator logs → รับ event หรือไม่
- [ ] ระบุจุดที่ขาด

### Phase 3: Fix Implementation
- [ ] แก้ตามจุดที่ขาด
- [ ] Test อีกครั้ง
- [ ] Verify ว่าทำงานแล้ว

---

## 🎯 Most Likely Issues (เรียงตามโอกาส)

1. **🔥 Event Key Mismatch** (80%)
   - emit: `message:message.typing`
   - listen: `message.typing`
   - → ไม่ตรงกัน

2. **🔥 Message Format Mismatch** (15%)
   - emit: `{type, data, timestamp}`
   - expect: `{data: {user_id, ...}}`
   - → Structure ผิด

3. **⚠️ conversationId undefined** (4%)
   - activeConversationId = undefined
   - → Ignore event

4. **⚠️ Listener Registration Failed** (1%)
   - addEventListener ไม่ทำงาน
   - → ไม่มี listener

---

## 🚀 Next Steps

**ทำตาม Action Plan Step 1-5 แล้วส่ง logs มาให้ดูครับ!**

จะหาจุดที่มีปัญหาได้แน่นอน 💯

---

**Created by:** Claude Code
**Date:** 2025-01-30
**Status:** 🔍 Awaiting Debug Logs
