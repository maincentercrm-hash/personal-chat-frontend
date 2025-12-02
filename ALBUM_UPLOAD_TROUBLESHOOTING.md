# 🔍 Album Upload Troubleshooting Guide

**ปัญหา:** หลัง upload อัลบั้มเสร็จ ทั้งผู้ส่งและผู้รับไม่เห็นข้อความ

---

## ✅ การแก้ไขที่ทำไปแล้ว

### 1. **อัพเดท BulkMessageResponse Type**
```typescript
// ✅ src/types/file.types.ts
export interface BulkMessageResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    message_type: 'album'; // ✅ ตรงกับ Backend
    album_files: Array<{...}>; // ✅ ตรงกับ Backend
    ...
  };
}
```

### 2. **อัพเดท useBulkUpload Hook**
```typescript
// ✅ src/hooks/useBulkUpload.ts
const uploadResult: BulkUploadResult = {
  albumId: response.data.id,      // ✅ ใช้ message id
  message: response.data          // ✅ ส่งกลับ album message
}
```

### 3. **อัพเดท ConversationPageDemo**
```typescript
// ✅ src/pages/chat/ConversationPageDemo.tsx
onSuccess: (result) => {
  // ✅ NEW FORMAT: Add single album message
  if (result) {
    addNewMessage(result, currentUserId);
    console.log(`[BulkUpload] ✅ Added album message (${result.album_files?.length} files)`);
  }
}
```

### 4. **WebSocket Handler**
```typescript
// ✅ src/hooks/useConversation.ts
// WebSocket handler ไม่ต้องแก้ เพราะมันรับ MessageDTO อยู่แล้ว
addEventListener('message:message.receive', (rawData) => {
  const message = rawData.data; // รองรับ album_files แล้ว
  addNewMessage(message, currentUserId);
});
```

---

## 🧪 วิธีทดสอบ

### **Step 1: เปิด Console**
```bash
npm run dev
```

### **Step 2: เปิด Browser DevTools → Console Tab**

### **Step 3: Upload อัลบั้ม 4 รูป**

### **Step 4: ดู Console Logs**

#### ✅ **Log ที่ต้องเห็น (ถูกต้อง):**
```javascript
// 1. API Response
[BulkUpload] Success: {
  id: "717a1a33-...",
  message_type: "album",
  album_files: [...]
}

[BulkUpload] Album message type: album
[BulkUpload] Album files: 4

// 2. Add to State
[BulkUpload] ✅ Added album message (4 files) to local state

// 3. Message Rendering
📸 [AlbumMessageV2] Rendering: {
  messageId: "717a1a33",
  fileCount: 4,
  gridClass: "album-grid-4"
}

[HeightCache] Album NEW 717a1a33: 4 files → estimated 500px
```

#### ❌ **Log ที่แสดงว่ามีปัญหา:**
```javascript
// ❌ ถ้าเห็นนี้ = Response ผิด format
[BulkUpload] Success: {
  album_id: "...",      // ❌ OLD format
  messages: [...]       // ❌ OLD format
}

// ❌ ถ้าเห็นนี้ = ยังใช้ OLD component
📸 [Album OLD] Rendering album at position 0

// ❌ ถ้าไม่เห็นนี้เลย = ไม่ได้เพิ่ม message ลง state
[BulkUpload] ✅ Added album message...
```

---

## 🐛 Possible Issues & Solutions

### **Issue 1: ไม่เห็น message หลัง upload เสร็จ**

#### **สาเหตุที่เป็นไปได้:**

#### 1.1 **Response Type Mismatch**
```typescript
// ❌ ถ้า Backend ยังส่ง format เก่า:
{
  "data": {
    "album_id": "...",
    "messages": [...]
  }
}

// วิธีแก้: ตรวจสอบ Backend API response ใน Network tab
```

#### 1.2 **addNewMessage ไม่ทำงาน**
```typescript
// Debug: เพิ่ม log ใน ConversationPageDemo.tsx
onSuccess: (result) => {
  console.log('[DEBUG] onSuccess called with:', result);
  console.log('[DEBUG] result.album_files:', result.album_files);

  if (result) {
    console.log('[DEBUG] Calling addNewMessage...');
    addNewMessage(result, currentUserId);
    console.log('[DEBUG] addNewMessage completed');
  } else {
    console.error('[DEBUG] ❌ result is falsy!');
  }
}
```

#### 1.3 **Backend ไม่ส่ง WebSocket Event**
```javascript
// ✅ หลัง upload สำเร็จ Backend ควรส่ง WebSocket event:
{
  "type": "message.receive",
  "data": {
    "id": "717a1a33-...",
    "message_type": "album",
    "album_files": [...]
  }
}

// Debug: ตรวจสอบ WebSocket messages ใน Network tab → WS
```

---

## 🔍 Debugging Steps

### **1. ตรวจสอบ API Response**
```javascript
// เปิด Network tab → Filter: Fetch/XHR
// หา POST request ไป /messages/bulk
// ดู Response:
{
  "success": true,
  "message": "Album sent successfully",
  "data": {
    "id": "...",               // ✅ ต้องมี
    "message_type": "album",   // ✅ ต้องเป็น "album"
    "album_files": [...]       // ✅ ต้องมี array
  }
}
```

