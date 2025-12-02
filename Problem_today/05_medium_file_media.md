# 05 - MEDIUM PRIORITY: ปัญหาไฟล์และมีเดีย

**ลำดับความสำคัญ: 🟡 MEDIUM PRIORITY**
**ระดับความยาก: ⭐⭐⭐ ปานกลาง-ยาก**

---

## 📋 รายการปัญหา

### #1: ลากไฟล์จากคอมพิวเตอร์มาโยนลงเลยไม่ได้
**ปัญหา:**
- ไม่รองรับ Drag & Drop ไฟล์
- ต้องกด Browse/Select File ทุกครั้ง

**วิธีแก้:**
1. **Implement Drag & Drop:**
   ```typescript
   const handleDrop = (e: React.DragEvent) => {
     e.preventDefault();
     const files = Array.from(e.dataTransfer.files);
     handleFileUpload(files);
   };

   const handleDragOver = (e: React.DragEvent) => {
     e.preventDefault();
     setIsDragging(true);
   };

   return (
     <div
       onDrop={handleDrop}
       onDragOver={handleDragOver}
       onDragLeave={() => setIsDragging(false)}
       className={isDragging ? 'drag-active' : ''}
     >
       {/* Chat content */}
     </div>
   );
   ```

2. **Visual Feedback:**
   - แสดง overlay เมื่อลากไฟล์เข้ามา
   - แสดงไอคอนอัพโหลด
   - แสดง "Drop files here"

3. **File Validation:**
   - ตรวจสอบ file type
   - ตรวจสอบ file size
   - แสดง error ถ้าไม่ผ่าน

**Backend ต้องทำ:** ❌ ไม่ต้อง (ถ้า API upload มีอยู่แล้ว)

---

### #2: Ctrl+C, V พวกภาพไม่ได้
**ปัญหา:**
- ไม่สามารถ Copy-Paste รูปภาพจาก clipboard ได้
- ต้อง save file ก่อนแล้วค่อย upload

**วิธีแก้:**
1. **Clipboard API:**
   ```typescript
   const handlePaste = async (e: React.ClipboardEvent) => {
     const items = e.clipboardData.items;

     for (const item of items) {
       if (item.type.startsWith('image/')) {
         const file = item.getAsFile();
         if (file) {
           await handleFileUpload([file]);
         }
       }
     }
   };

   // Add to textarea/input
   <textarea onPaste={handlePaste} />
   ```

2. **Screenshot Support:**
   - รองรับการ paste screenshot
   - Auto generate filename (e.g., "Screenshot-2024-01-01.png")

3. **Multiple Files:**
   - รองรับ paste หลายไฟล์พร้อมกัน

**Backend ต้องทำ:** ❌ ไม่ต้อง (ใช้ API upload เดิม)

---

### #10: ส่ง VDO ไม่ได้
**ปัญหา:**
- ไม่สามารถอัพโหลดไฟล์วิดีโอได้

**สาเหตุที่เป็นไปได้:**
1. Frontend ไม่ accept video file types
2. Backend ไม่รองรับ video upload
3. File size limit เล็กเกินไป
4. Video processing ไม่มี

**วิธีแก้:**

### Frontend:
1. **Accept Video Types:**
   ```typescript
   <input
     type="file"
     accept="video/mp4,video/webm,video/ogg,video/quicktime"
   />
   ```

2. **Video Preview:**
   ```typescript
   {file.type.startsWith('video/') && (
     <video src={URL.createObjectURL(file)} controls />
   )}
   ```

3. **File Size Validation:**
   ```typescript
   const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
   if (file.size > MAX_VIDEO_SIZE) {
     showError('Video too large. Max 100MB');
   }
   ```

4. **Upload Progress:**
   - แสดง progress bar
   - แสดงเปอร์เซ็นต์
   - ยกเลิกได้ระหว่างอัพโหลด

### Backend:
**Backend ต้องทำ:**
✅ **ต้องทำ:**
1. **Video Upload Support:**
   - Accept video MIME types
   - Increase file size limit
   ```typescript
   const ALLOWED_VIDEO_TYPES = [
     'video/mp4',
     'video/webm',
     'video/ogg',
     'video/quicktime',
     'video/x-msvideo'
   ];
   ```

2. **Video Processing (Optional แต่แนะนำ):**
   - Generate thumbnail
   - Get video duration, resolution
   - Compress ถ้าไฟล์ใหญ่เกินไป

3. **CDN/Storage:**
   - ใช้ S3, Cloudinary, หรือ similar
   - Generate streaming URL
   - Optimize delivery

4. **Response Format:**
   ```json
   {
     "id": "msg_123",
     "type": "video",
     "video": {
       "url": "https://cdn.example.com/video.mp4",
       "thumbnail": "https://cdn.example.com/thumb.jpg",
       "duration": 120,
       "size": 52428800,
       "mimeType": "video/mp4"
     }
   }
   ```

---

### #11: งงตรง ส่งไฟล์ กับส่งรูปกล้อง

**ปัญหา:**
- UI สับสน ไม่เข้าใจความแตกต่างระหว่าง:
  - "ส่งไฟล์" (File upload)
  - "ส่งรูปกล้อง" (Camera/Gallery)

**วิธีแก้:**

### UX Improvement:
1. **ใช้ไอคอนที่ชัดเจน:**
   ```
   📎 ไฟล์     - Upload any file (documents, zip, etc.)
   🖼️ รูปภาพ   - Upload images from gallery
   📹 วิดีโอ   - Upload videos
   📷 ถ่ายรูป   - Open camera (mobile)
   ```

