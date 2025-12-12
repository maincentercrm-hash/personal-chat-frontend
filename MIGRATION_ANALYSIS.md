# Migration Analysis: Old Chat System → chat-v2

## Overview

เอกสารนี้วิเคราะห์ระบบเก่าทั้งหมด เพื่อวางแผนการย้าย features ไป chat-v2

---

## 1. VirtualMessageList Analysis

### File: `src/components/shared/VirtualMessageList.tsx`
**Lines: 1,104 | Props: 26**

### Props ที่รับ (26 ตัว)

| Props | Type | ใช้ใน chat-v2? |
|-------|------|----------------|
| `messages` | MessageDTO[] | ✅ มีแล้ว |
| `currentUserId` | string | ✅ มีแล้ว |
| `activeConversationId` | string | ✅ มีแล้ว (conversationId) |
| `onLoadMore` | () => void | ✅ มีแล้ว |
| `onLoadMoreAtBottom` | () => void | ❌ ต้องเพิ่ม |
| `onReplyMessage` | (id) => void | ✅ มีแล้ว (onReply) |
| `onEditMessage` | (id) => void | ✅ มีแล้ว (onEdit) |
| `onDeleteMessage` | (id) => void | ✅ มีแล้ว (onDelete) |
| `onResendMessage` | (id) => void | ✅ มีแล้ว (onResend) |
| `onImageClick` | (id, index?) => void | ✅ มีแล้ว (onMediaClick) |
| `scrollToMessage` | (id) => void | ✅ มีแล้ว (ref method) |
| `onJumpToMessage` | (id) => void | ✅ มีแล้ว |
| `isBusinessView` | boolean | ❌ ไม่จำเป็น |
| `isGroupChat` | boolean | ✅ มีแล้ว |
| `isAdmin` | boolean | ❌ ต้องเพิ่มถ้าจำเป็น |
| `formatTime` | (ts) => string | ✅ มีใน Context |
| `getMessageStatus` | (msg, isUser) => string | ✅ มีใน MessageStatus |
| `renderMessageStatus` | (status) => string | ✅ มีใน MessageStatus |
| `getFormattedSender` | (msg) => string | ✅ มีใน Context (getSenderName) |
| `isOwnMessage` | (msg) => boolean | ✅ มีใน Context |
| `handleCopyMessage` | (content) => void | ✅ มีแล้ว (onCopy) |
| `editingMessageId` | string \| null | ❌ ต้องเพิ่ม |
| `editingContent` | string | ❌ ต้องเพิ่ม |
| `onEditingContentChange` | (content) => void | ❌ ต้องเพิ่ม |
| `onConfirmEdit` | (content?) => void | ❌ ต้องเพิ่ม |
| `onCancelEdit` | () => void | ❌ ต้องเพิ่ม |

### Refs ที่ใช้ (11 ตัว)

| Ref | ใช้งาน | ใน chat-v2? |
|-----|--------|-------------|
| `virtuosoRef` | Virtuoso handle | ✅ มีแล้ว |
| `isJumpingRef` | ป้องกัน auto-scroll ตอน jump | ❌ ต้องเพิ่ม |
| `initialScrollDoneRef` | ป้องกัน initial auto-load | ✅ มีแล้ว |
| `lastScrollDirectionRef` | ติดตาม scroll direction | ❌ ไม่จำเป็น (ใช้ shouldStickToBottom แทน) |
| `isMountedRef` | ป้องกัน initial load | ❌ ใช้ initialScrollDoneRef แทน |
| `scrolledAfterChangeRef` | Track scroll หลังเปลี่ยน conversation | ❌ ไม่จำเป็น |
| `heightCache` | Cache ความสูง message | ❌ ไม่จำเป็น (let Virtuoso handle) |
| `USE_HEIGHT_CACHE` | Feature flag | ❌ ลบได้ |
| `USE_RESIZE_OBSERVER` | Feature flag | ❌ ลบได้ |
| `cacheHits/Misses` | Metrics | ❌ ลบได้ |

### Embedded Components

1. **EditMessageForm** (~65 lines)
   - Inline editing UI
   - Keyboard shortcuts (Ctrl+Enter, Escape)
   - ❌ chat-v2 ยังไม่มี → ต้องเพิ่ม

