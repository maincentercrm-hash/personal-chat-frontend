# Backend Video Upload - Status Report (Updated)

**วันที่ตรวจสอบ:** 2025-11-27
**ผู้ตรวจสอบ:** Backend Team
**สถานะ:** ✅ **รองรับ Video Upload แล้ว**
**Storage:** 🔷 **Cloudflare R2** (Adapter Pattern - เปลี่ยนได้ง่าย)

---

## 🏗️ **Architecture: Storage Adapter Pattern**

Backend ใช้ **Adapter Pattern** ทำให้สามารถเปลี่ยน storage provider ได้โดยไม่ต้องแก้ business logic

**ตำแหน่งไฟล์:**
- Interface: `domain/service/storage_service.go`
- R2 Implementation: `infrastructure/storage/r2/r2_storage.go`
- Cloudinary Implementation: `infrastructure/storage/cloudinary/cloudinary_storage.go` (backup)
- Config: `pkg/configs/storage_config.go`

**การเลือก Storage:**
```env
# ใน .env
STORAGE_TYPE=r2          # ปัจจุบันใช้ R2
# STORAGE_TYPE=cloudinary  # สามารถเปลี่ยนเป็น Cloudinary ได้
# STORAGE_TYPE=local       # หรือ local (future)
```

**Supported Providers:**
- ✅ **Cloudflare R2** (ใช้อยู่ปัจจุบัน)
- ✅ Cloudinary (พร้อมใช้งาน)
- ⏭️ AWS S3 (future)
- ⏭️ Local Storage (future)

---

## ✅ สิ่งที่ Backend มีพร้อมแล้ว

### 1️⃣ **Upload API**

**Endpoints ที่ใช้ได้:**
```
POST /api/v1/files/file        (Recommended - รองรับทุกประเภทไฟล์)
POST /api/v1/files/image       (สำหรับรูปภาพเท่านั้น)
POST /api/v1/upload/file       (Legacy - backward compatibility)
```

**Request Format:**
```typescript
// FormData
const formData = new FormData();
formData.append('file', videoFile);
formData.append('folder', 'videos'); // optional, default: 'files'

fetch('/api/v1/files/file', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>'
  },
  body: formData
});
```

**Response Format:**
```json
{
  "success": true,
  "message": "อัปโหลดไฟล์สำเร็จ",
  "data": {
    "url": "https://pub-xxx.r2.dev/videos/video_abc123.mp4",
    "path": "videos/video_abc123.mp4",
    "public_id": "videos/video_abc123.mp4",
    "resource_type": "auto",
    "format": "mp4",
    "size": 52428800,
    "metadata": {}
  }
}
```

**หมายเหตุ:** R2 ไม่มี `width`, `height` ใน response (ไม่เหมือน Cloudinary)

**ไฟล์ที่เกี่ยวข้อง:**
- Handler: `interfaces/api/handler/file_handler.go:72-101`
- Routes: `interfaces/api/routes/file_routes.go:18`
- Storage: `infrastructure/storage/r2/r2_storage.go`

---

### 2️⃣ **CDN & Storage**

**ใช้:** 🔷 **Cloudflare R2** (S3-compatible Object Storage)
**Public URL:** `https://pub-a058b390b77f486aaf97a1d1f073c6c8.r2.dev`

**คุณสมบัติ:**
- ✅ S3-compatible API
- ✅ รองรับไฟล์ทุกประเภท (MP4, WebM, MOV, AVI, MKV, etc.)
- ✅ Unlimited egress (ไม่มีค่า bandwidth)
- ✅ CORS configured
- ✅ Presigned URLs สำหรับ direct upload

**R2 Features:**
- Fast global delivery
- No egress fees
- S3-compatible
- Object lifecycle rules

**⚠️ สิ่งที่ R2 ไม่มี (ต่างจาก Cloudinary):**
- ❌ Auto image/video transformation
- ❌ Auto thumbnail generation
- ❌ Auto metadata extraction
- ❌ Video transcoding
- ❌ Adaptive streaming
- ❌ AI features (auto-tagging, etc.)

> **Note:** R2 เป็น object storage ธรรมดา ไม่มี media processing features
> ต้อง process ฝั่ง Frontend หรือเพิ่ม processing service แยก

---

### 3️⃣ **File Size Limit**

**ปัจจุบัน:** `100 MB` ✅
**ที่ตั้ง:** `interfaces/api/handler/file_handler.go:20`

