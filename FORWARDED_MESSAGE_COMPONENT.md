# ForwardedMessage Component Implementation

**Date:** 2025-01-02
**Status:** ✅ Implemented
**Component:** `src/components/shared/message/ForwardedMessage.tsx`

---

## 🎯 Overview

สร้าง **ForwardedMessage Component** แยกออกมาสำหรับแสดงข้อความที่ถูก forward มา โดยมีรูปแบบคล้ายกับ **ReplyMessage** แต่เน้นแสดง forward metadata

---

## 📦 Components Created

### 1. **ForwardedMessage.tsx**
Path: `src/components/shared/message/ForwardedMessage.tsx`

**Features:**
- ✅ แสดง "Forwarded" badge ด้านบน
- ✅ Border-left accent (คล้าย ReplyMessage)
- ✅ รองรับทุก message types (text, image, file, sticker, album)
- ✅ แสดง original sender info ด้านล่าง
- ✅ แสดง original timestamp
- ✅ Responsive และ accessible

---

## 🎨 UI Design

### Visual Structure

```
┌─────────────────────────────────────┐
│ ✅ Forwarded                        │ ← Header with icon
├─────────────────────────────────────┤
│ │ [Message Content]                 │ ← Left border accent
│ │ - Text / Image / File / Album     │ ← Based on message_type
│ │                                    │
├─────────────────────────────────────┤
│ From: John Doe • 15 Jan 2025        │ ← Original sender info
└─────────────────────────────────────┘
John • 10:30 AM ✓✓                     ← Current message metadata
```

### Color Scheme

**User Messages (right side):**
- Background: `bg-primary`
- Text: `text-primary-foreground`
- Border-left: `border-primary-foreground/50`
- Accent: `border-primary-foreground/20`

**Other Messages (left side):**
- Background: `bg-card`
- Text: `text-card-foreground`
- Border-left: `border-primary/30`
- Accent: `border-border`

---

## 💻 Implementation Details

### Type Definitions

**Added to `message.types.ts`:**

```typescript
export interface ForwardedFromDTO {
  message_id: string;
  sender_id: string;
  sender_name?: string;
  conversation_id: string;
  original_timestamp: string;
}

export interface MessageDTO {
  // ... existing fields

  // ✅ NEW: Forwarded message metadata
  is_forwarded?: boolean;
  forwarded_from?: ForwardedFromDTO;
}
```

### Component Props

```typescript
interface ForwardedMessageProps {
  message: MessageDTO;
  isUser: boolean;
  formatTime: (timestamp: string) => string;
  messageStatus?: string;
  isBusinessView?: boolean;
  isGroupChat?: boolean;
  senderName?: string;
  onImageClick?: (url: string) => void;
}
```

### Rendering Logic

**Check Priority:**
1. ✅ **is_forwarded** (highest priority)
2. message_type (text, image, file, etc.)

**Code in VirtualMessageList.tsx:**
```typescript
const messageContent = useMemo(() => {
  // ✅ Check if this is a forwarded message first
  if (message.is_forwarded) {
    return <ForwardedMessage {...props} />;
  }

  // Then check message_type
  if (message.message_type === 'text') {
    // ...
  }
}, [message, ...]);
```

---

## 🔄 Message Type Support

### Text Message
```typescript
<div className="text-sm whitespace-pre-wrap select-text">
  {linkifiedContent}
</div>
```

### Image Message
```typescript
<div className="mt-2">
  <img
    src={getThumbnailUrl(imageUrl)}
    onClick={() => onImageClick?.(imageUrl)}
    className="w-full max-w-[200px] rounded-lg cursor-pointer"
  />
  {caption && <div className="text-sm mt-2">{caption}</div>}
</div>
```

### File Message
```typescript
<a href={file_url} target="_blank" className="flex items-center gap-2 p-2 rounded border">
  <FileIcon />
  <div>
    <div className="text-sm font-medium">{file_name}</div>
    <div className="text-xs">{fileSize} KB</div>
  </div>
</a>
```

### Sticker Message
```typescript
<img
  src={sticker_url}
  className="w-32 h-32 object-contain"
/>
```

