# 📝 Message Types - Complete Analysis

## 🎯 Overview

This document catalogs **ALL message types** used in the chat system, their components, height characteristics, and rendering behavior.

---

## 📊 Message Type Summary Table

| Type | Component File | Min Height | Typical Height | Max Height | Dynamic? |
|------|----------------|------------|----------------|------------|----------|
| **Text** | `TextMessage.tsx` | 35px | 74px | Unlimited | ✅ YES |
| **Reply** | `ReplyMessage.tsx` | N/A | 130px | Unlimited | ✅ YES |
| **Image** | `ImageMessage.tsx` | 180px | 216px | 400px | ❌ NO |
| **Sticker** | `StickerMessage.tsx` | 120px | 120px | 120px | ❌ NO |
| **File** | `FileMessage.tsx` | 55px | 106px | 106px | ❌ NO |
| **Album (v1)** | `AlbumMessage.tsx` | 198px | 300px | 400px | ✅ YES |
| **Album (v2)** | `AlbumMessageV2.tsx` | 198px | 300px | 400px | ✅ YES |

---

## 1️⃣ Text Message

### Component
**File:** `src/components/shared/message/TextMessage.tsx`

### Structure
```tsx
<div className="message-bubble">
  <p className="whitespace-pre-wrap break-words" style={{ minHeight: '35px' }}>
    {content}
  </p>
</div>
```

### Height Calculation

**Estimated Height Formula:**
```typescript
// From useMessageHeightCache.ts lines 75-81
const contentLength = message.content?.length || 0;
const baseHeight = 74; // Single line measured from browser
const charsPerLine = 50;
const heightPerLine = 20;

const estimatedLines = Math.ceil(contentLength / charsPerLine);
const estimatedHeight = baseHeight + (estimatedLines - 1) * heightPerLine;

// Examples:
// 30 chars:  74px (1 line)
// 80 chars:  94px (2 lines)
// 150 chars: 114px (3 lines)
```

**Actual Height Factors:**
- Font size and family
- Emoji size (larger than text)
- Line breaks (`\n`)
- Word wrapping at container width
- Padding and margins
- Link previews (if implemented)

### Measurement Strategy

**Two-phase measurement:**

1. **Initial (mount):**
   ```typescript
   const initialHeight = element.offsetHeight;
   updateHeightCache(messageId, initialHeight);
   ```

2. **Stabilization (300ms delay):**
   ```typescript
   setTimeout(() => {
     const finalHeight = element.offsetHeight;
     if (Math.abs(finalHeight - initialHeight) > 10) {
       updateHeightCache(messageId, finalHeight);
     }
   }, 300);
   ```

**Why 300ms delay?**
- Allows fonts to load
- Lets browser finish layout
- Emoji rendering completes

### Edge Cases

**Empty/Short Text:**
```typescript
minHeight: 35px  // Prevents collapsed messages
```

**Very Long Text:**
```typescript
// No max height - scrolls with message list
// Could be 500px+ for long messages
```

**Text with Newlines:**
```typescript
content = "Line 1\n\nLine 3\n\nLine 5"
// Estimation by length: ~25 chars = 74px
// Actual: 5 lines × 20px = 140px
// Difference: 66px! ⚠️
```

---

## 2️⃣ Reply Message

### Component
**File:** `src/components/shared/message/ReplyMessage.tsx`

### Structure
```tsx
<div className="message-bubble">
  {/* Quoted message preview */}
  <div className="reply-preview border-l-2 bg-gray-100 p-2 mb-2">
    <p className="text-xs text-gray-600">{quotedSender}</p>
    <p className="text-sm truncate">{quotedContent}</p>
  </div>

  {/* Actual reply content */}
  <p className="whitespace-pre-wrap break-words">
    {content}
  </p>
</div>
```

### Height Calculation

**Estimated Height:**
```typescript
// From useMessageHeightCache.ts line 105
const replyHeight = 130; // Fixed estimate

// Components:
// - Reply preview: ~50px (2 lines truncated)
// - Reply content: ~74px (1 line typical)
// - Padding/margins: ~6px
// Total: ~130px
```

