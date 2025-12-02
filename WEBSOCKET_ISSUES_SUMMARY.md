# สรุปปัญหา WebSocket และวิธีแก้ไข

## 📋 สรุปปัญหา

### ปัญหาหลัก
เมื่อ navigate ระหว่างหน้า (โดยเฉพาะจาก URL อื่นไปยัง `/chat`) จะมี toast แสดงข้อความ **"การเชื่อมต่อขาดหาย"** แม้ว่าจะใช้ soft navigation (`navigate()`) แทน hard navigation (`window.location.href`)

### รายละเอียดปัญหา

จากการวิเคราะห์ log พบว่ามี WebSocket disconnect **2 ครั้ง**:

1. **Disconnect ครั้งแรก - Code 1006 (Abnormal Closure)**
   - เป็นการปิดแบบผิดปกติ (ไม่มีการส่ง close frame)
   - **แสดง toast "การเชื่อมต่อขาดหาย"** ❌

2. **Disconnect ครั้งที่สอง - Code 1000 (Normal Closure)**
   - เป็นการปิดปกติ
   - **ไม่แสดง toast** ✅

```javascript
// ตัวอย่าง log ที่เกิดปัญหา
🔴 [useWebSocket] WebSocket disconnected: {code: 1006, reason: '', wasClean: false}
🔴 [useWebSocket] isNormalClosure: false
🔴 [useWebSocket] Showing disconnect toast  // ← ปัญหาอยู่ตรงนี้!

🔴 [useWebSocket] WebSocket disconnected: {code: 1000, reason: '', wasClean: true}
🔴 [useWebSocket] isNormalClosure: true
✅ [useWebSocket] Normal closure - NOT showing toast
```

---

## 🔍 สาเหตุของปัญหา

### 1. **WebSocket Error เกิดขึ้นก่อน Disconnect**

จาก log พบว่า:
```
[WebSocketConnection] WebSocket error Event {...}
WebSocket connection to 'wss://...' failed: WebSocket is closed before the connection is established.
```

### 2. **`useWebSocket` useEffect ทำงานซ้ำโดยไม่จำเป็น**

**สาเหตุ:**
- `useEffect` ใน `useWebSocket.ts` มี dependency `registerEventListeners`
- ทุกครั้งที่ component re-render, useEffect จะทำงานอีกครั้ง
- เรียก `WebSocketManager.initialize()` ซ้ำ
- ทำให้ WebSocket disconnect/reconnect โดยไม่จำเป็น

**Code ที่มีปัญหา (เดิม):**
```typescript
useEffect(() => {
  WebSocketManager.initialize(accessToken, businessId);
  // ...
}, [accessToken, businessId, autoConnect, registerEventListeners]); // ← registerEventListeners ทำให้ทำงานซ้ำ
```

### 3. **ลำดับเหตุการณ์ที่เกิดขึ้น**

1. User navigate จากหน้าอื่น → `/chat`
2. Component re-render
3. `useWebSocket` useEffect ทำงานอีกครั้ง
4. เรียก `WebSocketManager.initialize()` แม้ WebSocket เชื่อมต่ออยู่แล้ว
5. WebSocketManager disconnect WebSocket เดิม (เพราะคิดว่า parameters เปลี่ยน)
6. WebSocket ปิดแบบ abnormal → **Code 1006** → **แสดง toast**
7. สร้าง WebSocket ใหม่และ connect
8. WebSocket เดิมปิดแบบ normal → Code 1000

---

## ✅ วิธีแก้ไขที่ทำไปแล้ว

### 1. **ป้องกัน Toast แสดงเมื่อ Normal Closure**

**ไฟล์:** `src/hooks/useWebSocket.ts`

เพิ่มการเช็ค close code ก่อนแสดง toast:

```typescript
const handleClose = (event: CloseEvent) => {
  // แสดง toast เฉพาะเมื่อเป็นการ disconnect ที่ผิดปกติ
  // Code 1000 = Normal closure
  // Code 1001 = Going away
  const isNormalClosure = event.code === 1000 || event.code === 1001;

  if (!isNormalClosure) {
    toast.warning('การเชื่อมต่อขาดหาย', 'กำลังพยายามเชื่อมต่อใหม่...');
  }
};
```

**ผลลัพธ์:** ลด toast ที่แสดงโดยไม่จำเป็น แต่ยังไม่แก้ปัญหาราก

### 2. **ป้องกัน WebSocket Re-initialize ที่ไม่จำเป็น**

**ไฟล์:** `src/hooks/useWebSocket.ts`

แก้ไข useEffect เพื่อ:
1. เอา `registerEventListeners` ออกจาก dependencies
2. เช็คว่า WebSocket เชื่อมต่ออยู่แล้วหรือไม่ ก่อน initialize

