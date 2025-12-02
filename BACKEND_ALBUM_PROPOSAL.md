# 📋 ข้อเสนอการปรับปรุง Album API

## 🔴 ปัญหาปัจจุบัน

### สิ่งที่เกิดขึ้นตอนนี้:

**Frontend ส่งอัลบั้ม 4 รูป:**
```
POST /api/messages/album
{
  "files": [file1, file2, file3, file4]
}
```

**Backend ส่งกลับ 4 messages แยกกัน:**
```json
{
  "messages": [
    {
      "id": "msg-1",
      "message_type": "image",
      "media_url": "...",
      "metadata": {
        "album_id": "album-123",
        "album_position": 0,
        "album_total": 4
      }
    },
    {
      "id": "msg-2",
      "message_type": "image",
      "media_url": "...",
      "metadata": {
        "album_id": "album-123",
        "album_position": 1,
        "album_total": 4
      }
    },
    ... (2 messages เพิ่ม)
  ]
}
```

### ผลกระทบ:

1. **Frontend ได้ 12 messages แต่แสดงแค่ 8 items**
   - ทำให้เกิด mismatch ระหว่าง data กับ UI

2. **Virtuoso (Virtual List) ต้องจัดการ 12 items**
   - แต่ 4 items มี height = 0px (ซ่อน)
   - ทำให้เกิด "Zero-sized element" warning

3. **Frontend ต้อง group messages กลับมาเป็นอัลบั้ม**
   - เพิ่ม complexity
   - เพิ่ม overhead ในการ render

4. **Pagination/Load more ไม่แม่นยำ**
   - ขอ 20 messages → ได้ 16 visual items (ถ้ามีอัลบั้ม)

5. **WebSocket realtime update ซับซ้อน**
   - เมื่อมี message ใหม่ ต้องตรวจสอบว่าเป็น album หรือไม่
   - ต้อง group อัลบั้มทุกครั้งที่ message เปลี่ยนแปลง

---

## ✅ วิธีแก้ไข: Backend ส่ง 1 message สำหรับอัลบั้ม

### **แนวทางที่แนะนำ:**

**Backend ส่งข้อมูลแบบนี้:**
```json
{
  "id": "album-123",
  "conversation_id": "conv-456",
  "sender_id": "user-789",
  "message_type": "album",  // ← ใช้ type ใหม่
  "content": "Caption ของอัลบั้ม (ถ้ามี)",
  "album_files": [  // ← array ของไฟล์ทั้งหมด
    {
      "id": "file-1",
      "file_type": "image",  // image, video
      "media_url": "https://...",
      "media_thumbnail_url": "https://...",
      "width": 1920,  // optional
      "height": 1080,  // optional
      "position": 0
    },
    {
      "id": "file-2",
      "file_type": "image",
      "media_url": "https://...",
      "media_thumbnail_url": "https://...",
      "position": 1
    },
    {
      "id": "file-3",
      "file_type": "video",
      "media_url": "https://...",
      "media_thumbnail_url": "https://...",
      "duration": 15,  // seconds
      "position": 2
    },
    {
      "id": "file-4",
      "file_type": "image",
      "media_url": "https://...",
      "media_thumbnail_url": "https://...",
      "position": 3
    }
  ],
  "metadata": {
    "album_total": 4
  },
  "created_at": "2025-11-28T03:37:50.529031+07:00",
  "updated_at": "2025-11-28T03:37:50.529031+07:00",
  "status": "sent"
}
```

---

## 🎯 ผลลัพธ์หลังแก้ไข

### **ก่อนแก้:**
```
Backend ส่ง: 12 messages (4 อันเป็นอัลบั้ม 4 รูป)
Frontend แสดง: 8 items
Virtuoso render: 12 items (4 items มี height=0)
❌ Mismatch!
```

### **หลังแก้:**
```
Backend ส่ง: 8 messages (1 อันเป็นอัลบั้ม 4 รูป)
Frontend แสดง: 8 items
Virtuoso render: 8 items
✅ Perfect Match!
```

---

## 📊 เปรียบเทียบ

| หัวข้อ | แบบเดิม (4 messages) | แบบใหม่ (1 message) |
|--------|---------------------|-------------------|
| Message count | 12 | 8 |
| Visual items | 8 | 8 |
| Virtuoso items | 12 (4 ซ่อน) | 8 |
| Frontend grouping | ต้อง | ไม่ต้อง |
| Zero-sized warning | มี | ไม่มี |
| Pagination accuracy | ไม่แม่นยำ | แม่นยำ |
| WebSocket complexity | สูง | ต่ำ |
| Performance | ปานกลาง | ดี |