2. **MessageItem** (~300 lines)
   - Selection mode (long press)
   - Message type routing
   - ResizeObserver for height
   - ✅ chat-v2 มีแล้ว (แยกเป็น component)

### Features ที่ต้องย้าย

| Feature | สถานะใน chat-v2 |
|---------|-----------------|
| Jump to message | ✅ มีแล้ว (scrollToMessage) |
| Load more at top | ✅ มีแล้ว (startReached) |
| Load more at bottom | ❌ ต้องเพิ่ม |
| Selection mode | ✅ มีใน Context แล้ว |
| Inline edit form | ❌ ต้องเพิ่ม |
| Height cache | ❌ ไม่จำเป็น |

---

## 2. useConversationPageLogic Analysis

### File: `src/pages/standard/converstion/hooks/useConversationPageLogic.ts`
**Lines: ~500 | Returns: 20+ items**

### State ที่จัดการ

| State | ใช้งาน | ต้องเพิ่มใน chat-v2? |
|-------|--------|----------------------|
| `isSending` | ส่งข้อความอยู่ | ✅ มีแล้วใน ChatV2TestPage |
| `initialMessagesLoaded` | โหลด messages แล้ว | ✅ มีแล้ว (isReady) |
| `isLoadingMoreMessages` | โหลด more อยู่ | ✅ มีแล้ว (isLoading) |
| `showMessageView` | สำหรับ mobile | ❌ จัดการที่ Layout |
| `editingMessageId` | ID ข้อความที่แก้ไข | ✅ มีแล้ว (editingMessage) |
| `editingContent` | เนื้อหาที่แก้ไข | ✅ มีแล้ว (editingMessage.content) |
| `replyingTo` | ข้อความที่ตอบ | ✅ มีแล้ว |

### Callbacks ที่สำคัญ

| Callback | ใช้งาน | มีใน ChatV2TestPage? |
|----------|--------|---------------------|
| `handleSendMessage` | ส่งข้อความ + mentions | ✅ มีแล้ว (ไม่มี mentions) |
| `handleSendSticker` | ส่ง sticker | ⚠️ Placeholder |
| `handleUploadImage` | อัพโหลดรูป | ⚠️ Placeholder |
| `handleUploadFile` | อัพโหลดไฟล์ | ⚠️ Placeholder |
| `handleLoadMoreMessages` | โหลดข้อความเก่า | ✅ มีแล้ว |
| `handleLoadMoreMessagesAtBottom` | โหลดข้อความใหม่ (jump context) | ❌ ต้องเพิ่ม |
| `handleEditMessage` | เริ่มแก้ไข | ✅ มีแล้ว |
| `handleConfirmEdit` | ยืนยันแก้ไข | ✅ มีแล้ว |
| `handleCancelEdit` | ยกเลิกแก้ไข | ✅ มีแล้ว |
| `handleReplyToMessage` | เริ่มตอบกลับ | ✅ มีแล้ว |
| `handleCancelReply` | ยกเลิกตอบกลับ | ✅ มีแล้ว |
| `handleResendMessage` | ส่งใหม่ | ❌ ต้องเพิ่ม |
| `handleJumpToMessage` | กระโดดไปข้อความ (API + scroll) | ⚠️ มีบางส่วน |

### Jump to Message Flow (สำคัญ)

```
handleJumpToMessage(messageId)
├── เช็คว่า message อยู่ใน memory หรือไม่
│   ├── ถ้าอยู่ → scrollToMessage(messageId) ตรงๆ
│   └── ถ้าไม่อยู่ → เรียก API
│
├── conversationService.getMessageContext(conversationId, {
│   ├── targetId: messageId
│   ├── before: 50
│   └── after: 50
│   })
│
├── replaceMessagesWithContext() → แทนที่ messages ใน store
│
├── รอ 300ms ให้ DOM update
│
└── scrollToMessage(messageId) + highlight
```

**❌ ChatV2TestPage ยังไม่มี:**
- `getMessageContext` API call
- `replaceMessagesWithContext` store action
- `onLoadMoreAtBottom` สำหรับ load context

