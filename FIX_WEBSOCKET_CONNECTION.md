# 🔧 แก้ปัญหา WebSocket ไม่เชื่อมต่อ

## ปัญหา: `[EventEmitter] No listeners for event: ws:message`

**สาเหตุ:** WebSocket ไม่เชื่อมต่อเพราะ ngrok URL หมดอายุหรือเปลี่ยน

---

## ✅ วิธีแก้ (ทำตามลำดับ)

### ขั้นตอนที่ 1: ตรวจสอบ Backend URL

#### 1.1 เช็ค Backend Terminal

ดูที่ terminal ที่รัน backend มีข้อความแบบนี้:

```
Forwarding https://xxxx.ngrok.dev -> http://localhost:8080
```

**Copy URL นี้** (เช่น `https://b01.ngrok.dev`)

---

#### 1.2 แก้ไข `.env` ใน Frontend

เปิดไฟล์:
```
D:\Admin\Desktop\MY PROJECT\chat-frontend-v2-main\.env
```

แก้เป็น URL ที่ได้จาก backend:
```env
VITE_API_BASE_URL=https://xxxx.ngrok.dev/api/v1
VITE_WS_BASE_URL=wss://xxxx.ngrok.dev

VITE_WS_RECONNECT_INTERVAL=3000
VITE_WS_MAX_RECONNECT_ATTEMPTS=10
VITE_WS_PING_INTERVAL=30000
```

**⚠️ สำคัญ:**
- HTTP → `https://`
- WebSocket → `wss://`
- ห้ามมี trailing slash `/` ท้าย WS_BASE_URL

---

#### 1.3 Restart Frontend

```bash
# หยุด frontend (Ctrl+C)
# รันใหม่
npm run dev
```

---

### ขั้นตอนที่ 2: Clear Browser Cache

```
1. กด Ctrl + Shift + R (hard refresh)
2. หรือ F12 → Application → Clear storage → Clear site data
3. Refresh อีกครั้ง
```

---

### ขั้นตอนที่ 3: Logout & Login ใหม่

```javascript
// เปิด Console (F12) พิมพ์:
localStorage.clear()
window.location.href = '/auth/login'
```

แล้ว **Login ใหม่**

---

### ขั้นตอนที่ 4: ตรวจสอบการเชื่อมต่อ

#### 4.1 เช็ค WebSocket Connection

F12 → Network → WS filter

**ควรเห็น:**
- ✅ Connection สถานะ `101 Switching Protocols` (สีเขียว)
- ✅ Messages tab มี events ไหลเข้ามา

**ถ้าเห็น:**
- ❌ Failed / 502 Bad Gateway → Backend ไม่รันหรือ ngrok URL ผิด
- ❌ 401 Unauthorized → Token หมดอายุ (logout & login ใหม่)

---

#### 4.2 เช็ค Console

**ไม่ควรเห็น errors เหล่านี้:**
```
WebSocket connection failed
401 Unauthorized
Cannot connect to wss://...
```

**ควรเห็น:**
```
[WebSocketManager] Initialized successfully
[WebSocketConnection] Connected
```

---

## 🎯 Quick Fix Script

Copy-paste ทั้งหมดนี้ใน Console (F12):

```javascript
// 1. Clear everything
localStorage.clear()
sessionStorage.clear()

// 2. Check current .env URLs
console.log('API URL:', import.meta.env.VITE_API_BASE_URL)
console.log('WS URL:', import.meta.env.VITE_WS_BASE_URL)

// 3. Go to login
window.location.href = '/auth/login'
```

---

## 🔍 ตรวจสอบว่าแก้สำเร็จหรือไม่

### Test 1: WebSocket Connected

F12 → Network → WS → คลิก connection → Messages tab

**ควรเห็น messages ไหลเข้ามา:**
```json
{"type":"message:conversation.create","data":{...}}
{"type":"user_status","data":{...}}
```

---

### Test 2: Typing Indicator

1. เปิด 2 browser windows (User A, User B)
2. User A พิมพ์ข้อความ (ยังไม่ส่ง)
3. User B ควรเห็น "User A is typing... ● ● ●"

**ถ้าเห็น** → ✅ **สำเร็จ!**

---

## ❓ FAQ

### Q: ngrok URL เปลี่ยนบ่อยมาก ทำไง?

**A:** มี 2 วิธี:

#### วิธีที่ 1: ใช้ ngrok Static Domain (แนะนำ)
```bash
# Upgrade ngrok account → ได้ static domain
# แก้ .env ครั้งเดียว ใช้ได้ตลอด
```

#### วิธีที่ 2: ใช้ localhost (สำหรับ Development)
```env
# .env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_WS_BASE_URL=ws://localhost:8080
```

**⚠️ หมายเหตุ:**
- localhost ใช้ได้แค่เครื่องเดียว
- ใช้ `ws://` (ไม่ใช่ `wss://`)
- ใช้ `http://` (ไม่ใช่ `https://`)

---

### Q: แก้แล้วยังไม่ได้

**A:** ส่งข้อมูลเหล่านี้มา:

1. **Screenshot Backend Terminal** (ดู ngrok URL)
2. **Screenshot `.env` file** (ใน Frontend)
3. **Screenshot Console** (F12 → Console tab)
4. **Screenshot Network → WS** (F12 → Network → WS filter)

---

## 📝 Checklist

ทำครบทุกข้อหรือยัง:

- [ ] เช็ค ngrok URL จาก Backend terminal
- [ ] แก้ `.env` ให้ตรงกับ URL ที่ได้
- [ ] Restart frontend (`Ctrl+C` แล้ว `npm run dev` ใหม่)
- [ ] Clear browser cache (Ctrl+Shift+R)
- [ ] Logout & Login ใหม่
- [ ] เช็ค WebSocket connection ใน Network tab
- [ ] ทดสอบ typing indicator

---

**ถ้าทำครบแล้วยังไม่ได้ → บอกได้เลยครับ จะช่วยแก้ต่อ!**

---

**Created by:** Claude Code
**Date:** 2025-01-30