### Album Message
```typescript
<div className="mt-2">
  <div className="text-sm text-muted-foreground">
    📎 Album ({album_files.length} items)
  </div>
  {caption && <div className="text-sm mt-1">{caption}</div>}
</div>
```

---

## 📊 Metadata Display

### Header Section
```typescript
<div className="flex items-center gap-1.5 mb-2 pb-2 border-b">
  <Forward className="w-3.5 h-3.5" />
  <span className="text-xs font-medium">Forwarded</span>
</div>
```

### Footer Section (Original Sender Info)
```typescript
{hasForwardedInfo && (
  <div className="mt-2 pt-2 border-t">
    <div className="text-xs text-muted-foreground">
      From: {forwarded_from.sender_name || 'Unknown'}
      {originalTimestamp && <span> • {originalTimestamp}</span>}
    </div>
  </div>
)}
```

### Message Metadata (Current Sender)
```typescript
<div className="flex items-center mt-1">
  {isGroupChat && !isUser && (
    <span className="text-xs mr-1">{senderName} ·</span>
  )}
  <span className="text-xs">{formatTime(created_at)}</span>
  {isUser && <MessageStatusIndicator status={messageStatus} />}
</div>
```

---

## 🎭 Example Scenarios

### Scenario 1: Forwarded Text Message

**Backend Data:**
```json
{
  "id": "msg-123",
  "message_type": "text",
  "content": "Hello World",
  "is_forwarded": true,
  "forwarded_from": {
    "message_id": "original-msg-456",
    "sender_id": "user-789",
    "sender_name": "Alice",
    "conversation_id": "conv-101",
    "original_timestamp": "2025-01-15T10:30:00Z"
  },
  "sender_id": "user-current",
  "sender_name": "John Doe",
  "created_at": "2025-01-15T11:00:00Z"
}
```

**Rendered UI:**
```
┌─────────────────────────────────┐
│ ✅ Forwarded                    │
├─────────────────────────────────┤
│ │ Hello World                   │
├─────────────────────────────────┤
│ From: Alice • 15 Jan 2025       │
└─────────────────────────────────┘
John Doe • 11:00 AM ✓✓
```

---

### Scenario 2: Forwarded Image with Caption

**Backend Data:**
```json
{
  "message_type": "image",
  "content": "Beautiful sunset!",
  "media_url": "https://...",
  "is_forwarded": true,
  "forwarded_from": {
    "sender_name": "Bob",
    "original_timestamp": "2025-01-14T18:30:00Z"
  }
}
```

**Rendered UI:**
```
┌─────────────────────────────────┐
│ ✅ Forwarded                    │
├─────────────────────────────────┤
│ │ [Sunset Image 200x150]        │
│ │ Beautiful sunset!             │
├─────────────────────────────────┤
│ From: Bob • 14 Jan 2025         │
└─────────────────────────────────┘
John • 11:30 AM ✓
```

---

### Scenario 3: Forwarded Album

**Backend Data:**
```json
{
  "message_type": "album",
  "content": "Trip photos",
  "album_files": [
    { "file_type": "image", "media_url": "..." },
    { "file_type": "image", "media_url": "..." },
    { "file_type": "video", "media_url": "..." }
  ],
  "is_forwarded": true,
  "forwarded_from": {
    "sender_name": "Charlie"
  }
}
```

**Rendered UI:**
```
┌─────────────────────────────────┐
│ ✅ Forwarded                    │
├─────────────────────────────────┤
│ │ 📎 Album (3 items)            │
│ │ Trip photos                   │
├─────────────────────────────────┤
│ From: Charlie • 10 Jan 2025     │
└─────────────────────────────────┘
```

---

## 🧪 Testing Checklist

### Visual Testing
- [ ] **Text Message**
  - [ ] Single line text
  - [ ] Multi-line text
  - [ ] Text with links (linkified)
  - [ ] Text with emojis

- [ ] **Image Message**
  - [ ] Image only
  - [ ] Image with caption
  - [ ] Click to open lightbox

- [ ] **File Message**
  - [ ] File with name and size
  - [ ] Click to download

- [ ] **Sticker Message**
  - [ ] Sticker displays correctly

