# Backend Requirements for Chat UI/UX Improvements

**วันที่:** 2025-01-29
**เอกสารอ้างอิง:** `CHAT_UI_UX_IMPROVEMENT_PLAN.md`
**ผู้รับผิดชอบ:** Backend Developer

---

## 📋 สรุปความต้องการ Backend

จากแผนการปรับปรุง Chat UI/UX มี **เพียง 1 feature** ที่ต้องการการสนับสนุนจาก Backend:

| Feature | ต้องการ Backend | สถานะ | หมายเหตุ |
|---------|----------------|-------|----------|
| #6 Chat Header | ✅ **ต้องการ** | ต้องตรวจสอบ | Typing indicator + Last seen |
| #13 Auto-Scroll | ❌ ไม่ต้องการ | - | Frontend only |
| #23 Performance | ❌ ไม่ต้องการ | - | Frontend optimization |
| #28 Date Separator | ❌ ไม่ต้องการ | - | Frontend formatting |

---

## 🎯 Feature #6: Chat Header Improvements

### 1. Online/Offline Status

#### 1.1 WebSocket Events

**ที่ต้องการ:**
```json
// เมื่อ user online
{
  "type": "user_status",
  "data": {
    "user_id": "uuid",
    "status": "online",
    "timestamp": "2025-01-29T10:30:00Z"
  }
}

// เมื่อ user offline
{
  "type": "user_status",
  "data": {
    "user_id": "uuid",
    "status": "offline",
    "last_seen": "2025-01-29T10:30:00Z"
  }
}
```

**ต้องตรวจสอบ:**
- [ ] มี WebSocket event `user_status` หรือไม่?
- [ ] ส่ง event เมื่อ user เชื่อมต่อ/ตัดการเชื่อมต่อหรือไม่?
- [ ] มี field `last_seen` สำหรับ offline users หรือไม่?

#### 1.2 REST API (สำรอง)

**Endpoint ที่ต้องการ:**
```http
GET /api/v1/users/{user_id}/status
Authorization: Bearer <token>
```

**Response ที่คาดหวัง:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "status": "online" | "offline" | "away",
    "last_seen": "2025-01-29T10:30:00Z", // เฉพาะ offline
    "is_online": true
  }
}
```

**ต้องตรวจสอบ:**
- [ ] มี API endpoint สำหรับดึง user status หรือไม่?
- [ ] รองรับการดึง multiple users (batch) หรือไม่?
  ```http
  GET /api/v1/users/status?user_ids=uuid1,uuid2,uuid3
  ```

---

### 2. Typing Indicator

#### 2.1 WebSocket Events

**ที่ต้องการ:**

**ส่งจาก Frontend → Backend:**
```json
// เมื่อ user เริ่มพิมพ์
{
  "type": "typing_start",
  "data": {
    "conversation_id": "uuid",
    "user_id": "uuid"
  }
}

