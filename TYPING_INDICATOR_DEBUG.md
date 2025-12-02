# 🐛 Typing Indicator Debug Guide

## ปัญหา: Typing Indicator ไม่แสดง

---

## ✅ ขั้นตอนการตรวจสอบ

### 1️⃣ เช็ค Console Logs

เปิด **Chrome DevTools** (F12) → **Console** tab

#### ต้องเห็น Logs เหล่านี้:

**เมื่อเริ่มพิมพ์:**
```
[MessageInput] 🔄 Render with props: { ... }
[useTypingIndicator] Typing start
```

**เมื่อหยุดพิมพ์:**
```
[useTypingIndicator] Typing stop
```

**ถ้าไม่เห็น logs เหล่านี้** → ปัญหาอยู่ที่ Frontend logic

---

### 2️⃣ เช็ค WebSocket Connection

เปิด **Chrome DevTools** (F12) → **Network** tab → กรอง **WS** (WebSocket)

#### ต้องเห็น:
- ✅ WebSocket connection สถานะ "101 Switching Protocols"
- ✅ Connection เปิดอยู่ (ไม่ใช่ "closed" หรือ "failed")

**ถ้า WebSocket ไม่เชื่อมต่อ:**
1. เช็คว่า Backend รันอยู่หรือไม่
2. เช็ค Console หา errors แบบนี้:
   ```
   WebSocket connection failed
   WebSocket closed
   ```

---

### 3️⃣ เช็ค WebSocket Events (สำคัญมาก!)

เปิด **Chrome DevTools** → **Network** → **WS** → คลิกที่ connection → ดูที่ **Messages** tab

#### เมื่อ User A พิมพ์:

**ต้องเห็น message ส่งออก (outgoing):**
```json
{
  "type": "message.typing",
  "data": {
    "conversation_id": "xxx",
    "is_typing": true
  }
}
```

#### เมื่อ User B รับ:

**ต้องเห็น message รับเข้า (incoming):**
```json
{
  "type": "user_typing",
  "data": {
    "conversation_id": "xxx",
    "user_id": "yyy",
    "username": "john_doe",
    "display_name": "John Doe",
    "is_typing": true
  }
}
```

**ถ้าไม่เห็น messages:**
- ❌ **ไม่มี outgoing** → Frontend ไม่ส่ง event (ปัญหาที่ MessageInput)
- ❌ **ไม่มี incoming** → Backend ไม่ส่งกลับมา (ปัญหาที่ Backend)
- ❌ **มี incoming แต่ไม่แสดง** → Frontend ไม่จัดการ event (ปัญหาที่ MessageArea)

---

### 4️⃣ เช็ค conversationId

เปิด **Console** แล้วพิมพ์:
```javascript
// เช็คว่า conversationId มีค่าหรือไม่
window.location.pathname
```

**ผลลัพธ์ควรเป็น:**
```
"/chat/uuid-ของ-conversation"
```

**ถ้าเป็น `/chat` (ไม่มี id):**
- → ยังไม่ได้เลือก conversation
- → Typing indicator จะไม่ทำงาน

---

### 5️⃣ เช็ค Component Rendering

เปิด **React DevTools** (ต้องติดตั้ง extension)

#### ต้องเห็น:
1. **MessageInput** component มี props:
   - `conversationId`: มีค่า (ไม่ใช่ undefined)

2. **MessageArea** component มี props:
   - `activeConversationId`: มีค่า (ไม่ใช่ undefined)

3. **TypingIndicator** component:
   - ต้องปรากฏใน DOM เมื่อมีคนพิมพ์
   - มี prop `typingUsers` ที่มีข้อมูล

**วิธีเช็ค:**
- React DevTools → Components tab
- หา MessageInput / MessageArea
- ดู props ขวามือ

---

## 🔍 วิเคราะห์ปัญหา

### Scenario 1: ไม่มี Console logs เลย

**สาเหตุ:**
- MessageInput component ไม่ได้ render
- conversationId เป็น undefined
- Hook ไม่ทำงาน

**วิธีแก้:**
1. เช็ค conversationId ใน URL
2. เช็ค Console หา errors
3. Refresh หน้าเว็บ

