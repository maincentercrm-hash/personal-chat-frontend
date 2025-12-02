# Backend Action Items - สิ่งที่ Backend ต้องทำ

**วันที่:** 2025-01-30
**สำหรับ:** Backend Team
**จาก:** Frontend Team

---

## 🎯 สรุปสั้นๆ

จากแผน Frontend มี **5 สิ่งหลัก** ที่ Backend ต้องทำ:

| # | Feature | Priority | ETA | Blocking Frontend? |
|---|---------|----------|-----|-------------------|
| 1 | WebSocket `user_status` Broadcasting | 🔴 Critical | 2-3 วัน | ✅ **Yes** |
| 2 | Typing Auto-Stop Mechanism | 🟡 Important | 2-3 วัน | ⚠️ Partial (มี fallback) |
| 3 | Typing Event - User Information | 🟡 Important | 1 วัน | ⚠️ Partial (query ได้) |
| 4 | REST API Response Format Enhancement | 🟢 Nice to Have | 1 วัน | ❌ No |
| 5 | Event Type Consistency | 🟢 Nice to Have | 1 วัน | ❌ No |

**Timeline ที่ Backend แจ้ง:** Week 1 (Jan 30 - Feb 5)

---

## 🔴 Priority 1: CRITICAL - ต้องทำเพื่อ MVP

### 1. WebSocket `user_status` Event Broadcasting

**สถานะปัจจุบัน:** ❌ ยังไม่มี
**ETA:** 2-3 วัน (ตาม Backend timeline)
**Blocking Frontend:** ✅ **Yes** - Frontend ต้องรอนี้จึงจะแสดง real-time online/offline ได้

#### 📋 ที่ต้องทำ:

**Event ที่ต้องส่ง:**

**1.1 เมื่อ User Online** (WebSocket connect)
```json
{
  "type": "user_status",
  "data": {
    "user_id": "uuid",
    "status": "online",
    "timestamp": "2025-01-30T10:30:00Z"
  }
}
```

**1.2 เมื่อ User Offline** (WebSocket disconnect)
```json
{
  "type": "user_status",
  "data": {
    "user_id": "uuid",
    "status": "offline",
    "last_seen": "2025-01-30T10:30:00Z"
  }
}
```

#### 🎯 Requirements:

- [ ] **Broadcasting Rules:**
  - ส่งไปหา **Friends ที่ online** เท่านั้น (ไม่ใช่ทุกคน)
  - ไม่ส่งกลับไปหา sender เอง

- [ ] **Trigger Events:**
  - User เชื่อมต่อ WebSocket → ส่ง `status: "online"`
  - User ตัดการเชื่อมต่อ WebSocket → ส่ง `status: "offline"` พร้อม `last_seen`

- [ ] **Data Fields:**
  - `user_id`: UUID ของ user
  - `status`: `"online"` หรือ `"offline"` (string)
  - `timestamp`: ISO 8601 format
  - `last_seen`: ISO 8601 format (เฉพาะตอน offline)

#### 🧪 Testing:
```bash
# ทดสอบว่า event ถูกส่งจริง
1. User A login → User B (friend) ควรได้รับ event user_status: online
2. User A logout → User B ควรได้รับ event user_status: offline พร้อม last_seen
3. User C (ไม่ใช่ friend) → ไม่ควรได้รับ event
```

#### ❌ สิ่งที่ Frontend จะทำถ้า Backend ยังไม่พร้อม:
- ใช้ **Polling fallback**: Poll `/api/v1/presence/users` ทุก 30 วินาที
- แต่จะไม่ real-time (delay 30 วินาที)

---

## 🟡 Priority 2: IMPORTANT - ควรทำเพื่อ UX ที่ดี

### 2. Typing Auto-Stop Mechanism

**สถานะปัจจุบัน:** ❌ ยังไม่มี (ตอนนี้ typing indicator อาจค้างไม่หาย)
**ETA:** 2-3 วัน
**Blocking Frontend:** ⚠️ Partial - Frontend มี local timeout fallback แล้ว

#### 📋 ที่ต้องทำ:

**Behavior:**
1. รับ event `typing_start` (หรือ `is_typing: true`)
2. **รอ 5 วินาที**
3. ถ้าไม่ได้รับ `typing_stop` (หรือ `is_typing: false`)
4. → Backend **ส่ง `is_typing: false` อัตโนมัติ**

#### 🎯 Requirements:

