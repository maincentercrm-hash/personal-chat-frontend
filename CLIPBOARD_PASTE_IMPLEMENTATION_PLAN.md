# 📋 Copy-Paste Image Implementation Plan

**วันที่:** 2025-11-28
**Feature:** รองรับการ Copy-Paste รูปภาพและ Screenshot
**Priority:** 🟡 MEDIUM
**Difficulty:** ⭐⭐ ปานกลาง

---

## 🎯 เป้าหมาย

### ต้องการให้ทำได้ 2 อย่าง:

1. ✅ **Copy รูปจาก browser → Paste → ส่งได้**
   - คลิกขวารูปในเว็บ → Copy Image
   - ไปที่ช่องแชท → Ctrl+V
   - รูปแสดงใน preview → กด Send

2. ✅ **Screenshot → Paste → ส่งได้**
   - กด Win+Shift+S (Windows Snipping Tool)
   - หรือ Print Screen
   - Ctrl+V ในช่องแชท → ส่งได้เลย

---

## 🔍 ตรวจสอบสถานะปัจจุบัน

### ✅ มีอยู่แล้ว:
- ✅ Drag & Drop รูปภาพจาก browser ทำงานได้ (ดู `useDragAndDrop.ts`)
- ✅ Multi-file upload ระบบมีแล้ว (`useBulkUpload.ts`)
- ✅ File preview component มีแล้ว (`MultiFilePreview.tsx`)

### ❌ ยังไม่มี:
- ❌ **Paste event handler** สำหรับรูปภาพ
- ❌ **Clipboard API integration**
- ❌ **Auto filename generation** สำหรับ screenshot

---

## 🏗️ สถาปัตยกรรม

```
User Action (Paste)
      ↓
  onPaste Event Handler
      ↓
  Extract Files from Clipboard
      ↓
  Validate Files (type, size)
      ↓
  Show Preview (MultiFilePreview)
      ↓
  User confirms → Send
      ↓
  Bulk Upload to Backend
```

---

## 📝 Implementation Steps

### Step 1: สร้าง useClipboardPaste Hook

**ไฟล์:** `src/hooks/useClipboardPaste.ts`

```typescript
import { useCallback } from 'react';

interface UseClipboardPasteOptions {
  onFilesDetected: (files: File[]) => void;
  onError?: (error: Error) => void;
  maxFileSize?: number; // bytes
  allowedTypes?: string[]; // ['image/png', 'image/jpeg', ...]
}

export function useClipboardPaste({
  onFilesDetected,
  onError,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
}: UseClipboardPasteOptions) {

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    // ✅ ป้องกันไม่ให้ paste เข้า input ถ้ามีรูป
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;

    const files: File[] = [];
    let hasImage = false;

    // ✅ Loop through clipboard items
    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];

      // ตรวจสอบว่าเป็นไฟล์รูปภาพหรือไม่
      if (item.type.startsWith('image/')) {
        hasImage = true;
        const file = item.getAsFile();

        if (file) {
          // Validate file type
          if (!allowedTypes.includes(file.type)) {
            onError?.(new Error(`File type ${file.type} not allowed`));
            continue;
          }

          // Validate file size
          if (file.size > maxFileSize) {
            onError?.(new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`));
            continue;
          }

          // ✅ Generate filename for screenshot/clipboard
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          const extension = file.type.split('/')[1] || 'png';
          const newFile = new File(
            [file],
            file.name === 'image.png'
              ? `Screenshot-${timestamp}.${extension}`
              : file.name,
            { type: file.type }
          );

          files.push(newFile);
        }
      }
    }

    // ✅ ถ้ามีรูป → ป้องกันการ paste ข้อความปกติ
    if (hasImage && files.length > 0) {
      e.preventDefault();
      onFilesDetected(files);
    }

    // ✅ ถ้าไม่มีรูป → ปล่อยให้ paste ข้อความปกติ
  }, [onFilesDetected, onError, maxFileSize, allowedTypes]);

  return { handlePaste };
}
```

**Key Features:**
- ✅ ตรวจจับ clipboard items
- ✅ Validate file type และ size
- ✅ Auto-generate filename สำหรับ screenshot (`Screenshot-2024-01-01-12-30-45.png`)
- ✅ รองรับหลายไฟล์พร้อมกัน
- ✅ ไม่ block การ paste ข้อความปกติ

---

### Step 2: ผสม Hook เข้ากับ MessageInput

**ไฟล์:** `src/components/shared/hooks/useMessageInput.ts`

**เพิ่ม:**
```typescript
import { useClipboardPaste } from '@/hooks/useClipboardPaste';