```go
const MaxFileSize = 100 * 1024 * 1024  // 100MB
```

**R2 Limits:**
- Max file size: 5 TB (แต่ API limit ที่ 100MB)
- Max upload timeout: 30 seconds
- Recommended: ไม่เกิน 50MB สำหรับ direct upload

**Error Response (เกินขนาด):**
```json
{
  "success": false,
  "message": "File size exceeds maximum allowed size of 100 MB"
}
```

---

### 4️⃣ **Rate Limiting**

**Limit:** 100 uploads/hour per user ✅
**ที่ตั้ง:** `interfaces/api/handler/file_handler.go:24`

**Error Response:**
```json
{
  "success": false,
  "message": "Upload limit exceeded. Maximum 100 uploads per hour"
}
```

---

### 5️⃣ **Database Schema**

**Table:** `file_uploads`
**Model:** `domain/models/file_upload.go`

```sql
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  path TEXT NOT NULL,
  url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

**Status Values:**
- `pending` - เตรียมอัปโหลด
- `uploading` - กำลังอัปโหลด
- `completed` - สำเร็จ
- `failed` - ล้มเหลว
- `blocked` - ถูกบล็อก (มีไวรัส)

---

### 6️⃣ **Presigned URLs (Direct Upload)**

✅ **R2 รองรับ Presigned URLs แบบ S3**

**Endpoints:**
```
POST /api/v1/files/prepare-upload   # สร้าง presigned URL
POST /api/v1/files/confirm-upload   # ยืนยันว่า upload สำเร็จ
```

**Workflow:**
1. Frontend request presigned URL
2. Backend generate presigned URL + create pending record
3. Frontend upload ตรงไป R2 (ไม่ผ่าน Backend)
4. Frontend confirm upload success
5. Backend update record เป็น completed

**ประโยชน์:**
- ไม่ต้องส่งไฟล์ผ่าน Backend
- ประหยัด bandwidth และ memory
- เร็วกว่า (upload ตรงไป R2)

**ไฟล์ที่เกี่ยวข้อง:**
- Handler: `interfaces/api/handler/file_handler.go:222-442`
- R2 Storage: `infrastructure/storage/r2/r2_storage.go:164-192`

---

## ⚠️ ข้อจำกัดของ R2 (สำหรับวิดีโอ)

### 1️⃣ **ไม่มี Video Metadata Extraction**

**ปัญหา:** R2 ไม่ได้ extract metadata อัตโนมัติ

**Response จะไม่มี:**
- ❌ `duration` (ความยาววิดีโอ)
- ❌ `width` (ความกว้าง)
- ❌ `height` (ความสูง)
- ❌ `fps` (frames per second)
- ❌ `bitrate`
- ❌ `codec`

**Response ที่มี:**
- ✅ `url` (R2 public URL)
- ✅ `path` (storage path)
- ✅ `size` (ขนาดไฟล์)
- ✅ `format` (นามสกุลไฟล์)
- ✅ `content_type` (MIME type)

**วิธีแก้:**
Frontend ต้อง extract metadata เองก่อน upload:
```typescript
const extractVideoMetadata = (file: File): Promise<VideoMetadata> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        duration: Math.round(video.duration),
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    video.onerror = reject;
  });
};
```

---

### 2️⃣ **ไม่มี Thumbnail Auto-Generation**

**ปัญหา:** R2 ไม่ generate thumbnail อัตโนมัติ

**วิธีแก้:**
Frontend ต้อง generate thumbnail เอง:
```typescript
const generateThumbnail = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      video.currentTime = 2; // frame ที่ 2 วินาที
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(video.src);
        resolve(blob);
      }, 'image/jpeg', 0.8);
    };

    video.onerror = reject;
  });
};
```

**หรือ:** อัปโหลด thumbnail แยก
```typescript
// 1. Upload video
const videoResult = await uploadVideo(videoFile);

// 2. Generate thumbnail
const thumbnailBlob = await generateThumbnail(videoFile);
const thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg');

// 3. Upload thumbnail
const thumbnailResult = await uploadImage(thumbnailFile);