- [ ] **In-memory Cache:**
  - เก็บ typing status ในหน่วยความจำ (ไม่ต้องเก็บใน database)
  - Key: `conversation_id:user_id`
  - Value: `{ is_typing: bool, timestamp: time, timer: *Timer }`

- [ ] **Auto-Stop Timer:**
  - ตั้ง timer 5 วินาทีเมื่อได้รับ `is_typing: true`
  - ถ้าได้รับ `is_typing: true` อีกก่อน 5 วินาที → reset timer
  - ถ้าครบ 5 วินาที → ส่ง `is_typing: false` ให้ conversation members

- [ ] **Cleanup Routine:**
  - ทุก 1 นาที ลบ typing cache ที่เก่ากว่า 10 วินาที
  - ป้องกัน memory leak

#### 💡 Implementation Hint:

```go
// Pseudo-code
var typingCache = sync.Map{} // "conv_id:user_id" -> *TypingStatus

type TypingStatus struct {
    ConversationID uuid.UUID
    UserID         uuid.UUID
    IsTyping       bool
    Timer          *time.Timer
}

func HandleTypingStart(convID, userID uuid.UUID) {
    key := fmt.Sprintf("%s:%s", convID, userID)

    // Cancel old timer if exists
    if old, exists := typingCache.Load(key); exists {
        old.(*TypingStatus).Timer.Stop()
    }

    // Set new timer (5 seconds)
    timer := time.AfterFunc(5*time.Second, func() {
        BroadcastTypingStop(convID, userID)
        typingCache.Delete(key)
    })

    typingCache.Store(key, &TypingStatus{
        ConversationID: convID,
        UserID:         userID,
        IsTyping:       true,
        Timer:          timer,
    })

    BroadcastTypingStart(convID, userID)
}
```

#### ❌ สิ่งที่ Frontend ทำอยู่แล้ว (Fallback):
- Frontend มี **local 5-second timeout** แล้ว
- แต่ไม่ perfect เพราะ:
  - ถ้า Frontend crash → typing indicator จะค้างฝั่ง Backend
  - Network issue → typing indicator อาจแสดงผิด

---

### 3. Typing Event - User Information

**สถานะปัจจุบัน:** ⚠️ ส่งแค่ `user_id` (ไม่มี `username`, `display_name`)
**ETA:** 1 วัน
**Blocking Frontend:** ⚠️ Partial - Frontend สามารถ query จาก local store ได้

#### 📋 ที่ต้องทำ:

**Response ปัจจุบัน:**
```json
{
  "type": "message.typing",
  "data": {
    "user_id": "uuid",
    "conversation_id": "uuid",
    "is_typing": true
  }
}
```

**Response ที่ต้องการ:**
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

#### 🎯 Requirements:

- [ ] **Query User Info:**
  - เมื่อรับ typing event → query `username` และ `display_name` จาก database
  - หรือเก็บไว้ใน WebSocket session cache

- [ ] **Include in Broadcast:**
  - ส่ง `username` และ `display_name` ไปพร้อมกับ typing event
  - ตรวจสอบว่า user info ไม่เป็น null

#### 💡 Use Case:
แสดง **"John Doe is typing..."** แทนที่จะแสดงแค่ dots

**ถ้าไม่มี:** Frontend ต้อง query user info เอง → ช้ากว่า

#### ❌ สิ่งที่ Frontend ทำอยู่แล้ว (Workaround):
- Frontend เก็บ user info ใน local store (userStore)
- เมื่อได้รับ `user_id` → query จาก store → แสดงชื่อ
- แต่อาจไม่มี info ถ้ายัง fetch ไม่ทัน

---

## 🟢 Priority 3: NICE TO HAVE - ไม่ blocking แต่ควรทำ

### 4. REST API Response Format Enhancement

**สถานะปัจจุบัน:** ✅ ใช้งานได้ แต่ format ไม่ตรง spec
**ETA:** 1 วัน
**Blocking Frontend:** ❌ No - Frontend รองรับทั้งสองแบบแล้ว

#### 📋 ที่ต้องทำ:

**Response ปัจจุบัน:**
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