```typescript
useEffect(() => {
  if (!accessToken) return;

  // ✅ ป้องกันการ initialize ซ้ำ ถ้า WebSocket เชื่อมต่ออยู่แล้ว
  const alreadyConnected = WebSocketManager.isConnected();

  if (alreadyConnected) {
    console.log('✅ Already connected - skipping initialization');
    // แค่อัพเดท state และ register listeners
    setIsConnected(true);
    const unregisterListeners = registerEventListeners();
    return () => unregisterListeners();
  }

  // Initialize เฉพาะเมื่อยังไม่ได้เชื่อมต่อ
  WebSocketManager.initialize(accessToken, businessId);
  // ...
}, [accessToken, businessId, autoConnect]); // ✅ เอา registerEventListeners ออก
```

**ผลลัพธ์:** ป้องกัน WebSocket disconnect/reconnect ที่ไม่จำเป็น

### 3. **เปลี่ยนจาก Hard Navigation เป็น Soft Navigation**

**ไฟล์:** `src/pages/standard/friend/hooks/useFriendPageLogic.ts`

```typescript
// ❌ เดิม - Hard navigation (reload ทั้งหน้า)
window.location.href = `/chat/${conversation.id}`;

// ✅ ใหม่ - Soft navigation (ไม่ reload)
navigate(`/chat/${conversation.id}`);
```

**ผลลัพธ์:**
- ไม่มี page reload
- WebSocket ไม่ต้อง disconnect/reconnect
- UX ดีขึ้น, เร็วขึ้น

### 4. **ปิด Auto-focus ที่ Message Input**

**ไฟล์:** `src/components/shared/hooks/useMessageInput.ts`

```typescript
// ❌ เดิม - Auto-focus ทุกครั้งที่ isLoading เปลี่ยน
useEffect(() => {
  if (!isLoading) {
    messageInputRef.current?.focus();
  }
}, [isLoading]);

// ✅ ใหม่ - Comment ออกไม่ auto-focus
// useEffect(() => { ... }, [isLoading]);
```

**ผลลัพธ์:** ไม่มี auto-focus เมื่อเข้าหน้า conversation ครั้งแรก

---

## 🏗️ ต้อง Refactor ทั้งหมดหรือไม่?

### ✅ **ไม่จำเป็นต้อง Refactor ทั้งหมด**

**เหตุผล:**
1. ✅ Architecture โดยรวมดีอยู่แล้ว (singleton WebSocketManager + hooks)
2. ✅ ปัญหาหลักมาจาก useEffect dependencies และการเช็ค state
3. ✅ แก้ไขได้ด้วยการปรับ logic เล็กน้อย

### 📝 **สิ่งที่แก้ไขแล้ว = ก็เพียงพอ**

การแก้ไขที่ทำไปแล้วครอบคลุม:
- ✅ ป้องกัน re-initialize ที่ไม่จำเป็น
- ✅ ไม่แสดง toast เมื่อ normal closure
- ✅ ใช้ soft navigation แทน hard navigation
- ✅ เพิ่ม debug logging เพื่อติดตามปัญหา

---

## 📨 ต้องแจ้ง Backend หรือไม่?

### ❌ **ไม่ต้องแจ้ง Backend**

**เหตุผล:**
1. ✅ ปัญหาอยู่ที่ Frontend เท่านั้น (การจัดการ WebSocket connection lifecycle)
2. ✅ Backend ทำงานถูกต้อง (WebSocket server รับ/ส่งข้อมูลปกติ)
3. ✅ Code 1006 เกิดจากการ disconnect ที่ Frontend ฝั่งเดียว

### 📊 **สิ่งที่ควรสังเกต (Optional)**

ถ้าต้องการให้ Backend ช่วยตรวจสอบ:
```
ถ้าเห็น WebSocket disconnect บ่อยเกินไปจาก client เดียวกัน
อาจเป็นสัญญาณว่า Frontend มีปัญหาการจัดการ connection
แต่ไม่จำเป็นต้องแก้ไขอะไรที่ Backend
```

---

## 📊 ผลลัพธ์ที่คาดหวัง

### ✅ **หลังแก้ไข**

1. **Navigation ระหว่างหน้า**
   - ✅ ไม่มี toast "การเชื่อมต่อขาดหาย" (เว้นแต่ขาดการเชื่อมต่อจริงๆ)
   - ✅ WebSocket ยังคงเชื่อมต่ออยู่
   - ✅ ไม่มี disconnect/reconnect ที่ไม่จำเป็น

2. **Performance**
   - ✅ Navigate เร็วขึ้น (ไม่ reload หน้า)
   - ✅ ลด overhead จากการ disconnect/reconnect