// เมื่อ user หยุดพิมพ์
{
  "type": "typing_stop",
  "data": {
    "conversation_id": "uuid",
    "user_id": "uuid"
  }
}
```

**รับจาก Backend → Frontend:**
```json
{
  "type": "user_typing",
  "data": {
    "conversation_id": "uuid",
    "user_id": "uuid",
    "username": "john_doe",
    "display_name": "John Doe",
    "is_typing": true | false
  }
}
```

**ต้องตรวจสอบ:**
- [ ] มี WebSocket event `typing_start` / `typing_stop` หรือไม่?
- [ ] Backend broadcast ไปยัง members ในการสนทนาหรือไม่?
- [ ] มี timeout mechanism (หยุดพิมพ์อัตโนมัติหลัง 5 วินาที) หรือไม่?
- [ ] ไม่ส่ง typing event กลับไปหา sender เองหรือไม่?

#### 2.2 Business Logic

**ที่ต้องการ:**
1. **Auto-stop typing หลัง 5 วินาที**
   - ถ้า frontend ไม่ส่ง `typing_stop` ภายใน 5 วินาที
   - Backend ต้องหยุด broadcast typing status อัตโนมัติ

2. **ไม่ส่งกลับไปหา sender**
   - User A พิมพ์ → Backend broadcast ไปหา User B, C, D
   - แต่ไม่ส่งกลับไปหา User A

3. **Group chat support**
   - สำหรับ group chat: แสดงชื่อคนที่กำลังพิมพ์
   - "John กำลังพิมพ์..."
   - "John และ Sarah กำลังพิมพ์..."
   - "John, Sarah และอีก 2 คนกำลังพิมพ์..."

**ต้องตรวจสอบ:**
- [ ] มี auto-stop mechanism หรือไม่?
- [ ] มี rate limiting สำหรับ typing events หรือไม่?
- [ ] รองรับ group chat หรือไม่?

---

### 3. Last Seen Timestamp

#### 3.1 Database Schema

**ที่ต้องการ:**
```sql
-- users table
ALTER TABLE users ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE;

-- หรือ user_sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    last_seen TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'offline',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**ต้องตรวจสอบ:**
- [ ] มี field `last_seen` ในฐานข้อมูลหรือไม่?
- [ ] อัพเดท `last_seen` เมื่อ user ทำกิจกรรม (ส่งข้อความ, อ่านข้อความ) หรือไม่?
- [ ] อัพเดท `last_seen` เมื่อ user disconnect WebSocket หรือไม่?

#### 3.2 Privacy Settings

**ที่ต้องการ (Optional):**

ให้ user สามารถซ่อน last seen ได้:

```sql
-- users table
ALTER TABLE users ADD COLUMN show_last_seen BOOLEAN DEFAULT true;
```

```json
// Privacy response
{
  "user_id": "uuid",
  "status": "offline",
  "last_seen": null,  // ถ้า user ปิดการแสดง
  "show_last_seen": false
}
```

**ต้องตรวจสอบ:**
- [ ] มี privacy settings สำหรับ last seen หรือไม่?
- [ ] มี logic ป้องกันการแสดง last seen เมื่อ user ปิด privacy หรือไม่?

---

## 🔍 Checklist สำหรับ Backend Developer

### A. Online/Offline Status

- [ ] **WebSocket Events**
  - [ ] มี event `user_status` เมื่อ user online/offline
  - [ ] ส่ง event ไปยัง friends/contacts ของ user
  - [ ] มี field `last_seen` ใน event

- [ ] **REST API**
  - [ ] มี endpoint `GET /api/v1/users/{id}/status`
  - [ ] รองรับ batch query (multiple users)
  - [ ] Response ตรงตาม spec

- [ ] **Database**
  - [ ] มี field `last_seen` ใน users table
  - [ ] อัพเดท `last_seen` เมื่อ disconnect

---

### B. Typing Indicator

- [ ] **WebSocket Events**
  - [ ] รับ event `typing_start` จาก frontend
  - [ ] รับ event `typing_stop` จาก frontend
  - [ ] Broadcast `user_typing` ไปยัง members (ยกเว้น sender)

- [ ] **Business Logic**
  - [ ] มี auto-stop หลัง 5 วินาที
  - [ ] มี rate limiting (ป้องกัน spam)
  - [ ] รองรับ group chat
  - [ ] ไม่ส่งกลับไปหา sender

- [ ] **Performance**
  - [ ] ไม่ save ลงฐานข้อมูล (in-memory only)
  - [ ] ไม่กระทบ performance ของ message sending

---

### C. Last Seen Timestamp

- [ ] **Database**
  - [ ] มี field `last_seen`
  - [ ] อัพเดทเมื่อ user ทำกิจกรรม
  - [ ] อัพเดทเมื่อ disconnect

- [ ] **API**
  - [ ] ส่ง `last_seen` ใน user status response
  - [ ] Format: ISO 8601 timestamp