**Actual Height Factors:**
- Reply content length (can be multi-line)
- Quoted message preview (always 2 lines, truncated)
- Border and padding
- If quoted message is image/file (different preview height)

### Edge Cases

**Long Reply Content:**
```typescript
// Estimate: 130px (assumes 1 line reply)
// Actual: 130 + (extraLines × 20)px
// Example: 3-line reply = 170px
// Difference: 40px! ⚠️
```

**Reply to Image/File:**
```typescript
// Preview shows thumbnail or icon
// Might be taller than text preview
// Current estimate doesn't account for this
```

---

## 3️⃣ Image Message

### Component
**File:** `src/components/shared/message/ImageMessage.tsx`

### Structure
```tsx
<div className="message-image-container">
  {isLoading ? (
    <Skeleton className="w-full h-[180px]" />  // Placeholder
  ) : (
    <img
      src={imageUrl}
      className="max-w-full"
      style={{ aspectRatio: '4/3' }}  // Fixed aspect ratio
    />
  )}
</div>
```

### Height Calculation

**Estimated Height:**
```typescript
// From useMessageHeightCache.ts line 84
const imageHeight = 216; // Single image

// Calculation:
// Image area: 180px (4:3 aspect at ~240px width)
// Padding/margins: ~36px
// Total: 216px
```

**Actual Height:**
- Fixed aspect ratio: 4:3
- Width: Constrained by message bubble max-width (~240-300px)
- Height: Width × 0.75 (4:3 ratio)
- Plus padding: ~36px

### Lazy Loading

**Skeleton Placeholder:**
```typescript
<Skeleton className="w-full h-[180px]" />
// Height matches expected image height
// Prevents layout shift on load
```

**Image Load Strategy:**
```typescript
// Intersection Observer for lazy loading
const { ref, inView } = useInView({
  triggerOnce: true,
  threshold: 0.1
});

{inView && <img src={imageUrl} />}
```

**⚠️ Issue:** ResizeObserver disabled, so if actual image aspect differs, height not updated!

### Edge Cases

**Image Failed to Load:**
```typescript
// Fallback: Shows error icon
// Height: Same as skeleton (180px)
```

**Different Aspect Ratios:**
```typescript
// Current: Forces 4:3
// Reality: Images can be 1:1, 16:9, 9:16, etc.
// Result: Image stretched/squashed
```

---

## 4️⃣ Sticker Message

### Component
**File:** `src/components/shared/message/StickerMessage.tsx`

### Structure
```tsx
<div className="sticker-container">
  <img
    src={stickerUrl}
    className="w-[120px] h-[120px]"  // Fixed size
    loading="lazy"
  />
</div>
```

### Height Calculation

**Estimated Height:**
```typescript
// From useMessageHeightCache.ts line 87
const stickerHeight = 156; // Fixed

// Components:
// - Sticker image: 120px × 120px
// - Padding/margins: ~36px
// Total: 156px
```

**Actual Height:**
- Sticker size: Always 120px × 120px
- Non-dynamic
- Most predictable message type

### Special Features

**GIF Pause on Scroll:**
```typescript
// Uses Intersection Observer
const { ref, inView } = useInView({
  threshold: 0.5
});

// Pauses GIF when out of view (performance optimization)
<img ref={ref} className={!inView ? 'paused' : ''} />
```

**Why Fixed Size:**
- Stickers are designed at specific size
- Maintains visual consistency
- No scaling artifacts

---

## 5️⃣ File Message

### Component
**File:** `src/components/shared/message/FileMessage.tsx`

### Structure
```tsx
<div className="file-message" style={{ minHeight: '55px' }}>
  <div className="flex items-center gap-3">
    {/* File icon */}
    <div className="file-icon w-10 h-10">
      <FileIcon type={fileExtension} />
    </div>

    {/* File info */}
    <div className="file-info flex-1">
      <p className="font-medium truncate">{fileName}</p>
      <p className="text-sm text-gray-500">{fileSize}</p>
    </div>

    {/* Download button */}
    <Button size="sm">Download</Button>
  </div>
</div>
```