- [ ] **Album Message**
  - [ ] Album count shows
  - [ ] Caption shows

### Metadata Testing
- [ ] **Forwarded Header**
  - [ ] Icon displays
  - [ ] "Forwarded" text shows

- [ ] **Original Sender Info**
  - [ ] Name displays (if available)
  - [ ] Timestamp displays (if available)
  - [ ] Falls back to "Unknown" if no name

- [ ] **Current Message Info**
  - [ ] Current sender name (group chat)
  - [ ] Timestamp
  - [ ] Status indicator (user messages)

### Styling Testing
- [ ] **User Messages (right)**
  - [ ] Blue background
  - [ ] White text
  - [ ] Border-left accent
  - [ ] Rounded corners (tr-none)

- [ ] **Other Messages (left)**
  - [ ] Card background
  - [ ] Dark text
  - [ ] Border-left accent
  - [ ] Rounded corners (tl-none)

### Interaction Testing
- [ ] **Image Click**
  - [ ] Opens lightbox with full image
  - [ ] Correct image URL passed

- [ ] **File Click**
  - [ ] Opens file in new tab
  - [ ] Download works

- [ ] **Text Selection**
  - [ ] Can select text
  - [ ] Can copy text

---

## 🎨 CSS Styling

### Border-left Accent
```typescript
className={`border-l-2 ${
  isUser
    ? 'border-primary-foreground/50'
    : 'border-primary/30'
} pl-3`}
```

### Header Divider
```typescript
className={`mb-2 pb-2 border-b ${
  isUser
    ? 'border-primary-foreground/20'
    : 'border-border'
}`}
```

### Footer Divider
```typescript
className={`mt-2 pt-2 border-t ${
  isUser
    ? 'border-primary-foreground/20'
    : 'border-border'
}`}
```

---

## 🔧 Files Modified

### 1. **Created:**
- ✅ `src/components/shared/message/ForwardedMessage.tsx`

### 2. **Updated:**
- ✅ `src/components/shared/VirtualMessageList.tsx`
  - Import ForwardedMessage
  - Add is_forwarded check in messageContent

- ✅ `src/types/message.types.ts`
  - Add ForwardedFromDTO interface
  - Add is_forwarded, forwarded_from to MessageDTO

---

## 📈 Performance Considerations

### Memo Usage
```typescript
const linkifiedContent = useMemo(
  () => linkifyText(message.content, '...'),
  [message.content]
);
```

### Conditional Rendering
- Only render forwarded info if `hasForwardedInfo` is true
- Only render caption if `message.content` exists
- Lazy load images with `loading="lazy"`

---

## 🚀 Future Enhancements

### Potential Improvements

1. **Click to Jump to Original:**
   ```typescript
   <div onClick={() => jumpToOriginalMessage(forwarded_from.message_id)}>
     From: {sender_name}
   </div>
   ```

2. **Forward Chain Display:**
   ```typescript
   {forward_count > 1 && (
     <div className="text-xs">
       Forwarded {forward_count} times
     </div>
   )}
   ```

3. **Original Conversation Context:**
   ```typescript
   <div className="text-xs">
     From: {sender_name} in "{conversation_name}"
   </div>
   ```

4. **Inline Preview for Albums:**
   - แสดง thumbnail ขนาดเล็กแทนแค่ text
   ```typescript
   <div className="grid grid-cols-3 gap-1">
     {album_files.slice(0, 3).map(file => (
       <img src={file.media_thumbnail_url} className="w-12 h-12" />
     ))}
   </div>
   ```

---

## ✅ Summary

**Components:**
- ✅ ForwardedMessage component created
- ✅ Type definitions updated
- ✅ VirtualMessageList integration complete

**Features:**
- ✅ Visual distinction (header, border, footer)
- ✅ All message types supported
- ✅ Original sender metadata displayed
- ✅ Responsive design
- ✅ Accessible

**Testing:**
- ⏳ Manual testing needed
- ⏳ Integration testing with real forwarded messages
- ⏳ Edge case testing (missing metadata, etc.)

---

**Created:** 2025-01-02
**Version:** 1.0
**Status:** ✅ Ready for Testing
