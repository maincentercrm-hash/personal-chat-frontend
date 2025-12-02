# 🚀 Frontend Album Migration Guide

## ✅ งานที่เสร็จแล้ว

Frontend พร้อมรองรับ Backend API ใหม่แล้วครับ!

### 📋 การเปลี่ยนแปลงที่ทำไปแล้ว:

#### 1. **อัพเดท TypeScript Types** (src/types/message.types.ts)
```typescript
// ✅ เพิ่ม AlbumFileDTO type
export interface AlbumFileDTO {
  id: string;
  file_type: 'image' | 'video';
  media_url: string;
  media_thumbnail_url?: string;
  width?: number;
  height?: number;
  duration?: number; // for video (seconds)
  position: number;
}

// ✅ อัพเดท MessageDTO
export interface MessageDTO {
  // ... existing fields
  message_type: string; // text, image, file, sticker, album
  album_files?: AlbumFileDTO[]; // ✅ NEW

  metadata?: {
    // ... existing metadata
    album_id?: string;      // ⚠️ OLD - will be deprecated
    album_position?: number; // ⚠️ OLD - will be deprecated
    album_total?: number;    // ⚠️ OLD - will be deprecated
  }
}
```

#### 2. **สร้าง AlbumMessageV2 Component** (src/components/shared/message/AlbumMessageV2.tsx)
- ✅ Component ใหม่ที่ทำงานกับ `album_files` array
- ✅ ง่ายกว่าแบบเดิมมาก (ไม่ต้อง group messages)
- ✅ รองรับทั้ง image และ video
- ✅ แสดง duration สำหรับวิดีโอ

#### 3. **อัพเดท MessageItem.tsx**
```typescript
// ✅ NEW FORMAT (takes precedence)
if (message.message_type === 'album' && message.album_files) {
  return <AlbumMessageV2 message={message} ... />
}

// ⚠️ OLD FORMAT (backward compatibility)
if (albumId !== undefined && albumPosition !== undefined) {
  // ... existing album grouping logic
}
```

#### 4. **อัพเดท Height Estimation** (src/hooks/useMessageHeightCache.ts)
```typescript
const estimateMessageHeight = (message: MessageDTO): number => {
  // ✅ NEW FORMAT
  if (message.message_type === 'album' && message.album_files) {
    const fileCount = message.album_files.length;
    return estimateAlbumHeight(fileCount);
  }

  // ⚠️ OLD FORMAT
  if (albumId !== undefined && albumPosition !== undefined) {
    // ... existing logic
  }
}
```

#### 5. **อัพเดท VirtualMessageList.tsx**
```typescript
itemSize={(el) => {
  // ✅ NEW FORMAT: Album always renders (never 0 height)
  if (message.message_type === 'album' && message.album_files) {
    return cachedHeight || estimateMessageHeight(message);
  }

  // ⚠️ OLD FORMAT: position > 0 returns 0
  if (albumPosition > 0) {
    return 0;
  }
}}
```

---

## 🎯 ผลลัพธ์

### **แบบเดิม (OLD FORMAT):**
```
Backend ส่ง: 12 messages (4 รูป = 4 messages แยกกัน)
Frontend แสดง: 8 items (group กลับมาเป็นอัลบั้ม)
Virtuoso: 12 items (4 items มี height=0)
❌ มี "Zero-sized element" warning
❌ Pagination ไม่แม่นยำ
❌ WebSocket update ซับซ้อน
```

### **แบบใหม่ (NEW FORMAT):**
```
Backend ส่ง: 8 messages (4 รูป = 1 album message)
Frontend แสดง: 8 items
Virtuoso: 8 items
✅ ไม่มี "Zero-sized element" warning
✅ Pagination แม่นยำ
✅ WebSocket update ง่าย
✅ Code สะอาดกว่า
```

---

## 📊 API Format Comparison

### **OLD FORMAT (ปัจจุบัน):**
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
    ... (2 messages อีก)
  ]
}
```

### **NEW FORMAT (ที่ Backend กำลังทำ):**
```json
{
  "messages": [
    {
      "id": "album-123",
      "message_type": "album",
      "content": "Caption ของอัลบั้ม",
      "album_files": [
        {
          "id": "file-1",
          "file_type": "image",
          "media_url": "https://...",
          "media_thumbnail_url": "https://...",
          "width": 1920,
          "height": 1080,
          "position": 0
        },
        {
          "id": "file-2",
          "file_type": "video",
          "media_url": "https://...",
          "media_thumbnail_url": "https://...",
          "duration": 15,
          "position": 1
        },
        ... (2 files อีก)
      ],
      "metadata": {
        "album_total": 4
      }
    }
  ]
}
```

---

## 🧪 วิธีทดสอบ

### **1. ทดสอบกับ Backend API เดิม (OLD FORMAT)**
```bash
# ปัจจุบัน Frontend ยังทำงานกับแบบเดิมได้ปกติ
npm run dev
```
- ✅ อัลบั้มแสดงได้ปกติ (ใช้ AlbumMessage เดิม)
- ✅ ไม่มีการเปลี่ยนแปลงพฤติกรรม

### **2. ทดสอบกับ Backend API ใหม่ (NEW FORMAT)**
เมื่อ Backend deploy แล้ว:

1. **เช็ค Console Logs:**
```javascript
// ถ้าเห็น log นี้ = ใช้แบบใหม่
📸 [Album NEW] Rendering album with album_files: {
  messageId: "album-12",
  fileCount: 4
}