---

## 3. ConversationDetailsSheet Analysis

### File: `src/components/standard/conversation/ConversationDetailsSheet.tsx`

### Jump from Gallery

```
PhotoGallery/VideoGallery/FileList/LinkList
    ↓
onItemClick(messageId)
    ↓
handleJumpToMessage in Sheet
    ↓
onJumpToMessage prop (passed from ChatLayout)
    ↓
MessageJumpContext.jumpToMessage()
    ↓
Page sets this via setJumpToMessage
    ↓
messageAreaRef.scrollToMessage(messageId)
```

### ต้องเพิ่มใน chat-v2

1. **MessageJumpContext integration**
   - ChatLayout ใช้ MessageJumpProvider
   - Page ต้อง register `setJumpToMessage`

2. **Sheet onJumpToMessage callback**
   - ต้อง pass ให้ ConversationDetailsSheet

---

## 4. Drag & Drop Analysis

### Files:
- `src/hooks/useDragAndDrop.ts`
- `src/hooks/useBulkUpload.ts`
- `src/components/shared/MultiFilePreview.tsx`

### Flow

```
User drags files
    ↓
useDragAndDrop.onDrop(files)
    ↓
setSelectedFiles(files)
setShowFilePreview(true)
    ↓
MultiFilePreview แสดง preview
    ↓
User กด Send
    ↓
useBulkUpload.uploadFiles()
    ↓
fileService.uploadSingleFile() × N files
    ↓
fileService.sendBulkMessages() → album message
    ↓
addNewMessage() to store
```

### ต้องเพิ่มใน chat-v2

| Component | สถานะ |
|-----------|--------|
| `useDragAndDrop` hook | ❌ ต้องเพิ่ม |
| `useBulkUpload` hook | ❌ ต้องเพิ่ม |
| `MultiFilePreview` component | ❌ ต้องเพิ่ม |
| Drag overlay UI | ❌ ต้องเพิ่ม |

---

## 5. Missing Features in chat-v2

### Priority: HIGH (ใช้บ่อย)

| Feature | Description | Effort |
|---------|-------------|--------|
| **Reply ทำงาน** | ✅ แก้แล้ว (React.memo issue) | Done |
| **Edit ทำงาน** | ✅ แก้แล้ว (React.memo issue) | Done |
| **Delete ทำงาน** | ✅ มีแล้ว | Done |
| **Upload Image** | Single image upload | Medium |
| **Upload File** | Single file upload | Medium |
| **Send Sticker** | Sticker picker + send | Medium |

### Priority: MEDIUM (ใช้บ้าง)

| Feature | Description | Effort |
|---------|-------------|--------|
| **Drag & Drop** | Multi-file drag upload | High |
| **Album Upload** | Bulk upload with preview | High |
| **Jump from Sheet** | Gallery → message | Medium |
| **Load More Bottom** | For jump context | Low |
| **Resend Failed** | Resend failed messages | Low |

### Priority: LOW (ไม่บ่อย)

| Feature | Description | Effort |
|---------|-------------|--------|
| **Inline Edit Form** | Edit ใน message list | Medium |
| **Schedule Message** | ตั้งเวลาส่ง | High |
| **Mentions** | @mention users | Medium |
| **Pin/Mute** | Pin/mute conversation | Low |
| **Block Status** | Check block state | Low |

---

## 6. Migration Strategy

### Option A: ย้าย features ไป chat-v2 (แนะนำ)

**ข้อดี:**
- โครงสร้างใหม่ดีกว่า (modular, clean)
- Performance ดีกว่า (no height cache overhead)
- Maintain ง่าย

**ข้อเสีย:**
- ต้องทำทีละ feature
- ใช้เวลา 1-2 สัปดาห์

**ขั้นตอน:**
```
Phase 1: Core Features (3-4 days)
├── Upload Image/File/Sticker
├── Jump to Message (full flow with API)
└── Load More at Bottom

Phase 2: Advanced Features (3-4 days)
├── Drag & Drop
├── Multi-file Preview
└── Album Upload

Phase 3: Integration (2-3 days)
├── Sheet Jump Integration
├── MessageJumpContext
└── Replace old page with new
```