---

## 🔧 การเปลี่ยนแปลงที่ต้องทำ

### **1. Database Schema** (ถ้าจำเป็น)

**Option A: เพิ่ม table album_files**
```sql
CREATE TABLE album_files (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES messages(id),
  file_type VARCHAR(20),  -- 'image', 'video'
  media_url TEXT,
  media_thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER,  -- for video
  position INTEGER,
  created_at TIMESTAMP
);
```

**Option B: ใช้ JSONB column**
```sql
ALTER TABLE messages
ADD COLUMN album_files JSONB;  -- เก็บ array ของไฟล์
```

### **2. API Response Format**

**GET /api/conversations/:id/messages**
```json
{
  "data": {
    "messages": [
      {
        "id": "text-1",
        "message_type": "text",
        "content": "Hello"
      },
      {
        "id": "album-1",
        "message_type": "album",  // ← type ใหม่
        "album_files": [...]  // ← array ของไฟล์
      },
      {
        "id": "text-2",
        "message_type": "text",
        "content": "World"
      }
    ]
  }
}
```

### **3. WebSocket Event**

**เมื่อมี message ใหม่:**
```json
{
  "event": "message:new",
  "data": {
    "id": "album-1",
    "message_type": "album",
    "album_files": [...]
  }
}
```

---

## 🚀 ขั้นตอนการ Migrate

### **Phase 1: เพิ่ม Support แบบใหม่**
1. เพิ่ม `message_type: "album"`
2. เพิ่ม `album_files` field
3. API รองรับทั้งแบบเดิมและแบบใหม่

### **Phase 2: Migrate ข้อมูลเก่า**
```sql
-- Group existing album messages
INSERT INTO album_files (message_id, media_url, position, ...)
SELECT
  first_message.id,
  m.media_url,
  m.metadata->>'album_position'
FROM messages m
WHERE m.metadata->>'album_position' = '0'
GROUP BY m.metadata->>'album_id';
```

### **Phase 3: Frontend ปรับรับแบบใหม่**
1. ตรวจสอบ `message_type === 'album'`
2. Render จาก `album_files` array
3. ลบ grouping logic เก่าออก

### **Phase 4: ลบแบบเดิม**
1. ลบ `album_id`, `album_position` จาก metadata
2. ลบ grouping logic จาก Backend

---

## 💡 ทางเลือกอื่น (ถ้าไม่สามารถแก้ Backend ได้)

### **Frontend Filter ข้อมูลก่อน Render**

```typescript
// ใน VirtualMessageList.tsx
const filteredMessages = useMemo(() => {
  return messages.filter(msg => {
    // เอาเฉพาะ position 0 หรือไม่ใช่อัลบั้ม
    const position = msg.metadata?.album_position;
    return position === undefined || position === 0;
  });
}, [messages]);

// Render เฉพาะ filteredMessages
<Virtuoso data={filteredMessages} ... />
```

**ข้อดี:**
- ✅ Virtuoso render เฉพาะ 8 items
- ✅ ไม่มี Zero-sized warning

**ข้อเสีย:**
- ⚠️ Pagination ไม่แม่นยำ (ขอ 20 messages แต่ filter เหลือ 16)
- ⚠️ ต้องจัดการ grouping เอง

---

## 📌 สรุปและคำแนะนำ

### **แนวทางที่ดีที่สุด:**
✅ **แก้ Backend** ให้ส่ง 1 message สำหรับอัลบั้ม

**เหตุผล:**
1. ลด complexity ฝั่ง Frontend
2. ลด overhead ในการ render
3. Pagination แม่นยำ
4. WebSocket realtime update ง่ายขึ้น
5. ไม่มี "Zero-sized element" warning
6. Message count ตรงกับ UI

### **ถ้าไม่สามารถแก้ Backend ได้:**
⚠️ **Filter ฝั่ง Frontend** (แต่มี trade-offs)

---

## 🤝 ขอความร่วมมือ

**จาก Backend Team:**
1. พิจารณาแก้ไข API response format
2. เพิ่ม `message_type: "album"` และ `album_files` array
3. Migrate ข้อมูลเก่า

**จาก Frontend Team:**
1. ปรับ message rendering รองรับแบบใหม่
2. ลบ grouping logic เก่าออก

---

**ผลประโยชน์:**
- 🚀 Performance ดีขึ้น
- 🎯 Code ง่ายขึ้น
- ✅ Bug น้อยลง
- 😊 UX ดีขึ้น
