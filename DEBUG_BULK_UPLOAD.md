# 🐞 Debug: Bulk Upload 500 Error

**Date**: 2025-11-27
**Issue**: Upload ไฟล์สำเร็จ แต่สร้าง bulk messages ล้มเหลว (500 error)

---

## ❌ Error Details

```
POST https://b01.ngrok.dev/api/v1/conversations/69cd966b-c0f4-44bf-ae6f-f08eaf501e20/messages/bulk
Status: 500 (Internal Server Error)
```

**Error Message:**
```
AxiosError {
  message: 'Request failed with status code 500',
  name: 'AxiosError',
  code: 'ERR_BAD_RESPONSE'
}
```

---

## 🔍 What Happened:

1. ✅ **Files uploaded successfully** (progress 100%)
2. ✅ **Frontend sent request** to bulk messages API
3. ❌ **Backend returned 500 error**

---

## 🎯 Root Cause Analysis:

### **Possible Causes:**

1. **Request format ไม่ถูกต้อง**
   - Frontend ส่ง format ที่ Backend ไม่ expect
   - Missing required fields
   - Invalid data types

2. **Backend API ยังไม่พร้อม**
   - Bulk messages endpoint ยังไม่ได้ implement
   - Missing error handling
   - Database schema ไม่รองรับ album metadata

3. **Backend logic error**
   - Panic/crash ในขณะสร้าง messages
   - Database constraint violation
   - Business logic error

4. **Authentication/Authorization**
   - Token expired
   - User ไม่มีสิทธิ์ส่ง message ใน conversation

---

## 🔧 Debug Steps:

### **Step 1: เช็ค Request Payload (Frontend)**

เปิด **DevTools → Network → messages/bulk**

**ดู Request Payload:**
```json
{
  "caption": "optional caption here",
  "messages": [
    {
      "message_type": "image",
      "media_url": "https://pub-xxx.r2.dev/...",
      "media_thumbnail_url": "https://pub-xxx.r2.dev/..."
    },
    {
      "message_type": "image",
      "media_url": "https://pub-xxx.r2.dev/...",
      "media_thumbnail_url": "https://pub-xxx.r2.dev/..."
    }
  ]
}
```

**ตรวจสอบ:**
- [ ] มี `messages` array หรือไม่
- [ ] แต่ละ message มี `message_type`, `media_url` ครบหรือไม่
- [ ] `media_url` เป็น URL ที่ valid หรือไม่
- [ ] `caption` เป็น string หรือ undefined (ไม่ใช่ null)

---

### **Step 2: เช็ค Backend Logs**

**Backend ควรแสดง error message ว่า:**
- Database error
- Validation error
- Panic stack trace
- Missing field error

**ตัวอย่าง error ที่อาจเจอ:**

```go
// Missing conversation_id
"conversation not found"

// Invalid message_type
"invalid message type: must be 'image', 'video', or 'file'"

// Database constraint
"duplicate key value violates unique constraint"

// Album creation failed
"failed to create album: ..."
```

---

### **Step 3: ทดสอบด้วย Manual API Call**

ลอง call API ด้วย `curl` เพื่อ isolate ปัญหา:

```bash
curl -X POST \
  https://b01.ngrok.dev/api/v1/conversations/69cd966b-c0f4-44bf-ae6f-f08eaf501e20/messages/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "caption": "Test album",
    "messages": [
      {
        "message_type": "image",
        "media_url": "https://pub-xxx.r2.dev/test.jpg",
        "media_thumbnail_url": "https://pub-xxx.r2.dev/test.jpg"
      }
    ]
  }'
```

---

## 🐛 Common Issues & Solutions:

### **Issue 1: Backend expects different format**

**Problem:**
```json
// Backend expects:
{
  "messages": [
    {
      "type": "image",  // ไม่ใช่ message_type
      "url": "...",     // ไม่ใช่ media_url
    }
  ]
}
```

**Solution:** ตรวจสอบ Backend DTO definition

---

### **Issue 2: Missing caption handling**

**Problem:**
```go
// Backend code
caption := req.Caption // ถ้า Caption เป็น pointer อาจเป็น nil
```

**Solution:** ตรวจสอบว่า Backend handle `caption` ที่เป็น `nil` ได้หรือไม่

---

### **Issue 3: Album metadata not created**

**Problem:**
```
Album ID not generated before creating messages
```

**Solution:** Backend ต้องสร้าง `album_id` ก่อนแล้วใส่ใน metadata ของทุก message

---

### **Issue 4: Conversation not found**

**Problem:**
```
User ไม่ได้อยู่ใน conversation
```

**Solution:** ตรวจสอบว่า user มีสิทธิ์ส่ง message ใน conversation นี้หรือไม่

---

## 🔍 Frontend Request Builder:

ดูที่ `fileService.ts`:

```typescript
sendBulkMessages: async (
  conversationId: string,
  messages: BulkMessageRequest['messages'],
  caption?: string
): Promise<BulkMessageResponse> => {
  const request: BulkMessageRequest = {
    caption,  // อาจเป็น undefined
    messages, // array of { message_type, media_url, media_thumbnail_url }
  };

  return await apiService.post<BulkMessageResponse>(
    MESSAGE_API.SEND_BULK_MESSAGES(conversationId),
    request
  );
}
```

**Potential Issue:** ถ้า `caption` เป็น `undefined`, JSON.stringify จะไม่รวม key นี้ใน payload

```javascript
// ✅ Good:
{ "messages": [...] }

// ❌ Bad (ถ้า Backend expect caption เป็น empty string):
{ "caption": undefined, "messages": [...] }
```

---

## ✅ Quick Fix (Frontend)

ลอง fix frontend ให้ส่ง `caption` เป็น `""` แทน `undefined`:

```typescript
const request: BulkMessageRequest = {
  caption: caption || "",  // แทนที่จะเป็น undefined
  messages,
};
```

---

## 📋 Checklist for Backend Team:

- [ ] Bulk messages endpoint ถูก implement แล้ว
- [ ] DTO validation ถูกต้อง (BulkMessageRequest)
- [ ] Album ID generation ทำงาน
- [ ] Metadata (album_id, album_position, album_total) ถูกสร้าง
- [ ] Error handling ครบถ้วน
- [ ] Return proper error messages (ไม่ใช่แค่ 500)
- [ ] Logs แสดง error details ชัดเจน

---

## 📞 Next Steps:

1. **Frontend**: Copy request payload จาก Network tab → ส่งมาให้ดู
2. **Backend**: เช็ค logs → ส่ง error message มาให้ดู
3. **Debug together**: แก้ไข format หรือ Backend logic

---

**Status**: 🔄 Waiting for Backend logs

**Updated**: 2025-11-27