export function useMessageInput({
  // ... existing props
  onFilesSelected, // ✅ ใช้ตัวเดียวกับ drag & drop
}: UseMessageInputProps) {

  // ... existing code

  // ✅ NEW: Clipboard paste handler
  const { handlePaste: handleClipboardPaste } = useClipboardPaste({
    onFilesDetected: (files) => {
      console.log('[ClipboardPaste] Files detected:', files.length);

      // ✅ ใช้ callback เดียวกับ drag & drop
      if (onFilesSelected) {
        onFilesSelected(files);
      }
    },
    onError: (error) => {
      console.error('[ClipboardPaste] Error:', error);
      // TODO: Show toast notification
    }
  });

  // ✅ Attach paste listener เมื่อ component mount
  useEffect(() => {
    // เพิ่ม listener ที่ window level เพื่อจับทุก paste event
    const pasteHandler = (e: ClipboardEvent) => {
      // ✅ เช็คว่า focus อยู่ที่ textarea หรือไม่
      if (document.activeElement === messageInputRef.current) {
        handleClipboardPaste(e);
      }
    };

    window.addEventListener('paste', pasteHandler);

    return () => {
      window.removeEventListener('paste', pasteHandler);
    };
  }, [handleClipboardPaste]);

  return {
    // ... existing returns
  };
}
```

---

### Step 3: ปรับ ConversationPageDemo

**ไฟล์:** `src/pages/chat/ConversationPageDemo.tsx`

**ไม่ต้องแก้!** เพราะ:
- ✅ มี `handleFilesSelected` อยู่แล้ว (line 158)
- ✅ มี `MultiFilePreview` อยู่แล้ว (line 403)
- ✅ มี `useBulkUpload` อยู่แล้ว (line 110)

**Paste จะทำงานแบบนี้:**
```
User Paste
  → useClipboardPaste detects files
  → calls onFilesSelected(files)
  → setSelectedFiles(files)
  → setShowFilePreview(true)
  → MultiFilePreview shows
  → User clicks Send
  → uploadFiles()
