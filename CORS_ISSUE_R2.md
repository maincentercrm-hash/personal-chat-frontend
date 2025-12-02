# 🔴 R2 CORS Configuration Issue

**Date**: 2025-11-27
**Status**: ⚠️ **URGENT - Direct Upload ไม่ทำงาน**
**Priority**: High

---

## 🐞 Problem

เมื่อพยายาม upload ไฟล์ตรงไปที่ R2 bucket ด้วย Presigned URL เจอ CORS error:

```
Access to fetch at 'https://suekk-bucket.fcc0e164ed5f9fcf121a73f8f111ccd1.r2.cloudflarestorage.com/...'
from origin 'https://f01.ngrok.dev' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

---

## 🔍 Root Cause

R2 bucket ยังไม่ได้ตั้งค่า **CORS policy** ให้รองรับ origins ที่ frontend ใช้งาน:
- ✅ Backend API (`https://f01.ngrok.dev`) - ทำงานปกติ
- ❌ R2 Bucket - **ไม่มี CORS policy**

---

## ✅ Solution

### **Step 1: ตั้งค่า CORS Policy สำหรับ R2 Bucket**

#### **Required CORS Configuration:**

```json
{
  "AllowedOrigins": [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://f01.ngrok.dev",
    "https://*.ngrok.dev",
    "https://your-production-domain.com"
  ],
  "AllowedMethods": [
    "GET",
    "PUT",
    "POST",
    "DELETE",
    "HEAD"
  ],
  "AllowedHeaders": [
    "*"
  ],
  "ExposeHeaders": [
    "ETag",
    "Content-Length",
    "Content-Type"
  ],
  "MaxAgeSeconds": 3600
}
```

---

### **Step 2: วิธีตั้งค่า CORS ใน Cloudflare R2**

#### **Option A: ใช้ Cloudflare Dashboard**

1. เข้า **Cloudflare Dashboard** → **R2**
2. เลือก bucket: `suekk-bucket`
3. ไปที่ **Settings** → **CORS Policy**
4. เพิ่ม CORS rules ตาม configuration ข้างบน
5. **Save**

#### **Option B: ใช้ Wrangler CLI**

```bash
# ไฟล์ cors.json
{
  "AllowedOrigins": [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://f01.ngrok.dev",
    "https://*.ngrok.dev"
  ],
  "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3600
}

# Apply CORS policy
wrangler r2 bucket cors put suekk-bucket --file cors.json
```

#### **Option C: ใช้ AWS S3 API (Compatible)**

```typescript
// ใน Backend code (Go)
import (
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/service/s3"
)

func SetBucketCORS() {
    corsConfig := &s3.CORSConfiguration{
        CORSRules: []*s3.CORSRule{
            {
                AllowedOrigins: []*string{
                    aws.String("http://localhost:5173"),
                    aws.String("http://localhost:5174"),
                    aws.String("https://f01.ngrok.dev"),
                    aws.String("https://*.ngrok.dev"),
                },
                AllowedMethods: []*string{
                    aws.String("GET"),
                    aws.String("PUT"),
                    aws.String("POST"),
                    aws.String("DELETE"),
                    aws.String("HEAD"),
                },
                AllowedHeaders: []*string{
                    aws.String("*"),
                },
                ExposeHeaders: []*string{
                    aws.String("ETag"),
                },
                MaxAgeSeconds: aws.Int64(3600),
            },
        },
    }

    _, err := s3Client.PutBucketCors(&s3.PutBucketCorsInput{
        Bucket:            aws.String("suekk-bucket"),
        CORSConfiguration: corsConfig,
    })
}
```

---

## 🔧 Current Workaround (Frontend)

ชั่วคราว Frontend ได้เปลี่ยนไปใช้ **upload ผ่าน backend** แทน (Legacy method) เพื่อให้ระบบทำงานต่อได้

```typescript
// fileService.ts
uploadSingleFile: async (file, folder, useDirectUpload = false) => {
  if (!useDirectUpload) {
    // ⚠️ ใช้ upload ผ่าน backend ชั่วคราว
    return fileService.uploadViaBackend(file, folder);
  }
  // Direct Upload to R2 (เมื่อ CORS แก้แล้ว)
}
```

**Impact:**
- ✅ ระบบใช้งานได้
- ⚠️ ช้ากว่า (ผ่าน backend)
- ⚠️ ใช้ bandwidth ของ backend มากขึ้น

---

## 🚀 After CORS is Fixed

เมื่อ Backend ตั้งค่า CORS เรียบร้อยแล้ว Frontend จะเปลี่ยนกลับมาใช้ Direct Upload:

```typescript
// เปลี่ยน default จาก false เป็น true
uploadSingleFile: async (file, folder, useDirectUpload = true)
```

**Benefits:**
- ⚡ **เร็วกว่ามาก** (upload ตรงไปที่ R2)
- 💰 **ประหยัด bandwidth** ของ backend
- 📈 **Scalable**

---

## 🧪 How to Test CORS

หลังจากตั้งค่า CORS แล้ว ทดสอบด้วยคำสั่ง:

```bash
curl -X OPTIONS \
  -H "Origin: https://f01.ngrok.dev" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v \
  https://suekk-bucket.fcc0e164ed5f9fcf121a73f8f111ccd1.r2.cloudflarestorage.com/
```

**Expected Response:**
```
< HTTP/2 200
< access-control-allow-origin: https://f01.ngrok.dev
< access-control-allow-methods: GET, PUT, POST, DELETE, HEAD
< access-control-allow-headers: Content-Type
< access-control-max-age: 3600
```

---

## 📋 Checklist

- [ ] ตั้งค่า CORS policy ของ R2 bucket
- [ ] ทดสอบด้วย curl command
- [ ] แจ้ง Frontend team เมื่อเสร็จแล้ว
- [ ] Frontend เปลี่ยน `useDirectUpload = true`
- [ ] ทดสอบ upload จริงใน browser
- [ ] Monitor performance improvement

---

## 📞 Contact

หากมีคำถามหรือต้องการความช่วยเหลือ:
- Frontend: [Your Name]
- Backend: [Backend Team]

---

**Status**: 🔄 Waiting for Backend to fix CORS configuration

**Updated**: 2025-11-27