- [ ] **Privacy (Optional)**
  - [ ] มี setting `show_last_seen`
  - [ ] ซ่อน `last_seen` เมื่อ user ปิด privacy

---

## 📝 ตัวอย่าง Implementation (Go)

### 1. Typing Indicator Handler

```go
// websocket/handlers/typing_handler.go
package handlers

import (
    "time"
    "github.com/google/uuid"
)

type TypingStatus struct {
    ConversationID uuid.UUID
    UserID         uuid.UUID
    IsTyping       bool
    Timestamp      time.Time
    StopTimer      *time.Timer
}

var typingCache = make(map[string]*TypingStatus) // conversation_id:user_id -> status

func HandleTypingStart(conversationID, userID uuid.UUID, hub *Hub) {
    key := fmt.Sprintf("%s:%s", conversationID, userID)

    // ถ้ามี timer เก่า → cancel
    if status, exists := typingCache[key]; exists {
        if status.StopTimer != nil {
            status.StopTimer.Stop()
        }
    }

    // สร้าง timer ใหม่ (auto-stop หลัง 5 วินาที)
    timer := time.AfterFunc(5*time.Second, func() {
        HandleTypingStop(conversationID, userID, hub)
    })

    // บันทึก status
    typingCache[key] = &TypingStatus{
        ConversationID: conversationID,
        UserID:         userID,
        IsTyping:       true,
        Timestamp:      time.Now(),
        StopTimer:      timer,
    }

    // Broadcast ไปยัง members (ยกเว้น sender)
    broadcastTypingStatus(conversationID, userID, true, hub)
}

func HandleTypingStop(conversationID, userID uuid.UUID, hub *Hub) {
    key := fmt.Sprintf("%s:%s", conversationID, userID)

    // ลบจาก cache
    if status, exists := typingCache[key]; exists {
        if status.StopTimer != nil {
            status.StopTimer.Stop()
        }
        delete(typingCache, key)
    }

    // Broadcast ไปยัง members
    broadcastTypingStatus(conversationID, userID, false, hub)
}

func broadcastTypingStatus(conversationID, userID uuid.UUID, isTyping bool, hub *Hub) {
    // ดึงรายชื่อ members
    members := getConversationMembers(conversationID)

    // สร้าง notification
    notification := map[string]interface{}{
        "type": "user_typing",
        "data": map[string]interface{}{
            "conversation_id": conversationID,
            "user_id":         userID,
            "is_typing":       isTyping,
        },
    }

    // Broadcast ไปยังทุกคน ยกเว้น sender
    for _, member := range members {
        if member.UserID != userID {
            hub.SendToUser(member.UserID, "notification", notification)
        }
    }
}
```

### 2. Online Status Handler

```go
// websocket/handlers/status_handler.go
package handlers

func HandleUserOnline(userID uuid.UUID, hub *Hub) {
    // อัพเดทสถานะในฐานข้อมูล
    db.Model(&models.User{}).
        Where("id = ?", userID).
        Update("status", "online")

    // Broadcast ไปยัง friends
    friends := getFriends(userID)

    notification := map[string]interface{}{
        "type": "user_status",
        "data": map[string]interface{}{
            "user_id":   userID,
            "status":    "online",
            "timestamp": time.Now(),
        },
    }

    for _, friend := range friends {
        hub.SendToUser(friend.ID, "notification", notification)
    }
}

func HandleUserOffline(userID uuid.UUID, hub *Hub) {
    now := time.Now()

    // อัพเดทสถานะและ last_seen
    db.Model(&models.User{}).
        Where("id = ?", userID).
        Updates(map[string]interface{}{
            "status":    "offline",
            "last_seen": now,
        })

    // Broadcast ไปยัง friends
    friends := getFriends(userID)

    notification := map[string]interface{}{
        "type": "user_status",
        "data": map[string]interface{}{
            "user_id":   userID,
            "status":    "offline",
            "last_seen": now,
        },
    }

    for _, friend := range friends {
        hub.SendToUser(friend.ID, "notification", notification)
    }
}
```