// 4. Save metadata
await saveVideoWithThumbnail({
  video_url: videoResult.url,
  thumbnail_url: thumbnailResult.url,
  duration: metadata.duration,
  width: metadata.width,
  height: metadata.height
});
```

---

### 3️⃣ **Upload Timeout**

**ปัญหา:** Timeout = 30 วินาที อาจไม่พอสำหรับวิดีโอใหญ่

**ที่ตั้ง:** `infrastructure/storage/r2/r2_storage.go:113`

```go
ctx, cancel := context.WithTimeout(r.ctx, 30*time.Second)
```

**วิธีแก้:**
1. ใช้ Presigned URL สำหรับวิดีโอใหญ่ (แนะนำ)
2. Frontend validate ขนาดไฟล์ก่อน upload
3. แนะนำให้ใช้วิดีโอไม่เกิน 50MB สำหรับ direct upload
4. สำหรับวิดีโอ 50-100MB ใช้ presigned URL

---

### 4️⃣ **ไม่มี MIME Type Validation**

**ปัญหา:** Backend ยอมรับทุกประเภทไฟล์

**ความเสี่ยง:**
- อาจ upload ไฟล์ที่ไม่ใช่วิดีโอได้
- ไม่มี whitelist สำหรับ video formats

**วิธีแก้:**
Frontend ต้อง validate เอง:
```typescript
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',     // MOV
  'video/x-msvideo',     // AVI
  'video/x-matroska'     // MKV
];

