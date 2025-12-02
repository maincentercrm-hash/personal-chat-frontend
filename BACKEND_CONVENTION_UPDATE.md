# 📢 แจ้ง Backend: ใช้ snake_case ต่อ (ยกเลิกการเปลี่ยน camelCase)

**วันที่:** 2025-11-28
**เรื่อง:** Convention สำหรับ Group Features API

---

## ✅ สรุปการตัดสินใจ

หลังจากตรวจสอบ codebase แล้ว **Frontend ขอให้ Backend ใช้ snake_case ต่อ** เหมือนเดิม

**เหตุผล:**
1. ✅ **API ทั้งหมดใช้ snake_case อยู่แล้ว**
   - `conversation_id`
   - `display_name`
   - `profile_image_url`
   - `created_at`
   - etc.

2. ✅ **ถ้าเปลี่ยนแค่ Group Features → จะไม่ Consistent**
   - API เก่า: snake_case
   - API ใหม่: camelCase
   - ❌ สับสน!

3. ✅ **ประหยัดเวลา Backend ~70 นาที**

---

## 🚫 ยกเลิกการแก้ไขเหล่านี้

### ❌ ไม่ต้องแก้ Request Body
```go
// ❌ ไม่ต้องเปลี่ยน
type TransferOwnershipInput struct {
    NewOwnerID string `json:"new_owner_id"`  // ✅ ใช้แบบนี้ต่อ (snake_case)
}
```

### ❌ ไม่ต้องแก้ Response DTO
```go
// ❌ ไม่ต้องเปลี่ยน
type ActivityDTO struct {
    ID             string    `json:"id"`
    ConversationID string    `json:"conversation_id"`  // ✅ ใช้แบบนี้ต่อ
    Type           string    `json:"type"`
    ActorID        string    `json:"actor_id"`         // ✅ ใช้แบบนี้ต่อ
    TargetID       *string   `json:"target_id,omitempty"`  // ✅
    OldValue       JSONB     `json:"old_value,omitempty"`  // ✅
    NewValue       JSONB     `json:"new_value,omitempty"`  // ✅
    CreatedAt      time.Time `json:"created_at"`       // ✅
}

type UserInfoDTO struct {
    ID              string `json:"id"`
    Username        string `json:"username"`
    DisplayName     string `json:"display_name"`           // ✅ ใช้แบบนี้ต่อ
    ProfileImageURL string `json:"profile_image_url,omitempty"` // ✅
}
```

---

## ✅ สิ่งที่ Backend ยังต้องทำ (เหลือ ~40 นาที)

### 1. WebSocket Event Naming (5 นาที)
ปรับให้ Consistent ใช้ `conversation.*` prefix

```go
// ✅ แก้จาก
"member.role_changed"

// เป็น
"conversation.member_role_changed"
```

### 2. เพิ่ม `conversation.activity.new` Event (~30 นาที)
ตามเดิมใน Response ครับ (ไฟล์ที่ต้องแก้: 6 ไฟล์)

### 3. เพิ่ม Activity Type Filter (~20 นาที)
```go
// Handler รับ query parameter
activityType := c.Query("type", "")

// ส่งต่อไปยัง Repository
activities, total, err := r.GetByConversationID(conversationID, limit, offset, activityType)
```

---

## 📋 สรุป Timeline ใหม่

| งาน | เวลาที่ใช้ | สถานะ |
|-----|----------|-------|
| ~~camelCase conversion~~ | ~~15 นาที~~ | ❌ ยกเลิก |
| WebSocket naming | 5 นาที | ⏳ ต้องทำ |
| conversation.activity.new | 30 นาที | ⏳ ต้องทำ |
| Activity type filter | 20 นาที | ⏳ ต้องทำ |
| Testing | 15 นาที | ⏳ ต้องทำ |
| **รวม** | **~70 นาที → 40 นาที** | ประหยัด 30 นาที! |

---

## 📝 ตัวอย่าง API Format ที่ถูกต้อง

### Request Example
```bash
# Update Member Role
PATCH /api/v1/conversations/:conversationId/members/:userId/role
Content-Type: application/json

{
  "role": "admin"
}
```

```bash
# Transfer Ownership
POST /api/v1/conversations/:conversationId/transfer-ownership
Content-Type: application/json

{
  "new_owner_id": "user-uuid-here"  # ✅ snake_case
}
```

### Response Example
```json
{
  "success": true,
  "data": {
    "conversation_id": "conv-uuid",
    "user_id": "user-uuid",
    "role": "admin",
    "updated_at": "2025-11-28T10:30:00Z"
  }
}
```

### Activity Response
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "act-uuid",
        "conversation_id": "conv-uuid",
        "type": "member.role_changed",
        "actor": {
          "id": "user-1",
          "username": "john_doe",
          "display_name": "John Doe",
          "profile_image_url": "https://..."
        },
        "target": {
          "id": "user-2",
          "username": "jane_smith",
          "display_name": "Jane Smith",
          "profile_image_url": "https://..."
        },
        "old_value": {"role": "member"},
        "new_value": {"role": "admin"},
        "created_at": "2025-11-28T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "limit": 20,
      "offset": 0
    }
  }
}
```

### WebSocket Event
```json
{
  "event": "conversation.member_role_changed",
  "data": {
    "conversation_id": "conv-uuid",
    "user_id": "user-uuid",
    "new_role": "admin",
    "changed_at": "2025-11-28T10:30:00Z"
  }
}
```

---

## ✅ Checklist สำหรับ Backend

- [ ] ยกเลิกการแก้ camelCase (ประหยัด 15 นาที)
- [ ] ✅ ใช้ snake_case ต่อในทุก API
- [ ] แก้ WebSocket event: `conversation.member_role_changed`
- [ ] เพิ่ม WebSocket event: `conversation.activity.new`
- [ ] เพิ่ม Activity type filter
- [ ] Test API endpoints
- [ ] ส่ง updated documentation

---

## 🎯 สรุป

**ใช้ snake_case ทั้งหมดเหมือนเดิม** → ไม่ต้องแก้ JSON format
- ✅ Consistent กับ API ทั้งหมด
- ✅ ประหยัดเวลา Backend
- ✅ Frontend ไม่ต้องแก้โค้ดเดิม

**เวลารวม:** ~40 นาที (ลดจาก 70 นาที)

---

**Created:** 2025-11-28
**Priority:** 🔴 High - แจ้ง Backend ทันที
**Action Required:** Backend ยกเลิกการแก้ camelCase