### 3. REST API Endpoint

```go
// api/v1/users/status.go
package users

func GetUserStatus(c *gin.Context) {
    userID := c.Param("id")

    var user models.User
    if err := db.First(&user, "id = ?", userID).Error; err != nil {
        c.JSON(404, gin.H{"error": "User not found"})
        return
    }

    // Check privacy settings
    var showLastSeen = user.ShowLastSeen

    response := gin.H{
        "success": true,
        "data": gin.H{
            "user_id":   user.ID,
            "status":    user.Status,
            "is_online": user.Status == "online",
        },
    }

    // เพิ่ม last_seen ถ้า user อนุญาต
    if showLastSeen && user.LastSeen != nil {
        response["data"].(gin.H)["last_seen"] = user.LastSeen
    }

    c.JSON(200, response)
}

// Batch endpoint
func GetMultipleUserStatus(c *gin.Context) {
    userIDsStr := c.Query("user_ids") // "uuid1,uuid2,uuid3"
    userIDs := strings.Split(userIDsStr, ",")

    var users []models.User
    db.Find(&users, "id IN ?", userIDs)

    statuses := make([]gin.H, 0)
    for _, user := range users {
        status := gin.H{
            "user_id":   user.ID,
            "status":    user.Status,
            "is_online": user.Status == "online",
        }

        if user.ShowLastSeen && user.LastSeen != nil {
            status["last_seen"] = user.LastSeen
        }

        statuses = append(statuses, status)
    }

    c.JSON(200, gin.H{
        "success": true,
        "data":    statuses,
    })
}
```

---

## 📊 Database Migration

### Migration Script

```sql
-- Migration: Add user status fields
-- Date: 2025-01-29

-- 1. Add columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline',
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS show_last_seen BOOLEAN DEFAULT true;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC);

-- 3. Update existing users
UPDATE users
SET status = 'offline',
    last_seen = NOW(),
    show_last_seen = true
WHERE status IS NULL;

-- 4. Add comment
COMMENT ON COLUMN users.status IS 'User online status: online, offline, away';
COMMENT ON COLUMN users.last_seen IS 'Last time user was online (for offline users)';
COMMENT ON COLUMN users.show_last_seen IS 'Privacy setting: show/hide last seen to others';
```

---

## 🧪 Testing Guidelines

### 1. WebSocket Events Testing

```bash
# Test typing indicator
wscat -c wss://your-api.com/ws?token=YOUR_TOKEN

# ส่ง typing_start
> {"type":"typing_start","data":{"conversation_id":"conv-uuid","user_id":"user-uuid"}}

# ตรวจสอบว่า user อื่นได้รับ user_typing event
# (ต้องเปิด WebSocket connection อีกตัว)

# ส่ง typing_stop
> {"type":"typing_stop","data":{"conversation_id":"conv-uuid","user_id":"user-uuid"}}
```

### 2. Online Status Testing

```bash
# Test user online event
# 1. User connect WebSocket → ควรส่ง user_status online
# 2. User disconnect → ควรส่ง user_status offline พร้อม last_seen

# Test REST API
curl -X GET "https://your-api.com/api/v1/users/USER_ID/status" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
# {
#   "success": true,
#   "data": {
#     "user_id": "uuid",
#     "status": "online",
#     "is_online": true,
#     "last_seen": "2025-01-29T10:30:00Z"
#   }
# }
```

### 3. Auto-Stop Typing Testing

```bash
# 1. ส่ง typing_start
# 2. รอ 6 วินาที (ไม่ส่ง typing_stop)
# 3. ตรวจสอบว่า Backend ส่ง user_typing: false อัตโนมัติหรือไม่
```

---

## 🚨 Potential Issues & Solutions