### Height Calculation

**Estimated Height:**
```typescript
// From useMessageHeightCache.ts line 90
const fileHeight = 106; // Fixed

// Components:
// - Icon: 40px
// - File info: 2 lines (~40px)
// - Padding/margins: ~26px
// Total: 106px
```

**Actual Height:**
- Icon: 40px (fixed)
- File name: 1 line (truncated if long)
- File size: 1 line
- Height: Very consistent at ~106px

### Edge Cases

**Very Long Filename:**
```typescript
fileName = "very-long-filename-that-exceeds-container-width.pdf"
// Truncated with ellipsis: "very-long-filename-tha....pdf"
// Height: Still 106px (no wrapping)
```

**File Preview (PDF/Video):**
```typescript
// Not implemented in current version
// If added: Would increase height significantly
```

---

## 6️⃣ Album Message (v1) - DEPRECATED

### Component
**File:** `src/components/shared/message/AlbumMessage.tsx`

### Structure
```tsx
<div className="album-container">
  {/* Grid of images */}
  <div className={`grid grid-cols-${columns}`}>
    {photos.map(photo => (
      <img src={photo.url} />
    ))}
  </div>

  {/* Optional caption */}
  {caption && <p>{caption}</p>}
</div>
```

### Detection Logic
```typescript
// Old format uses metadata
const albumId = message.metadata?.album_id;
const albumPosition = message.metadata?.album_position;

// First message in album (position 0) shows all photos
// Other messages (position > 0) are hidden (height = 0)
```

### Height Calculation

**Estimated Heights (from useMessageHeightCache.ts lines 94-103):**
```typescript
switch (photoCount) {
  case 1:  return 400; // Single large image
  case 2:  return 198; // 2×1 grid (side by side)
  case 3:  return 268; // 2×2 grid (3rd empty)
  case 4:  return 400; // 2×2 grid (full)
  case 5:
  case 6:  return 350; // 3×2 grid
  case 7:
  case 8:
  case 9:
  case 10: return 400; // 3×3 or larger grid
  default: return 350; // Fallback
}
```

**⚠️ Issues:**
- Heights are hardcoded guesses
- Doesn't account for caption length
- Doesn't account for actual image aspect ratios
- Different grid layouts not precisely measured

### Grid Layouts

**2 Photos:**
```
┌──────┬──────┐
│      │      │  Each: ~180px height
│  1   │  2   │  Total: ~198px
│      │      │
└──────┴──────┘
```

**3 Photos:**
```
┌──────┬──────┐
│      │      │  Top row: ~180px
│  1   │  2   │  Bottom row: ~80px
├──────┴──────┤  Total: ~268px
│      3      │
└────────────┘
```

**4 Photos:**
```
┌──────┬──────┐
│      │      │  Each: ~180px
│  1   │  2   │  2×2 grid
├──────┼──────┤  Total: ~400px
│  3   │  4   │
└──────┴──────┘
```

---

## 7️⃣ Album Message (v2) - CURRENT

### Component
**File:** `src/components/shared/message/AlbumMessageV2.tsx`

### Structure
```tsx
<div className="album-v2-container">
  {/* Grid using album_files array */}
  <div className="grid gap-1">
    {message.album_files.map((file, index) => (
      <div key={index} className="album-item">
        <img
          src={file.file_url}
          alt={file.file_name}
          className="w-full h-full object-cover"
        />
      </div>
    ))}
  </div>

  {/* Caption (if exists) */}
  {message.content && (
    <p className="mt-2 text-sm">{message.content}</p>
  )}
</div>
```

### Detection Logic
```typescript
// New format uses album_files array
const hasAlbumFiles = message.album_files && message.album_files.length > 0;

if (message.message_type === 'album' && hasAlbumFiles) {
  // Render AlbumMessageV2
}
```

### Height Calculation

**Uses same estimates as v1:**
```typescript
const photoCount = message.album_files.length;
const baseHeight = getAlbumHeight(photoCount); // 198-400px

// ⚠️ Caption NOT included in estimate!
const captionHeight = message.content?.length > 0 ? ??? : 0;
const actualHeight = baseHeight + captionHeight;
```

