# 📎 Feature Request: Multi-File Upload in Single Message (Telegram-like)

**วันที่**: 2025-01-27
**ผู้ขอ**: Frontend Team
**สถานะ**: Pending Backend Implementation

---

## 🎯 ความต้องการ

ต้องการฟีเจอร์ **ส่งหลายไฟล์ใน 1 ข้อความ** เหมือน Telegram/WhatsApp

### User Experience ที่ต้องการ:

```
1. User เลือกหลายไฟล์พร้อมกัน (เช่น 4 รูป)
2. ใส่ caption (ข้อความ) ได้
3. กด Send → ส่งเป็น 1 message
4. แสดงผลเป็น Grid Layout สวยงาม

┌─────────────────────┐
│ [Photo 1] [Photo 2] │  <- Grid 2x2
│ [Photo 3] [Photo 4] │
│                     │
│ "Holiday trip 🏖️"  │  <- Caption
└─────────────────────┘
```

---

## 📊 สถานะปัจจุบัน

### ✅ Backend มีแผนไว้แล้ว
พบเอกสาร `refector_plan/bulk_upload_analysis.md` ที่มีแผนการพัฒนาครบถ้วน:
- ใช้ Metadata JSONB เก็บ `album_id`, `album_position`, `album_total`
- API endpoint: `POST /messages/:conversationId/bulk`
- รองรับสูงสุด 10 ไฟล์ต่อ message

### ❌ ยังไม่ได้ Implement
ตรวจสอบแล้วพบว่า:
- `domain/dto/message_dto.go` - ยังไม่มี `BulkMessageRequest`
- `interfaces/api/handler/message_handler.go` - ยังไม่มี `SendBulkMessages` handler
- `interfaces/api/routes/message_routes.go` - ยังไม่มี bulk route

---

## 🔧 สิ่งที่ Backend ต้องทำ (ตามแผนที่มีอยู่)

### 1. เพิ่ม DTO
**File**: `domain/dto/message_dto.go`

```go
// BulkMessageRequest สำหรับส่งหลายไฟล์ใน 1 message
type BulkMessageRequest struct {
    Messages []*BulkMessageItem `json:"messages"`
}

type BulkMessageItem struct {
    MessageType       string      `json:"message_type"`  // "image", "video", "file"
    MediaURL          string      `json:"media_url"`
    MediaThumbnailURL string      `json:"media_thumbnail_url,omitempty"`
    Caption           string      `json:"caption,omitempty"`  // แค่ item แรก
    Metadata          types.JSONB `json:"metadata,omitempty"`
}

type BulkMessageResponse struct {
    Messages []*MessageDTO `json:"messages"`
    AlbumID  string        `json:"album_id"`
}
```

### 2. เพิ่ม Repository Methods
**File**: `infrastructure/persistence/postgres/message_repository.go`

```go
// BulkCreate สร้างหลาย messages พร้อมกัน
func (r *messageRepository) BulkCreate(messages []*models.Message) error {
    return r.db.CreateInBatches(messages, 100).Error
}

// GetMessagesByAlbumID ดึง messages ที่เป็น album เดียวกัน
func (r *messageRepository) GetMessagesByAlbumID(albumID string) ([]*models.Message, error) {
    var messages []*models.Message
    err := r.db.
        Where("metadata->>'album_id' = ?", albumID).
        Order("(metadata->>'album_position')::int ASC").
        Find(&messages).Error
    return messages, err
}
```

### 3. เพิ่ม Service Method
**File**: `application/serviceimpl/message_service.go`