### Issue 1: Typing indicator ส่ง event บ่อยเกินไป

**ปัญหา:** Frontend ส่ง typing_start ทุกครั้งที่พิมพ์ (ทุก keystroke)

**Solution:**
- Backend: Implement rate limiting (ยอมรับ event ไม่เกิน 1 ครั้ง/วินาที)
- Frontend: Debounce typing events

```go
// Rate limiting example
var lastTypingTime = make(map[string]time.Time)

func HandleTypingStart(conversationID, userID uuid.UUID) {
    key := fmt.Sprintf("%s:%s", conversationID, userID)

    // Check rate limit (1 event per second)
    if lastTime, exists := lastTypingTime[key]; exists {
        if time.Since(lastTime) < 1*time.Second {
            return // Ignore event
        }
    }

    lastTypingTime[key] = time.Now()
    // ... continue processing
}
```

### Issue 2: Memory leak จาก typing cache

**ปัญหา:** Typing status cache เพิ่มขึ้นเรื่อยๆ ไม่มีการลบ

**Solution:**
- ใช้ TTL cache (auto-expire หลัง 10 วินาที)
- Cleanup routine ทุกๆ 1 นาที

```go
// Cleanup routine
go func() {
    ticker := time.NewTicker(1 * time.Minute)
    for range ticker.C {
        now := time.Now()
        for key, status := range typingCache {
            if now.Sub(status.Timestamp) > 10*time.Second {
                delete(typingCache, key)
            }
        }
    }
}()
```

### Issue 3: Last seen อัพเดทบ่อยเกินไป

**ปัญหา:** อัพเดท last_seen ทุกครั้งที่ user ทำอะไร → database overload

**Solution:**
- อัพเดทแค่เมื่อ disconnect WebSocket
- หรือ batch update ทุกๆ 5 นาที

```go
// Batch update every 5 minutes
go func() {
    ticker := time.NewTicker(5 * time.Minute)
    for range ticker.C {
        // อัพเดท last_seen สำหรับ active users
        db.Model(&User{}).
            Where("status = ?", "online").
            Update("last_seen", time.Now())
    }
}()
```

---

## 📋 Summary Checklist

### ต้องมี (Required)

- [ ] **Online/Offline WebSocket Events**
  - [ ] `user_status` event เมื่อ online/offline
  - [ ] มี field `last_seen`

- [ ] **Typing Indicator WebSocket**
  - [ ] รับ `typing_start` / `typing_stop`
  - [ ] Broadcast `user_typing` ไปยัง members
  - [ ] Auto-stop หลัง 5 วินาที

- [ ] **Last Seen Database Field**
  - [ ] มี column `last_seen` ใน users table
  - [ ] อัพเดทเมื่อ user offline

### ดีถ้ามี (Nice to Have)

- [ ] **User Status REST API**
  - [ ] `GET /api/v1/users/{id}/status`
  - [ ] Batch endpoint สำหรับหลาย users

- [ ] **Privacy Settings**
  - [ ] `show_last_seen` setting
  - [ ] ซ่อน last_seen ตาม privacy

- [ ] **Performance Optimizations**
  - [ ] Rate limiting สำหรับ typing events
  - [ ] TTL cache สำหรับ typing status
  - [ ] Batch update สำหรับ last_seen

---

## 🔗 เอกสารอ้างอิง

- **Frontend Plan:** `CHAT_UI_UX_IMPROVEMENT_PLAN.md`
- **WebSocket Events:** `MENTION_WEBSOCKET_FLOW.md`
- **API Documentation:** (ถ้ามี)

---

## 📞 ติดต่อ

หากมีข้อสงสัยหรือพบปัญหา:
1. สร้าง issue ใน GitHub
2. ติดต่อ Backend Team Lead
3. Meeting: Frontend + Backend sync

---

**สร้างโดย:** Claude Code Assistant
**Last Updated:** 2025-01-29
**Version:** 1.0.0