---

### Scenario 2: มี logs แต่ไม่มี WebSocket events

**สาเหตุ:**
- WebSocket ไม่เชื่อมต่อ
- send() function fail
- Backend ไม่รับ event

**วิธีแก้:**
1. เช็ค WebSocket connection status
2. เช็ค Backend logs
3. Restart backend

---

### Scenario 3: มี WebSocket events แต่ไม่แสดง UI

**สาเหตุ:**
- MessageArea ไม่ได้ใช้ useTypingIndicator
- TypingIndicator component ไม่ render
- CSS ซ่อน element

**วิธีแก้:**
1. เช็ค MessageArea component
2. เช็ค DevTools → Elements หา TypingIndicator
3. เช็ค CSS (display: none? opacity: 0?)

---

## 🧪 Test โดยตรงใน Console

### Test 1: เช็ค useTypingIndicator hook

เปิด Console แล้วพิมพ์:
```javascript
// ถ้าใช้ React DevTools สามารถเข้าถึง component state ได้
$r.state // หรือ $r.props
```

---

### Test 2: ส่ง typing event ด้วยมือ

เปิด Console แล้วพิมพ์:
```javascript
// Find WebSocket connection (ต้องรู้ว่า websocket object อยู่ที่ไหน)
// ถ้ามี global variable เก็บ websocket สามารถใช้ได้

// ตัวอย่าง (ถ้ามี window.ws)
window.ws.send(JSON.stringify({
  type: "message.typing",
  data: {
    conversation_id: "ใส่ conversation id ตรงนี้",
    is_typing: true
  }
}))
```

**ถ้า Backend ส่งกลับมา** → Backend ทำงานปกติ
**ถ้า Frontend แสดง indicator** → Frontend ทำงานปกติ

---

## 📸 Screenshot ที่ควรเห็น

### ✅ ถูกต้อง:

**WebSocket Messages:**
```
↑ {"type":"message.typing","data":{"conversation_id":"xxx","is_typing":true}}
↓ {"type":"user_typing","data":{"user_id":"yyy","is_typing":true,...}}
```

**UI:**
```
┌─────────────────────────────────┐
│ [Messages...]                    │
│ You: Hello                       │
│ John: Hi                         │
│ ─────────────────────────────    │
│ John is typing... ● ● ●         │ ← เห็นนี่!
└─────────────────────────────────┘
```

---

## ❓ FAQ

### Q: ทำไมถึงไม่เห็น typing indicator?
**A:** ตรวจสอบตามขั้นตอน 1-5 ด้านบน

### Q: เห็น WebSocket event แต่ไม่แสดง UI
**A:** เช็คว่า `typingUsers` array ใน MessageArea มีข้อมูลหรือไม่ (ใช้ React DevTools)

### Q: พิมพ์แล้วไม่ส่ง event
**A:** เช็คว่า:
1. conversationId มีค่าหรือไม่
2. WebSocket เชื่อมต่ออยู่หรือไม่
3. send() function ถูกเรียกหรือไม่ (ดู Console logs)

### Q: Event ส่งบ่อยเกินไป (spam)
**A:** ไม่น่าจะเกิด เพราะมี debounce (1 event/second)

---

## 🔧 Quick Fix Commands

### Restart Everything:
```bash
# Terminal 1: Stop & Start Backend
Ctrl+C
.\bin\api.exe

# Terminal 2: Stop & Start Frontend
Ctrl+C
npm run dev

# Browser: Hard Refresh
Ctrl+Shift+R
```

### Clear Browser Cache:
```
F12 → Application → Clear storage → Clear site data
```

---

## 📞 ถ้ายังไม่ได้

ส่งข้อมูลเหล่านี้มาครับ:

1. **Screenshot Console (F12 → Console)**
2. **Screenshot WebSocket Messages (F12 → Network → WS → Messages)**
3. **Screenshot React DevTools (MessageInput & MessageArea props)**
4. **Backend Logs**
5. **URL ที่กำลังอยู่ (window.location.href)**

---

**สร้างโดย:** Claude Code
**วันที่:** 2025-01-30