**Response ที่ต้องการ:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "status": "online",           // 🆕 เพิ่ม
    "is_online": true,             // ✅ เก็บไว้ (backward compatible)
    "last_seen": "2025-01-30T10:30:00Z",  // 🆕 เปลี่ยนชื่อ
    "last_active_at": "2025-01-30T10:30:00Z"  // ✅ เก็บไว้ (backward compatible)
  }
}
```

#### 🎯 Requirements:

- [ ] **เพิ่ม Field:**
  - `status`: `"online"` | `"offline"` | `"away"` (string)
  - `last_seen`: เหมือนกับ `last_active_at` (แต่ชื่อชัดเจนกว่า)

- [ ] **Backward Compatibility:**
  - เก็บ `is_online` ไว้ (ไม่ลบ)
  - เก็บ `last_active_at` ไว้ (ไม่ลบ)
  - เพิ่ม `status` และ `last_seen` เข้าไปเท่านั้น

#### ✅ Frontend พร้อมรองรับแล้ว:
```typescript
// Frontend code รองรับทั้งสองแบบแล้ว
const lastSeen = data.last_seen || data.last_active_at;
const status = data.status || (data.is_online ? 'online' : 'offline');
```

---

### 5. Event Type Consistency

**สถานะปัจจุบัน:** ⚠️ Event names ไม่ตรง spec
**ETA:** 1 วัน
**Blocking Frontend:** ❌ No - Frontend รองรับทั้งสองแบบแล้ว

#### 📋 ที่ต้องทำ:

**ปัจจุบัน:**
- Typing: `message.typing`
- User status: ไม่มี

**ที่ต้องการ:**
- Typing: `typing_start`, `typing_stop` (from client) → `user_typing` (broadcast)
- User status: `user_status`

#### 🎯 Requirements:

- [ ] **รองรับทั้งแบบเก่าและใหม่:**
  - Accept: `message.typing` และ `typing_start/typing_stop`
  - Broadcast: `message.typing` และ `user_typing` (ส่งทั้งสอง event)

- [ ] **Deprecation Plan:**
  - สามารถใช้แบบเก่าได้อีก 1-2 เดือน
  - แจ้ง Frontend ให้ migrate ค่อยๆ
  - ลบแบบเก่าออกใน version ถัดไป

#### ✅ Frontend พร้อมรองรับแล้ว:
```typescript
// Frontend listen ทั้งสองแบบ
addEventListener('message.typing', handler);
addEventListener('user_typing', handler);
```

---

## 🌟 Optional: FUTURE ENHANCEMENTS

### 6. Privacy Setting - Hide Last Seen

**สถานะ:** 💡 แนวคิด - ยังไม่มีแผนทำ
**ETA:** 1-2 วัน (ถ้าทำ)
**Priority:** Optional

#### 📋 ที่ต้องทำ (ถ้าทำ):

**Database Migration:**
```sql
ALTER TABLE users
ADD COLUMN show_last_seen BOOLEAN DEFAULT true;
```

**API Endpoint:**
```http
PATCH /api/v1/users/me/settings
{
  "show_last_seen": false
}
```

**Presence API Update:**
```json
// ถ้า user ปิด show_last_seen
{
  "user_id": "uuid",
  "status": "offline",
  "is_online": false,
  "last_seen": null  // ← ไม่แสดง
}
```

#### 🎯 Use Case:
User สามารถซ่อน last seen ได้ (เหมือน WhatsApp, Telegram)

---

## 📅 Timeline Summary

### Week 1 (Jan 30 - Feb 5)

| Day | Backend Tasks | Frontend Dependencies |
|-----|---------------|----------------------|
| **Day 1-2** | 🔴 WebSocket `user_status` broadcasting | ✅ Critical - Frontend รอนี้ |
| **Day 2-3** | 🟡 Typing auto-stop mechanism | ⚠️ Optional - Frontend มี fallback |
| **Day 4** | 🟡 Typing user info + Event names | ⚠️ Optional - Frontend query ได้ |
| **Day 5** | 🟢 Response format + Testing | ❌ No blocking |

### Week 2 (Feb 6 - Feb 12)

| Day | Backend Tasks | Frontend Tasks |
|-----|---------------|----------------|
| **Day 1-2** | Rate limiting, Optimization | Integration testing กับ Backend |
| **Day 3-5** | Bug fixes, E2E testing | E2E testing ร่วมกัน |

---

## 🧪 Testing Checklist

### Backend ต้องทดสอบ:

#### 1. WebSocket `user_status`
- [ ] User A login → Friends ที่ online ได้รับ event
- [ ] User A logout → Friends ได้รับ event พร้อม `last_seen`
- [ ] User B (ไม่ใช่ friend) → ไม่ได้รับ event
- [ ] Multiple connections (mobile + web) → handle correctly

#### 2. Typing Auto-Stop
- [ ] User พิมพ์แล้วไม่ส่ง stop → auto-stop หลัง 5 วินาที
- [ ] User พิมพ์ซ้ำๆ → timer reset ทุกครั้ง
- [ ] Memory leak test → ไม่มี typing cache ค้างหลัง 10 วินาที

#### 3. Typing User Info
- [ ] Broadcast typing event → มี `username` และ `display_name`
- [ ] User ไม่มี display_name → fallback to username
- [ ] User info query → ไม่ช้าเกิน 50ms

#### 4. API Response Format
- [ ] Response มี field `status` และ `last_seen`
- [ ] Backward compatible → ยังมี `is_online` และ `last_active_at`

#### 5. Event Consistency
- [ ] รับได้ทั้ง `message.typing` และ `typing_start`
- [ ] Broadcast ได้ทั้ง `message.typing` และ `user_typing`

---

## 🚨 Important Notes

### 1. Backward Compatibility
⚠️ **สำคัญ:** ต้องรองรับทั้งแบบเก่าและใหม่
- Frontend บางส่วนอาจยังใช้ event names เก่าอยู่
- ค่อยๆ deprecate แบบเก่าใน 1-2 เดือน

### 2. Performance
⚠️ **ระวัง:**
- Typing events สามารถส่งบ่อยมาก (ทุก keystroke)
- ควรมี **rate limiting: 1 event/second**
- ใช้ in-memory cache (ไม่ใช่ database)

### 3. Scalability
💡 **แนะนำ:**
- ใช้ Redis สำหรับ typing cache (ถ้ามี multiple backend instances)
- WebSocket broadcasting ควรใช้ Redis pub/sub

---

## 📞 Communication

### Daily Sync (แนะนำ)
- 📅 เวลา: 10:00 AM
- 📝 Update: ความคืบหน้าแต่ละ feature
- 🚨 Blockers: แจ้งทันทีถ้าติดปัญหา

### Integration Testing (Week 2)
- 📅 เริ่ม: Feb 6 (เมื่อ Backend พร้อม)
- 👥 ทีม: Backend + Frontend ร่วมกัน
- 🧪 Test: E2E scenarios

---

## 📋 Quick Checklist for Backend

### Must Do (Week 1)
- [ ] WebSocket `user_status` broadcasting (Day 1-2)
- [ ] Typing auto-stop mechanism (Day 2-3)
- [ ] Typing user info (Day 4)

### Should Do (Week 1)
- [ ] Response format enhancement (Day 5)
- [ ] Event type consistency (Day 5)

### Could Do (Week 2)
- [ ] Rate limiting
- [ ] Database optimization
- [ ] Privacy settings (optional)

---

## ❓ Questions for Backend

1. **WebSocket `user_status`:**
   - จะ broadcast ไปหา friends อย่างไร? (query friends จาก DB ทุกครั้ง?)
   - จะ handle multiple devices (mobile + web) ยังไง?

2. **Typing auto-stop:**
   - จะใช้ in-memory หรือ Redis?
   - มี Redis pub/sub หรือเปล่า? (สำหรับ multiple instances)

3. **Timeline:**
   - ETA 2-3 วันนี้ แน่ใจได้ไหม?
   - มี blocker อะไรไหม?

4. **Deployment:**
   - จะ deploy ทีละ feature หรือรอครบทั้งหมด?
   - มี staging environment ไหม?

---

## 🎯 Success Criteria

### เมื่อ Backend เสร็จแล้ว ต้อง:

✅ **Functional:**
- User A online → User B เห็น real-time (< 1 วินาที)
- User A พิมพ์ → User B เห็น "User A is typing..."
- Typing หายไปหลัง 5 วินาที (แม้ Frontend ไม่ส่ง stop)

✅ **Performance:**
- WebSocket event latency < 100ms
- API response time < 200ms
- No memory leaks

✅ **Compatibility:**
- รองรับ event names เก่าและใหม่
- Response format backward compatible

---

**สรุป:** Backend ต้องทำ **5 สิ่ง** โดย **1 สิ่ง** (WebSocket `user_status`) เป็น **critical** ที่ Frontend รอ ส่วนที่เหลือ Frontend มี workaround ได้แล้ว

---

**สร้างโดย:** Frontend Team
**สำหรับ:** Backend Team
**Version:** 1.0.0
**Last Updated:** 2025-01-30