### **2. ตรวจสอบ onSuccess Callback**
```javascript
// เพิ่ม breakpoint ใน ConversationPageDemo.tsx line 114
onSuccess: (result) => {
  debugger; // ← เพิ่มบรรทัดนี้
  console.log('[BulkUpload] Success:', result);
  ...
}

// หรือใช้ console.log
console.log('[DEBUG] result:', JSON.stringify(result, null, 2));
```

### **3. ตรวจสอบ addNewMessage Function**
```javascript
// ใน ConversationPageDemo.tsx
// ตรวจสอบว่า addNewMessage ถูก import และใช้งานถูกต้อง
import { useConversationPageLogic } from '@/pages/standard/converstion/hooks/useConversationPageLogic';

const { addNewMessage, ... } = useConversationPageLogic(...);

// ต้องมี addNewMessage ถึงจะทำงาน
```

### **4. ตรวจสอบ Message Store**
```javascript
// เปิด Redux/Zustand DevTools
// หรือ log state:
import useConversationStore from '@/stores/conversationStore';

// หลัง upload เสร็จ
console.log('[DEBUG] Messages in store:',
  useConversationStore.getState().conversationMessages
);
```

### **5. ตรวจสอบ WebSocket Connection**
```javascript
// ใน Console
// ตรวจสอบว่า WebSocket เชื่อมต่ออยู่
// ดู Network tab → WS → ดู messages ที่ส่ง/รับ

// ถ้าเห็น message.receive event หลัง upload = Backend ส่ง WebSocket
// ถ้าไม่เห็น = Backend ไม่ได้ส่ง WebSocket event
```

---

## 🚨 Common Mistakes

### **Mistake 1: ลืมเพิ่ม message ลง state**
```typescript
// ❌ ผิด
onSuccess: (result) => {
  console.log('Success!'); // แค่ log ไม่ได้เพิ่ม message
}

// ✅ ถูกต้อง
onSuccess: (result) => {
  addNewMessage(result, currentUserId); // ต้องเพิ่ม
}
```

### **Mistake 2: ใช้ result.messages แทน result**
```typescript
// ❌ ผิด (OLD format)
if (result.messages && Array.isArray(result.messages)) {
  result.messages.forEach(msg => addNewMessage(msg));
}

// ✅ ถูกต้อง (NEW format)
if (result) {
  addNewMessage(result, currentUserId);
}
```

### **Mistake 3: Backend ไม่ส่ง WebSocket**
```python
# Backend ต้องส่ง WebSocket event หลัง bulk upload สำเร็จ
# (Python/FastAPI example)

@router.post("/messages/bulk")
async def send_bulk_messages(...):
    # 1. Create album message
    album_message = create_album_message(...)

    # 2. ✅ ส่ง WebSocket ให้ผู้รับ
    await ws_manager.send_to_conversation(
        conversation_id=conversation_id,
        event_type="message.receive",
        data=album_message
    )

    # 3. Return response
    return {
        "success": True,
        "data": album_message
    }
```

---

## 📝 Testing Checklist

### **Before Testing:**
- [ ] Backend API ส่ง format ใหม่แล้ว (message_type: "album")
- [ ] Frontend types updated (BulkMessageResponse)
- [ ] useBulkUpload updated
- [ ] ConversationPageDemo updated

### **During Testing:**
- [ ] Upload อัลบั้ม 4 รูป
- [ ] เปิด Console ดู logs
- [ ] เปิด Network tab ดู API response
- [ ] เปิด Network tab → WS ดู WebSocket messages

### **Expected Results:**
- [ ] API response มี `message_type: "album"`
- [ ] API response มี `album_files` array
- [ ] Console log: `[BulkUpload] ✅ Added album message`
- [ ] Console log: `📸 [AlbumMessageV2] Rendering`
- [ ] เห็นอัลบั้มโผล่ใน chat
- [ ] ผู้รับเห็นอัลบั้มผ่าน WebSocket

---

## 🎯 Quick Fix Summary

```typescript
// ✅ ที่ต้องแก้:
// 1. src/types/file.types.ts → BulkMessageResponse
// 2. src/hooks/useBulkUpload.ts → uploadResult
// 3. src/pages/chat/ConversationPageDemo.tsx → onSuccess

// ✅ ที่ไม่ต้องแก้:
// - WebSocket handler (รองรับ album แล้ว)
// - MessageItem.tsx (รองรับ album แล้ว)
// - AlbumMessageV2.tsx (พร้อมแล้ว)
```

---

## 🔗 Related Files

- `src/types/file.types.ts` - BulkMessageResponse
- `src/hooks/useBulkUpload.ts` - Upload logic
- `src/pages/chat/ConversationPageDemo.tsx` - onSuccess handler
- `src/hooks/useConversation.ts` - WebSocket handler
- `BACKEND_INTEGRATION_READY.md` - Testing guide

---

**หากยังไม่เห็น message หลัง upload:**

1. ตรวจสอบ Console logs ตาม checklist
2. ตรวจสอบ Network tab → Response
3. ตรวจสอบ Network tab → WS messages
4. เพิ่ม debug logs ใน onSuccess callback
5. ตรวจสอบว่า addNewMessage ถูกเรียกหรือไม่

**Status:** Frontend พร้อมแล้ว ✅ ถ้ายังมีปัญหา น่าจะเป็นเรื่องของ Backend WebSocket event 🔍