const validateVideo = (file: File) => {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    throw new Error('Invalid video format. Allowed: MP4, WebM, MOV, AVI, MKV');
  }

  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    throw new Error('Video size exceeds 100MB limit');
  }

  return true;
};
```

---

### 5️⃣ **ไม่มี Video Processing**

**R2 ไม่มี features เหล่านี้:**
- ❌ Video compression
- ❌ Video transcoding
- ❌ Adaptive streaming (HLS/DASH)
- ❌ Watermark
- ❌ Auto quality adjustment

**วิธีแก้:**
1. Frontend compress ก่อน upload (ใช้ libraries)
2. ใช้ service แยกสำหรับ video processing
3. ใช้ Cloudinary แทน (เปลี่ยน `STORAGE_TYPE=cloudinary`)

---

## 🎯 การใช้งาน (Frontend Guide)

### **Option 1: Direct Upload (ไฟล์เล็ก < 50MB)**

```typescript
const uploadVideoSimple = async (file: File) => {
  // 1. Validate
  validateVideo(file);

  // 2. Extract metadata
  const metadata = await extractVideoMetadata(file);

  // 3. Upload
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'videos');

  const response = await fetch('/api/v1/files/file', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const result = await response.json();

  // 4. Generate & upload thumbnail
  const thumbnailBlob = await generateThumbnail(file);
  const thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg');
  const thumbnailFormData = new FormData();
  thumbnailFormData.append('image', thumbnailFile);
  thumbnailFormData.append('folder', 'thumbnails');

  const thumbnailResponse = await fetch('/api/v1/files/image', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: thumbnailFormData
  });

  const thumbnailResult = await thumbnailResponse.json();

  return {
    id: result.data.path,
    url: result.data.url,
    thumbnail_url: thumbnailResult.data.url,
    metadata: {
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      size: result.data.size,
      format: result.data.format
    }
  };
};
```

---

### **Option 2: Presigned URL Upload (ไฟล์ใหญ่ 50-100MB) - แนะนำ**

```typescript
const uploadVideoPresigned = async (file: File, onProgress?: (progress: number) => void) => {
  // 1. Validate
  validateVideo(file);

  // 2. Extract metadata
  const metadata = await extractVideoMetadata(file);

  // 3. Prepare upload (get presigned URL)
  const prepareResponse = await fetch('/api/v1/files/prepare-upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename: file.name,
      content_type: file.type,
      size: file.size,
      folder: 'videos'
    })
  });

  const prepareResult = await prepareResponse.json();
  const { upload_id, upload_url } = prepareResult.data;

  // 4. Upload directly to R2 with progress
  const xhr = new XMLHttpRequest();

  xhr.upload.addEventListener('progress', (e) => {
    if (onProgress && e.total) {
      const progress = (e.loaded / e.total) * 100;
      onProgress(progress);
    }
  });

  await new Promise((resolve, reject) => {
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error('Upload failed'));
      }
    };
    xhr.onerror = reject;

    xhr.open('PUT', upload_url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });

  // 5. Confirm upload
  const confirmResponse = await fetch('/api/v1/files/confirm-upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ upload_id })
  });

  const confirmResult = await confirmResponse.json();

  // 6. Generate & upload thumbnail
  const thumbnailBlob = await generateThumbnail(file);
  const thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg');
  const thumbnailFormData = new FormData();
  thumbnailFormData.append('image', thumbnailFile);
  thumbnailFormData.append('folder', 'thumbnails');

  const thumbnailResponse = await fetch('/api/v1/files/image', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: thumbnailFormData
  });

  const thumbnailResult = await thumbnailResponse.json();

  return {
    id: confirmResult.data.id,
    url: confirmResult.data.url,
    thumbnail_url: thumbnailResult.data.url,
    metadata: {
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      size: confirmResult.data.size,
      format: file.type
    }
  };
};
```

---

## 📊 เปรียบเทียบ R2 vs Cloudinary

| Feature | R2 (ใช้อยู่) | Cloudinary (สลับได้) |
|---------|--------------|---------------------|
| **Video Upload** | ✅ รองรับ | ✅ รองรับ |
| **File Size Limit** | 100MB (API) | 100MB |
| **Presigned URLs** | ✅ รองรับ | ❌ ไม่รองรับ |
| **Auto Thumbnail** | ❌ ไม่มี | ✅ มี (auto) |
| **Video Metadata** | ❌ ไม่มี | ✅ มี (auto) |
| **Video Transcoding** | ❌ ไม่มี | ✅ มี |
| **Adaptive Streaming** | ❌ ไม่มี | ✅ มี (HLS) |
| **Transformations** | ❌ ไม่มี | ✅ มี (URL-based) |
| **Egress Fees** | ✅ ฟรี | ❌ มีค่าใช้จ่าย |
| **Cost** | ถูกกว่า | แพงกว่า |
| **Performance** | เร็ว | เร็ว + Processing |

**สรุป:**
- **ใช้ R2:** ถ้าต้องการประหยัดค่าใช้จ่าย และ process ฝั่ง Frontend ได้
- **ใช้ Cloudinary:** ถ้าต้องการ auto processing และไม่อยากยุ่งกับ Frontend

**การสลับ Storage:**
```env
# แค่เปลี่ยนใน .env
STORAGE_TYPE=cloudinary  # เปลี่ยนจาก r2 เป็น cloudinary
```

---

## 🚀 คำแนะนำสำหรับ Frontend

### **สำหรับวิดีโอ (R2):**

1. ✅ **ต้องทำ:**
   - Validate MIME type และ file size ฝั่ง Frontend
   - Extract metadata (duration, width, height) เอง
   - Generate thumbnail เอง
   - Upload thumbnail แยกต่างหาก
   - ใช้ Presigned URL สำหรับไฟล์ใหญ่

2. ⚠️ **ข้อจำกัด:**
   - ไม่มี auto thumbnail
   - ไม่มี video processing
   - ไม่มี adaptive streaming
   - Timeout 30 วินาที (ใช้ presigned URL แทน)

3. 💡 **Best Practices:**
   - ไฟล์ < 50MB: Direct upload
   - ไฟล์ 50-100MB: Presigned URL
   - ควร compress วิดีโอก่อน upload (Frontend)
   - แสดง progress bar ขณะ upload
   - Handle errors ครบถ้วน

---

## 📝 สรุป

### ✅ **สิ่งที่พร้อมใช้งาน:**
1. Upload API สำหรับ video (direct + presigned)
2. Cloudflare R2 CDN (fast, no egress fees)
3. File size limit 100MB
4. Adapter Pattern (เปลี่ยน storage ได้ง่าย)
5. Rate limiting

### ⚠️ **ข้อจำกัดที่ต้องรู้ (R2):**
1. ไม่มี video metadata extraction → Frontend extract เอง
2. ไม่มี thumbnail generation → Frontend generate เอง
3. ไม่มี video processing → ต้องทำ Frontend หรือ service แยก
4. Upload timeout 30 วินาที → ใช้ presigned URL สำหรับไฟล์ใหญ่
5. ไม่มี MIME validation → Frontend validate เอง

### 🎯 **คำแนะนำ:**
- **ใช้งานได้ทันที** โดยทำ metadata extraction และ thumbnail generation ฝั่ง Frontend
- **Presigned URL** สำหรับไฟล์ใหญ่ (50-100MB)
- **สลับเป็น Cloudinary** ได้ถ้าต้องการ auto processing

---

**สรุปโดย:** Backend Team
**วันที่:** 2025-11-27
**Version:** 2.0 (Updated - R2 Storage)