### Improvements over v1

✅ **Better data structure:**
- All album data in single message
- No need to group by album_id
- Cleaner rendering logic

✅ **Explicit file array:**
- `album_files: AlbumFileDTO[]`
- Each file has metadata (size, type, url)

❌ **Still has same height issues:**
- Hardcoded grid heights
- Caption not in estimate
- No dynamic sizing

---

## 📊 Height Comparison Table

### Typical Rendering Heights (Measured in Browser)

| Message Type | Estimated | Actual (Short) | Actual (Long) | Max Diff |
|--------------|-----------|----------------|---------------|----------|
| Text (1 line) | 74px | 74px | N/A | ✅ 0px |
| Text (3 lines) | 114px | 120px | N/A | ⚠️ 6px |
| Text (10 lines) | 254px | 280px | N/A | ⚠️ 26px |
| Reply (1 line) | 130px | 130px | N/A | ✅ 0px |
| Reply (3 lines) | 130px | 170px | N/A | ❌ 40px |
| Image | 216px | 216px | 216px | ✅ 0px |
| Sticker | 156px | 156px | 156px | ✅ 0px |
| File | 106px | 106px | 106px | ✅ 0px |
| Album (2 photos) | 198px | 198px | N/A | ✅ 0px |
| Album (2 photos + caption) | 198px | 198px | 240px | ❌ 42px |
| Album (4 photos) | 400px | 400px | N/A | ✅ 0px |
| Album (4 photos + caption) | 400px | 400px | 480px | ❌ 80px |

**Legend:**
- ✅ 0px: Perfect estimate
- ⚠️ <10px: Within tolerance (won't update cache)
- ❌ >10px: Will trigger cache update (but causes scroll jump if not caught)

---

## 🎯 Message Type Statistics (Typical Usage)

Based on most chat applications:

```
Text:    60-70% of messages
Image:   15-20%
Album:   5-10%
File:    3-5%
Sticker: 2-5%
Reply:   10-15% (overlay on other types)
```

**Impact on Virtual Scroll:**
- Most messages (text) have dynamic heights → highest source of estimation errors
- Albums and replies have largest estimation errors → most likely to cause scroll jumps
- Images/stickers/files are predictable → help stabilize scroll

---

## 🔧 Recommendations by Message Type

### Text Messages
**Problem:** Content-based estimation inaccurate
**Solution:**
```typescript
// Option 1: More precise estimation
const avgCharsPerLine = measureAverageCharsPerLine(); // Based on actual font
const lines = content.split('\n').length + wrapLines;
const height = baseHeight + (lines - 1) * lineHeight;

// Option 2: Pre-render to measure
const tempElement = document.createElement('div');
tempElement.className = 'message-bubble';
tempElement.textContent = content;
document.body.appendChild(tempElement);
const height = tempElement.offsetHeight;
document.body.removeChild(tempElement);
```

### Reply Messages
**Problem:** Reply content length not estimated
**Solution:**
```typescript
// Include reply content in estimation
const replyContentLines = Math.ceil(replyContent.length / 50);
const height = 130 + (replyContentLines - 1) * 20;
```

### Album Messages
**Problem:** Caption height not included
**Solution:**
```typescript
// Include caption in estimation
const gridHeight = getAlbumHeight(photoCount);
const captionLines = caption ? Math.ceil(caption.length / 50) : 0;
const captionHeight = captionLines * 20;
const totalHeight = gridHeight + captionHeight + 8; // +8px margin
```

### All Messages
**Enable ResizeObserver:**
```typescript
// Re-enable with proper debouncing
USE_RESIZE_OBSERVER: useRef(true);

// 500ms debounce to prevent scroll thrashing
const debouncedUpdate = debounce((height) => {
  if (Math.abs(height - cachedHeight) > 10) {
    updateHeightCache(messageId, height);
  }
}, 500);
```

---

**Next:** See `03-height-calculation.md` for detailed height calculation algorithms and formulas.