### Option B: ปรับ VirtualMessageList ให้ใช้โครงสร้าง chat-v2

**ข้อดี:**
- ไม่ต้อง migrate features

**ข้อเสีย:**
- VirtualMessageList ซับซ้อนเกินไป (1100+ lines)
- ต้อง refactor มาก
- อาจพัง features เดิม

**ไม่แนะนำ**

---

## 7. Files to Modify/Create

### ต้องสร้างใหม่

```
src/pages/test/ChatV2TestPage.tsx  ← เพิ่ม features
src/components/chat-v2/MessageList/MessageList.tsx  ← เพิ่ม onLoadMoreBottom
```

### ต้องใช้จากเดิม (shared)

```
src/hooks/useDragAndDrop.ts  ← ใช้ได้เลย
src/hooks/useBulkUpload.ts  ← ใช้ได้เลย
src/components/shared/MultiFilePreview.tsx  ← ใช้ได้เลย
src/components/shared/MessageContextMenu.tsx  ← ใช้แล้ว
src/components/shared/MessageInputArea.tsx  ← ใช้แล้ว
src/services/fileService.ts  ← ใช้ได้เลย
src/services/conversationService.ts  ← ใช้สำหรับ getMessageContext
```

### Stores ที่ต้องใช้

```
src/stores/conversationStore.ts
├── replaceMessagesWithContext  ← สำหรับ jump
├── fetchConversationMessages  ← ใช้แล้ว
└── fetchMoreMessages  ← ใช้แล้ว

src/hooks/useMessage.ts
├── sendTextMessage  ← ใช้แล้ว
├── replyToMessage  ← ใช้แล้ว
├── editMessage  ← ใช้แล้ว
├── deleteMessage  ← ใช้แล้ว
├── sendStickerMessage  ← ต้องเพิ่ม
├── uploadAndSendImage  ← ต้องเพิ่ม
└── uploadAndSendFile  ← ต้องเพิ่ม
```

---

## 8. Next Steps

1. **เพิ่ม Upload features ใน ChatV2TestPage**
   - `handleUploadImage` → ใช้ `useMessage.uploadAndSendImage`
   - `handleUploadFile` → ใช้ `useMessage.uploadAndSendFile`
   - `handleSendSticker` → ใช้ `useMessage.sendStickerMessage`

2. **เพิ่ม Jump to Message (full)**
   - เพิ่ม `onLoadMoreAtBottom` ใน MessageList
   - ใช้ `conversationService.getMessageContext`
   - ใช้ `replaceMessagesWithContext` store action

3. **เพิ่ม Drag & Drop**
   - ใช้ `useDragAndDrop` hook
   - เพิ่ม `MultiFilePreview` component
   - ใช้ `useBulkUpload` hook

4. **Integration**
   - เพิ่ม `MessageJumpContext` integration
   - เชื่อมกับ `ConversationDetailsSheet`

---

## Summary

| ด้าน | ของเก่า | chat-v2 | Gap |
|------|---------|---------|-----|
| **Message Display** | VirtualMessageList (1100L) | MessageList (470L) | ✅ ดีกว่า |
| **Message Item** | Embedded (300L) | Separate component | ✅ ดีกว่า |
| **Reply/Edit/Delete** | ✅ ทำงาน | ✅ ทำงานแล้ว | ✅ Done |
| **Upload** | ✅ ครบ | ⚠️ Placeholder | ❌ ต้องเพิ่ม |
| **Drag & Drop** | ✅ ครบ | ❌ ไม่มี | ❌ ต้องเพิ่ม |
| **Jump (full)** | ✅ ครบ (API + scroll) | ⚠️ บางส่วน | ❌ ต้องเพิ่ม |
| **Selection Mode** | ✅ ครบ | ✅ มี (ใน Context) | ✅ OK |
| **Height Cache** | ✅ มี (over-engineered) | ❌ ไม่มี | ✅ ไม่จำเป็น |

**Recommendation:** ย้าย features ทีละตัวไป chat-v2 โดยใช้ hooks/services ที่มีอยู่แล้ว