2. **Group Related Actions:**
   ```
   ┌─────────────────┐
   │  [📎] ไฟล์       │
   │  [🖼️] รูปภาพ    │
   │  [📹] วิดีโอ    │
   │  [📷] ถ่ายรูป    │ (Mobile only)
   └─────────────────┘
   ```

3. **หรือใช้ Single Button แบบ Smart:**
   ```typescript
   // คลิก 1 ปุ่ม "แนบ" → แสดง menu:
   // - ไฟล์เอกสาร (PDF, DOC, etc.)
   // - รูปภาพ
   // - วิดีโอ
   // - ถ่ายรูป (mobile)
   ```

4. **Accept Attributes:**
   ```typescript
   // ไฟล์ทั่วไป - ทุกประเภท
   <input type="file" accept="*/*" />

   // รูปภาพ - เฉพาะ image
   <input type="file" accept="image/*" />

   // วิดีโอ - เฉพาะ video
   <input type="file" accept="video/*" />

   // กล้อง - เปิดกล้องโดยตรง (mobile)
   <input type="file" accept="image/*" capture="environment" />
   ```

**Backend ต้องทำ:** ❌ ไม่ต้อง (UX fix เท่านั้น)

---

## 🎯 แผนการแก้ไข (เรียงตามลำดับ)

### Phase 1: UX Design (30 นาที)
1. วาด UI ใหม่สำหรับ file upload area
2. ออกแบบ icon set
3. กำหนด file type categories

### Phase 2: Frontend - Basic Upload Features (2-3 ชม.)
1. **#11 - ปรับ UI ให้เข้าใจง่าย**
   - Icon overhaul
   - Group buttons
   - Clear labels

2. **#1 - Drag & Drop**
   - Implement drop zone
   - Visual feedback
   - File validation

3. **#2 - Clipboard Paste**
   - Paste event handler
   - Image from clipboard
   - Screenshot support

### Phase 3: Backend - Video Support (ทีม Backend)
1. **#10 - Video Upload**
   - Accept video types
   - Increase size limit
   - Video processing
   - CDN setup

### Phase 4: Frontend - Video Integration (1-2 ชม.)
1. Video file upload
2. Video preview
3. Upload progress
4. Video player in chat

### Phase 5: Testing
1. Test drag & drop (multiple files)
2. Test paste images
3. Test video upload (various formats)
4. Test file size limits
5. Test error handling

---

## 📦 ไฟล์ที่ต้องแก้

**Frontend:**
- `src/components/Chat/FileUploadButton.tsx`
- `src/components/Chat/MessageInput.tsx` - Drag & Drop zone
- `src/components/Chat/MediaUpload.tsx`
- `src/components/Chat/MessageItem.tsx` - Video display
- `src/utils/fileValidation.ts`
- `src/hooks/useFileUpload.ts`

**Backend (สำหรับ Video):**
- File upload handler
- Video processing
- CDN integration
- Database schema (video metadata)

---

## 🎨 UI/UX Design Suggestion

### Upload Button Menu:
```
┌──────────────────────────────────┐
│  Message Input Area              │
│  ┌────────────────────────────┐  │
│  │ Type a message...          │  │
│  └────────────────────────────┘  │
│                                  │
│  [+] Click to attach:            │
│    📎 Document (PDF, DOC, ...)   │
│    🖼️ Image (JPG, PNG, ...)     │
│    📹 Video (MP4, ...)           │
│    📷 Take Photo (mobile)        │
│                                  │
│  Or drag & drop files here       │
└──────────────────────────────────┘
```

### Drag & Drop Overlay:
```
┌──────────────────────────────────┐
│                                  │
│         📤                       │
│    Drop files here to send       │
│                                  │
│   Supports: Images, Videos,      │
│   Documents (Max 100MB)          │
│                                  │
└──────────────────────────────────┘
```

---

## ⚠️ File Validation Rules

```typescript
const FILE_RULES = {
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  video: {
    maxSize: 100 * 1024 * 1024, // 100MB
    types: ['video/mp4', 'video/webm', 'video/quicktime']
  },
  document: {
    maxSize: 20 * 1024 * 1024, // 20MB
    types: ['application/pdf', 'application/msword', ...]
  }
};
```

---

## ✅ เงื่อนไขการ Test

**#1 - Drag & Drop:**
- [x] ลากรูปภาพเดี่ยว → อัพโหลดสำเร็จ
- [x] ลากหลายไฟล์ → อัพโหลดทั้งหมด
- [x] ลากไฟล์ใหญ่เกินไป → แสดง error
- [x] ลากไฟล์ประเภทไม่รองรับ → แสดง error
- [x] Visual feedback ชัดเจน

**#2 - Copy Paste:**
- [x] Copy รูปจาก browser → Paste → ส่งได้
- [x] Screenshot (Win+Shift+S) → Paste → ส่งได้
- [x] Paste ข้อความปกติ → ไม่เกิด error
- [x] drag รูปจาก browser มาใส่ในแชทได้

**#10 - Video:**
- [x] Upload video MP4 → เล่นได้
- [x] Upload video ใหญ่ → แสดง progress
- [x] Upload video เกิน limit → แสดง error
- [x] Video thumbnail แสดงก่อนเล่น
- [ ] Cancel upload ระหว่างทาง

**#11 - UX:**
- [x] UI ชัดเจน เข้าใจง่าย
- [x] ไอคอนตรงกับ function
- [ ] กด "รูปภาพ" → เปิด image picker
- [ ] กด "ถ่ายรูป" (mobile) → เปิดกล้อง