```

---

## 🎨 UX Flow

### Scenario 1: Copy Image from Browser
```
1. User: Right-click image → Copy Image
2. User: Click in chat textarea
3. User: Ctrl+V
4. System: Detect image in clipboard
5. System: Show preview with image
6. User: Add caption (optional)
7. User: Click Send
8. System: Upload to backend
```

### Scenario 2: Screenshot
```
1. User: Win+Shift+S (Snipping Tool)
2. User: Select area → screenshot saved to clipboard
3. User: Click in chat → Ctrl+V
4. System: Detect image as "Screenshot-2024-11-28-14-30-45.png"
5. System: Show preview
6. User: Send
```

### Scenario 3: Multiple Screenshots
```
1. User: Take screenshot 1
2. User: Ctrl+V → preview shows
3. User: Take screenshot 2
4. User: Ctrl+V → adds to existing preview
5. User: Send all at once (album)
```

---

## ⚠️ Edge Cases & Error Handling

### 1. **ไฟล์ใหญ่เกินไป**
```typescript
if (file.size > maxFileSize) {
  toast.error(
    'ไฟล์ใหญ่เกินไป',
    `ขนาดไฟล์: ${(file.size / 1024 / 1024).toFixed(2)}MB (สูงสุด ${maxFileSize / 1024 / 1024}MB)`
  );
  return;
}
```

### 2. **ไฟล์ประเภทไม่รองรับ**
```typescript
const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
if (!allowedTypes.includes(file.type)) {
  toast.error('ไฟล์ไม่รองรับ', `กรุณาใช้ไฟล์ประเภท: PNG, JPEG, GIF, WEBP`);
  return;
}
```

### 3. **Clipboard ว่างเปล่า**
```typescript
if (!clipboardItems || clipboardItems.length === 0) {
  // ปล่อยให้ paste ข้อความปกติ
  return;
}
```

### 4. **Paste ข้อความและรูปพร้อมกัน**
```typescript
// ให้ความสำคัญกับรูปก่อน
// ถ้ามีรูป → แสดง preview รูป (ignore ข้อความ)
// ถ้าไม่มีรูป → paste ข้อความปกติ
if (hasImage) {
  e.preventDefault(); // ไม่ให้ paste ข้อความ
  showImagePreview(files);
} else {
  // ปล่อยให้ paste ข้อความ
}
```

### 5. **Browser Compatibility**
```typescript
// Check API support
if (!navigator.clipboard || !ClipboardEvent) {
  console.warn('[ClipboardPaste] Clipboard API not supported');
  toast.error('เบราว์เซอร์ไม่รองรับ', 'กรุณาใช้เบราว์เซอร์รุ่นใหม่');
  return;
}
```

---

## 🧪 Testing Checklist

### Manual Testing:

**Copy from Browser:**
- [ ] คลิกขวารูปใน Google Images → Copy Image → Paste → แสดง preview ✅
- [ ] คลิกขวารูปใน Facebook → Copy Image → Paste → แสดง preview ✅
- [ ] Copy รูปหลายรูป (ถ้า browser รองรับ) → Paste → แสดงทั้งหมด ✅

**Screenshots:**
- [ ] Win+Shift+S → Snip → Paste → แสดงเป็น "Screenshot-[timestamp].png" ✅
- [ ] Print Screen → Paste → แสดง preview ✅
- [ ] Screenshot บน Mac (Cmd+Shift+4) → Paste → ทำงาน ✅

**Text Paste (ต้องไม่เสีย):**
- [ ] Copy ข้อความ → Paste → ข้อความแสดงปกติ (ไม่ถูก block) ✅
- [ ] Copy URL → Paste → URL แสดงปกติ ✅

**Error Handling:**
- [ ] Paste รูปใหญ่เกิน 10MB → แสดง error toast ✅
- [ ] Paste ไฟล์ .pdf → แสดง error "ไฟล์ไม่รองรับ" ✅
- [ ] Paste ในขณะที่กำลัง upload → แสดง error หรือ queue ✅

**Browser Compatibility:**
- [ ] Chrome/Edge (Chromium) ✅
- [ ] Firefox ✅
- [ ] Safari ⚠️ (อาจมีข้อจำกัด)

---

## 📦 Files to Create/Modify

### 🆕 สร้างใหม่:
1. **`src/hooks/useClipboardPaste.ts`** (NEW)
   - Clipboard paste logic
   - File extraction
   - Validation

### ✏️ แก้ไข:
2. **`src/components/shared/hooks/useMessageInput.ts`**
   - Import useClipboardPaste
   - Add paste event listener
   - Connect to onFilesSelected

3. **`src/pages/chat/ConversationPageDemo.tsx`** (ไม่ต้องแก้มาก)
   - อาจเพิ่ม toast notifications สำหรับ errors

---

## 🚀 Implementation Order

### Phase 1: Core Functionality (30-45 min)
1. ✅ สร้าง `useClipboardPaste.ts` hook
2. ✅ ผสมเข้ากับ `useMessageInput.ts`
3. ✅ Test basic paste

### Phase 2: Refinement (15-30 min)
4. ✅ Auto-generate filename สำหรับ screenshot
5. ✅ เพิ่ม error handling + toast
6. ✅ Validate file types

### Phase 3: Testing (30 min)
7. ✅ Test ทุก scenario
8. ✅ Test error cases
9. ✅ Test browser compatibility

---

## 💡 Technical Notes

### Browser Clipboard API
```typescript
// Modern browsers support:
const items = event.clipboardData?.items;