```go
func (s *messageService) SendBulkMessages(
    conversationID, userID uuid.UUID,
    request *dto.BulkMessageRequest,
) (*dto.BulkMessageResponse, error) {

    // 1. Validate (max 10 items)
    if len(request.Messages) > 10 {
        return nil, errors.New("maximum 10 messages per bulk upload")
    }

    // 2. สร้าง album_id
    albumID := uuid.New().String()

    // 3. สร้าง messages แต่ละข้อความ
    messages := make([]*models.Message, 0, len(request.Messages))
    for i, item := range request.Messages {
        // สร้าง metadata
        metadata := make(types.JSONB)
        metadata["album_id"] = albumID
        metadata["album_position"] = i
        metadata["album_total"] = len(request.Messages)

        // เพิ่ม caption ที่ message แรก
        if i == 0 && item.Caption != "" {
            metadata["album_caption"] = item.Caption
        }

        message := &models.Message{
            ID:                uuid.New(),
            ConversationID:    conversationID,
            SenderID:          &userID,
            MessageType:       item.MessageType,
            MediaURL:          item.MediaURL,
            MediaThumbnailURL: item.MediaThumbnailURL,
            Metadata:          metadata,
            // ...
        }
        messages = append(messages, message)
    }

    // 4. Bulk insert
    if err := s.messageRepo.BulkCreate(messages); err != nil {
        return nil, err
    }

    // 5. Send WebSocket notification (1 ครั้งต่อ album)
    s.notificationService.NotifyNewMessage(conversationID, map[string]interface{}{
        "type":     "album",
        "album_id": albumID,
        "messages": messageDTOs,
    })

    return &dto.BulkMessageResponse{
        Messages: messageDTOs,
        AlbumID:  albumID,
    }, nil
}
```

### 4. เพิ่ม Handler & Route
**File**: `interfaces/api/handler/message_handler.go`

```go
func (h *MessageHandler) SendBulkMessages(c *fiber.Ctx) error {
    userID, _ := middleware.GetUserUUID(c)
    conversationID, _ := utils.ParseUUIDParam(c, "conversationId")

    var request dto.BulkMessageRequest
    if err := c.BodyParser(&request); err != nil {
        return c.Status(400).JSON(fiber.Map{"message": "Invalid request"})
    }

    response, err := h.messageService.SendBulkMessages(conversationID, userID, &request)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"message": err.Error()})
    }

    return c.Status(201).JSON(fiber.Map{
        "success": true,
        "data":    response,
    })
}
```

**File**: `interfaces/api/routes/message_routes.go`

```go
messages.Post("/:conversationId/bulk", messageHandler.SendBulkMessages)
```

---

## 📡 API Specification

### Endpoint
```
POST /api/v1/messages/:conversationId/bulk
Authorization: Bearer <token>
```

### Request Body
```json
{
  "messages": [
    {
      "message_type": "image",
      "media_url": "https://cdn.example.com/photo1.jpg",
      "media_thumbnail_url": "https://cdn.example.com/thumb1.jpg",
      "caption": "Holiday trip 🏖️"
    },
    {
      "message_type": "image",
      "media_url": "https://cdn.example.com/photo2.jpg",
      "media_thumbnail_url": "https://cdn.example.com/thumb2.jpg"
    },
    {
      "message_type": "image",
      "media_url": "https://cdn.example.com/photo3.jpg",
      "media_thumbnail_url": "https://cdn.example.com/thumb3.jpg"
    },
    {
      "message_type": "image",
      "media_url": "https://cdn.example.com/photo4.jpg",
      "media_thumbnail_url": "https://cdn.example.com/thumb4.jpg"
    }
  ]
}
```

### Response (Success)
```json
{
  "success": true,
  "data": {
    "album_id": "550e8400-e29b-41d4-a716-446655440000",
    "messages": [
      {
        "id": "msg-uuid-1",
        "conversation_id": "conv-uuid",
        "message_type": "image",
        "media_url": "https://cdn.example.com/photo1.jpg",
        "metadata": {
          "album_id": "550e8400-e29b-41d4-a716-446655440000",
          "album_position": 0,
          "album_total": 4,
          "album_caption": "Holiday trip 🏖️"
        },
        "created_at": "2025-01-27T10:30:00Z"
      },
      // ... messages 2-4
    ]
  }
}
```

### Response (Error - Too Many)
```json
{
  "success": false,
  "message": "maximum 10 messages per bulk upload"
}
```

---

## 🔒 Validation & Constraints