// ถ้าเห็น log นี้ = ใช้แบบเดิม
📸 [Album OLD] Rendering album at position 0: {
  albumId: "album-12",
  messageCount: 4
}
```

2. **เช็ค DOM Structure:**
```html
<!-- NEW FORMAT: 8 items ตรงๆ -->
<div data-item-index="100000">Text</div>
<div data-item-index="100001">Album (4 files)</div>
<div data-item-index="100002">Text</div>

<!-- OLD FORMAT: 12 items (4 ซ่อน) -->
<div data-item-index="100000">Text</div>
<div data-item-index="100001">Album</div>
<div data-item-index="100002" style="height: 0">Hidden</div>
<div data-item-index="100003" style="height: 0">Hidden</div>
```

3. **เช็ค "Zero-sized element" Warning:**
```javascript
// ✅ ต้องไม่มี warning นี้ใน Console
// react-virtuoso: Zero-sized element, this should not happen
```

---

## 🔄 Migration Timeline

### **Phase 1: Frontend Ready ✅ (เสร็จแล้ว)**
- ✅ รองรับทั้งแบบเดิมและแบบใหม่
- ✅ สามารถทำงานกับ Backend เดิมได้
- ✅ พร้อมรับ Backend ใหม่ได้ทันที

### **Phase 2: Backend Deploy (รอ Backend)**
- Backend ส่ง `message_type: "album"` แทน 4 messages
- Backend ส่ง `album_files` array
- Frontend จะ auto-detect และใช้ AlbumMessageV2

### **Phase 3: Data Migration (รอ Backend)**
- Backend migrate ข้อมูลเก่า
- Messages เก่าที่เป็น album จะถูก consolidate

### **Phase 4: Cleanup (ภายหลัง)**
- ลบ AlbumMessage เดิมออก
- ลบ useAlbumRenderer hook
- ลบ groupMessagesByAlbum logic
- ลบ metadata.album_id, album_position

---

## 🎨 ความแตกต่างใน UI

### **Component Structure:**

**OLD:**
```
MessageItem
  └─ renderAlbum() // from useAlbumRenderer
       └─ AlbumMessage (gets array of messages)
            └─ grouping logic + render
```

**NEW:**
```
MessageItem
  └─ AlbumMessageV2 (gets single message with album_files)
       └─ render directly from album_files
```

### **Grid Layouts:** (ยังคงเหมือนเดิม)
- 1-2 files: 1 row (200px)
- 3-6 files: 2 rows (400px)
- 7-10 files: 3 rows (600px)

---

## ⚡ Performance Benefits

### **OLD FORMAT:**
- 12 messages in memory
- 4 messages with height=0
- Grouping logic runs on every render
- Virtuoso manages 12 items

### **NEW FORMAT:**
- 8 messages in memory ✅ (-33%)
- 0 messages with height=0 ✅
- No grouping logic needed ✅
- Virtuoso manages 8 items ✅ (-33%)

**Result:**
- 🚀 Faster rendering
- 🎯 More accurate scrolling
- ✅ No "Zero-sized" warnings
- 😊 Cleaner code

---

## 🔍 Debugging Tips

### **1. ตรวจสอบว่า Frontend ใช้ format ไหน:**
```javascript
// เปิด Console และส่งอัลบั้ม
// ดู log ว่าขึ้น "Album NEW" หรือ "Album OLD"
```

### **2. ตรวจสอบ API Response:**
```javascript
// ใน Network tab, ดู response ของ GET /messages
// ตรวจสอบว่ามี album_files หรือไม่
```

### **3. ตรวจสอบ Height Estimation:**
```javascript
// ดู log [HeightCache]
[HeightCache] Album NEW album-12: 4 files → estimated 500px
```

---

## 📝 Notes สำหรับ Developer

### **Backward Compatibility:**
- ✅ Frontend รองรับทั้ง 2 format พร้อมกัน
- ✅ ใช้ `message_type === 'album'` check ก่อน metadata check
- ✅ ไม่ต้อง feature flag

### **Testing Checklist:**
- [ ] อัลบั้ม 1-10 รูปแสดงผลถูกต้อง
- [ ] Caption แสดงถูกต้อง
- [ ] Video duration แสดงถูกต้อง
- [ ] Click รูปเปิด Lightbox ได้
- [ ] Scroll ไม่กระตุก
- [ ] ไม่มี "Zero-sized" warning

### **Migration Checklist:**
- [x] Update MessageDTO types
- [x] Create AlbumMessageV2 component
- [x] Update MessageItem rendering
- [x] Update height estimation
- [x] Update VirtualMessageList itemSize
- [ ] Test with new Backend API
- [ ] Remove old album logic (after Backend fully migrated)

---

## 🎉 สรุป

Frontend พร้อมแล้วครับ! เมื่อ Backend deploy API ใหม่ Frontend จะทำงานกับ format ใหม่ได้ทันทีโดยไม่ต้องแก้อะไรเพิ่ม

**Key Changes:**
1. ✅ รองรับ `message_type: "album"` กับ `album_files` array
2. ✅ สร้าง AlbumMessageV2 component ใหม่
3. ✅ Height estimation รองรับทั้งแบบเดิมและแบบใหม่
4. ✅ Backward compatible กับ API เดิม

**Next Steps:**
1. รอ Backend deploy API ใหม่
2. ทดสอบกับ Backend ใหม่
3. ลบ code เก่าออกหลังจาก migration เสร็จสิ้น

---

**ถ้ามีคำถามหรือพบปัญหา ให้ตรวจสอบ Console logs และ DOM structure ตามที่แนะนำด้านบนครับ!** 🚀