// Each item can be:
item.kind === 'string'  // text, html, url
item.kind === 'file'    // image, video, etc.

// Get file:
const file = item.getAsFile();
```

### Screenshot Detection
```typescript
// Windows Snipping Tool creates file with name "image.png"
// เราต้อง rename เป็น "Screenshot-[timestamp].png"
const isScreenshot = file.name === 'image.png' || file.name === 'screenshot.png';

if (isScreenshot) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  newFileName = `Screenshot-${timestamp}.png`;
}
```

### Multiple Files in Clipboard
```typescript
// Modern browsers อาจรองรับ paste หลายไฟล์
for (const item of items) {
  if (item.type.startsWith('image/')) {
    files.push(item.getAsFile());
  }
}

// ส่งทั้งหมดไปทีเดียว
onFilesSelected(files); // → Album upload
```

---

## 🎯 Success Criteria

### Must Have:
- ✅ Copy image from browser → Paste → Preview shows → Send works
- ✅ Screenshot → Paste → Preview shows → Send works
- ✅ Text paste ไม่เสีย (ทำงานปกติ)
- ✅ File validation ทำงาน (size, type)
- ✅ Error messages ชัดเจน

### Nice to Have:
- ✅ Auto-filename สำหรับ screenshot
- ✅ รองรับหลายไฟล์พร้อมกัน
- ✅ Keyboard shortcut hints (Ctrl+V to paste)
- ✅ Toast notifications สวยงาม

---

## 🔧 Backend Requirements

### ✅ ไม่ต้องเปลี่ยน Backend!

เพราะ:
- ใช้ `/messages/bulk` endpoint ที่มีอยู่แล้ว
- Frontend จะส่งไฟล์แบบเดียวกับ drag & drop
- Backend ไม่ต้องรู้ว่าไฟล์มาจาก paste หรือ drag

---

## 📊 Estimated Time

| Task | Time |
|------|------|
| สร้าง useClipboardPaste hook | 20 min |
| ผสมเข้า useMessageInput | 15 min |
| Auto-filename generation | 10 min |
| Error handling + toast | 15 min |
| Testing (manual) | 30 min |
| **Total** | **~1.5 hours** |

---

## 🎨 User Feedback Messages

```typescript
// Success
toast.success('รูปภาพถูกเพิ่มแล้ว', 'กรุณาตรวจสอบและกด Send');

// Error - File too large
toast.error(
  'ไฟล์ใหญ่เกินไป',
  `ขนาดไฟล์ ${fileSize}MB (สูงสุด 10MB)`
);

// Error - Wrong type
toast.error(
  'ไฟล์ไม่รองรับ',
  'รองรับเฉพาะ PNG, JPEG, GIF, WEBP'
);

// Info - Screenshot detected
toast.info(
  'Screenshot ถูกเพิ่มแล้ว',
  'ชื่อไฟล์: Screenshot-2024-11-28-14-30.png'
);
```

---

## ✅ Final Checklist

- [ ] สร้าง `useClipboardPaste.ts`
- [ ] แก้ `useMessageInput.ts`
- [ ] Test copy image from browser
- [ ] Test screenshot (Win+Shift+S)
- [ ] Test text paste (ต้องไม่เสีย)
- [ ] Test file validation
- [ ] Test error messages
- [ ] Test Chrome
- [ ] Test Firefox
- [ ] Document usage

---

**Status:** 📝 Ready for Implementation
**Next Step:** สร้าง `useClipboardPaste.ts` hook