1. **จำนวนไฟล์**: สูงสุด 10 ไฟล์ต่อ request
2. **Message Type**: รองรับ `image`, `video`, `file`
3. **Media URL**: Required สำหรับทุก item
4. **Caption**: Optional, ใส่ที่ message แรกเท่านั้น
5. **Membership**: ต้องเป็นสมาชิกของ conversation

---

## 📱 Frontend Implementation Plan

เมื่อ Backend พร้อม Frontend จะทำ:

### 1. Multi-File Upload Flow
```typescript
// 1. User เลือกหลายไฟล์
const files = [file1, file2, file3, file4]

// 2. Upload ทุกไฟล์ไปที่ storage (parallel)
const uploadResults = await Promise.all(
  files.map(file => uploadToStorage(file))
)

// 3. เรียก Bulk Message API
await fetch(`/api/v1/messages/${conversationId}/bulk`, {
  method: 'POST',
  body: JSON.stringify({
    messages: uploadResults.map((result, index) => ({
      message_type: 'image',
      media_url: result.url,
      media_thumbnail_url: result.thumbnail_url,
      caption: index === 0 ? captionText : undefined
    }))
  })
})
```

### 2. Display Album Grid
```tsx
// แสดงผลเป็น Grid (2x2, 1+2, etc.)
<div className="album-grid">
  {albumMessages.map(msg => (
    <img src={msg.media_url} key={msg.id} />
  ))}
  {caption && <p className="caption">{caption}</p>}
</div>
```

---

## ⏱️ ประมาณการเวลา

ตามเอกสาร `bulk_upload_analysis.md`:

- **Backend Implementation**: 4-6 ชั่วโมง
  - Repository & Service: 2-3 ชั่วโมง
  - Handler & Routes: 1 ชั่วโมง
  - Testing: 1-2 ชั่วโมง

- **Frontend Implementation**: 6-9 ชั่วโมง
  - Multi-file Upload UI: 2-3 ชั่วโมง
  - Album Grid Display: 2-3 ชั่วโมง
  - Lightbox & Interactions: 2-3 ชั่วโมง

**รวม**: ประมาณ 1-1.5 วัน

---

## 📋 Checklist สำหรับ Backend

- [ ] เพิ่ม `BulkMessageRequest` และ `BulkMessageResponse` ใน DTO
- [ ] เพิ่ม `BulkCreate()` method ใน MessageRepository
- [ ] เพิ่ม `GetMessagesByAlbumID()` method ใน MessageRepository
- [ ] Implement `SendBulkMessages()` ใน MessageService
- [ ] เพิ่ม `SendBulkMessages` handler
- [ ] ลงทะเบียน route `POST /:conversationId/bulk`
- [ ] ทดสอบ API ด้วย Postman/Thunder Client
- [ ] เพิ่ม GIN Index สำหรับ `metadata->>'album_id'` (Optional, สำหรับ performance)
- [ ] Update WebSocket notification เพื่อรองรับ album type

---

## 🔗 Reference

- เอกสารแผนเต็ม: `refector_plan/bulk_upload_analysis.md` (มีรายละเอียดครบทุกอย่าง)
- Telegram Album Feature: https://telegram.org/blog/albums-saved-messages
- Current File Upload API: `interfaces/api/handler/file_handler.go`

---

## 💬 คำถาม/ข้อสงสัย

หากมีคำถามหรือต้องการหารือเพิ่มเติม กรุณาติดต่อ Frontend Team

**ติดต่อ**: [Your Contact]
**Priority**: High (ฟีเจอร์สำคัญสำหรับ UX)

---

## 🎯 Expected Outcome

เมื่อเสร็จสิ้น users จะสามารถ:
1. ✅ เลือกหลายรูป/ไฟล์พร้อมกัน (drag & drop)
2. ✅ ส่งใน 1 message
3. ✅ เห็นแสดงผลเป็น Grid สวยงามเหมือน Telegram
4. ✅ มี caption ใต้ album
5. ✅ คลิกดูรูปแบบเต็มได้ (lightbox)

---

**สร้างโดย**: Claude Code Assistant
**วันที่**: 2025-01-27