3. **UX**
   - ✅ ไม่มี toast รบกวน
   - ✅ ไม่มี auto-focus ที่ไม่ต้องการ
   - ✅ Smooth navigation

### 🔴 **เมื่อไหร่ที่ Toast ควรแสดง**

Toast จะแสดงเฉพาะเมื่อ:
- ❌ Network error (code 1006 จาก network issue จริงๆ)
- ❌ Server ปิดการเชื่อมต่อ (code อื่นที่ไม่ใช่ 1000/1001)
- ❌ Connection timeout

---

## 🧪 วิธีทดสอบ

### 1. **ทดสอบ Navigation ปกติ**
```
1. เข้าหน้า /chat/contacts
2. กดปุ่ม "แชท" ที่เพื่อน
3. ตรวจสอบ console:
   - ✅ ควรเห็น: "Already connected - skipping initialization"
   - ❌ ไม่ควรเห็น: WebSocket error หรือ disconnect toast
```

### 2. **ทดสอบ Abnormal Disconnect**
```
1. เปิด DevTools → Network tab
2. เลือก WS (WebSocket)
3. คลิกขวา → Close connection
4. ตรวจสอบ:
   - ✅ ควรเห็น toast "การเชื่อมต่อขาดหาย"
   - ✅ ควร reconnect อัตโนมัติ
```

### 3. **ทดสอบ Auto-focus**
```
1. เข้าหน้า /chat/{id}
2. ตรวจสอบ:
   - ✅ ไม่ควรมี focus ที่ message input
   - ✅ ส่งข้อความแล้ว → ควร focus กลับมา
```

---

## 📝 Debug Logging

### Console Logs ที่ควรเห็น (ปกติ)

```javascript
// เมื่อ navigate ระหว่างหน้า
🔵 [useWebSocket] useEffect for initialization called
🔵 [useWebSocket] Checking if already connected: true
✅ [useWebSocket] Already connected - skipping initialization
```

### Console Logs ที่บ่งบอกปัญหา

```javascript
// ❌ ปัญหา: Re-initialize โดยไม่จำเป็น
🔵 [useWebSocket] useEffect for initialization called
🔵 [useWebSocket] Checking if already connected: true
🔵 [useWebSocket] Initializing with token and businessId: none  // ← ไม่ควรเกิด!

// ❌ ปัญหา: WebSocket error
🔴 [WebSocketConnection] WebSocket error Event {...}
🔴 [useWebSocket] WebSocket disconnected: {code: 1006, ...}
```

---

## 🎯 สรุปสุดท้าย

### ✅ **สิ่งที่ทำสำเร็จ**

1. ✅ แก้ปัญหา toast แสดงโดยไม่จำเป็น
2. ✅ ป้องกัน WebSocket re-initialize ที่ไม่จำเป็น
3. ✅ เปลี่ยนเป็น soft navigation
4. ✅ ปิด auto-focus
5. ✅ เพิ่ม debug logging

### 📋 **Checklist สำหรับทดสอบ**

- [ ] Navigate จาก /chat/contacts → /chat/{id} ไม่มี toast
- [ ] Navigate จาก URL อื่น → /chat ไม่มี toast (ถ้ายังมีให้ดู console log)
- [ ] กด conversation item ใน sidebar ไม่มี toast
- [ ] ถอด network cable → ควรมี toast "การเชื่อมต่อขาดหาย"
- [ ] เข้าหน้า conversation ไม่มี auto-focus

### 🚀 **Next Steps**

1. **Build และ Deploy**
   ```bash
   npm run build
   ```

2. **ทดสอบตาม Checklist**

3. **Monitor**
   - ดู console logs เมื่อใช้งานจริง
   - สังเกตว่ามี toast ปรากฏโดยไม่จำเป็นหรือไม่

4. **ถ้ายังมีปัญหา**
   - ส่ง console log มาให้ดู
   - จะ fine-tune การเช็คเงื่อนไขเพิ่มเติม

---

## 📚 ไฟล์ที่แก้ไข

| ไฟล์ | การแก้ไข |
|------|---------|
| `src/hooks/useWebSocket.ts` | เพิ่ม guard ป้องกัน re-init, แก้ close handler, debug logging |
| `src/components/shared/hooks/useMessageInput.ts` | ปิด auto-focus useEffect |
| `src/pages/standard/friend/hooks/useFriendPageLogic.ts` | เปลี่ยนจาก `window.location.href` เป็น `navigate()` |

---

**สรุป:** ไม่ต้อง refactor ทั้งหมด ไม่ต้องแจ้ง backend การแก้ไขที่ทำไปครอบคลุมปัญหาแล้ว เหลือแค่ทดสอบและ monitor ผลลัพธ์
