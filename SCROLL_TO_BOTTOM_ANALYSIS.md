# Scroll to Bottom Analysis

## Problem
เมื่อมี message type หลายแบบในการสนทนา (text, image, video, album, sticker, file, system) การ scroll to bottom บางครั้งไม่ลงไปสุด

## Root Cause Analysis

### 1. Variable Height Items - สาเหตุหลัก

| Message Type | Height Behavior | Issue |
|-------------|-----------------|-------|
| **TextMessage** | Dynamic (ขึ้นกับ content length) | Height ไม่แน่นอน |
| **ImageMessage** | Fixed `200px` | Stable แต่ image load async |
| **VideoMessage** | Dynamic (aspect ratio, max 320x320) | คำนวณจาก metadata |
| **AlbumMessage** | Dynamic (N × 200px + gaps + caption) | รวมหลาย items |
| **StickerMessage** | Fixed `120px` + time below | ค่อนข้าง stable |
| **FileMessage** | Fixed ~70px | Stable |
| **SystemMessage** | Dynamic (text wrap) | ขึ้นกับ content |

### 2. Async Content Loading

```
Timeline:
1. Message added to list → Virtuoso calculates height with placeholder
2. Image/Video starts loading → Height = 0 or placeholder
3. Content loads → Height changes → Total height changes
4. Scroll position may be incorrect
```

**Image/Video Loading Flow:**
```tsx
// ImageMessage.tsx - line 60-61
const [loaded, setLoaded] = useState(false);
// Image shows skeleton until loaded
// When loaded, may cause layout shift
```

### 3. Virtuoso Configuration Analysis

```tsx
// MessageList.tsx - line 420-446
<Virtuoso
  defaultItemHeight={40}        // ❌ Too small for most items
  increaseViewportBy={{ top: 500, bottom: 200 }}
  overscan={200}
  atBottomThreshold={50}        // ✅ OK
  followOutput={(isAtBottom) => {
    return isAtBottom || shouldStickToBottomRef.current ? 'auto' : false;
  }}
/>
```

**Issues:**
- `defaultItemHeight={40}` - ค่าเริ่มต้น 40px ซึ่งน้อยกว่า actual height ของ message types ส่วนใหญ่
- เมื่อ Virtuoso estimate height ผิด จะทำให้ scroll position คำนวณผิด

### 4. Height Change Handler

```tsx
// MessageList.tsx - line 261-276
const handleHeightChanged = useCallback((height: number) => {
  if (pendingScrollToBottomRef.current && virtuosoRef.current) {
    pendingScrollToBottomRef.current = false;
    setTimeout(() => {
      virtuosoRef.current?.scrollTo({
        top: Number.MAX_SAFE_INTEGER,
        behavior: 'auto',
      });
    }, 0);  // ❌ setTimeout(0) อาจ trigger ก่อน DOM update เสร็จ
  }
}, []);
```

## Specific Issues by Message Type

### Image/Video Messages
- **Problem:** ใช้ `lazy loading` (`loading="lazy"`) ทำให้ height ไม่พร้อมทันที
- **Skeleton:** แสดง placeholder แต่ actual image อาจมี height ต่างกัน

### Album Messages
- **Problem:** หลาย images stacked = cumulative height error
- **Each item:** 200px + gap
- **With caption:** เพิ่ม bubble อีก

### Sticker Messages
- **Problem:** Fixed size แต่มี time below ที่ dynamic

### Text Messages
- **Problem:** Variable length + emoji-only mode (48px vs bubble)

## Solutions

### Option 1: Better Default Item Height (Quick Fix)

```tsx
// เปลี่ยน defaultItemHeight ให้ใกล้เคียงกับ average message height
<Virtuoso
  defaultItemHeight={80}  // ปรับจาก 40 เป็น 80
  // ...
/>
```

### Option 2: Fixed Height for Media Messages

```tsx
// ทุก media message ใช้ fixed container height
const MEDIA_HEIGHT = 200;  // Already done for Image/Album
const VIDEO_FIXED_HEIGHT = 200;  // ปรับ Video ให้เป็น fixed เหมือน Image
```

### Option 3: Use itemSize callback

```tsx
<Virtuoso
  itemSize={(el) => el.getBoundingClientRect().height}
  // or
  estimateSize={(index) => {
    const item = listItems[index];
    if (item.type === 'date-separator') return 40;
    if (item.message?.message_type === 'text') return 60;
    if (item.message?.message_type === 'image') return 220;
    if (item.message?.message_type === 'video') return 220;
    if (item.message?.message_type === 'album') return 250;
    if (item.message?.message_type === 'sticker') return 150;
    if (item.message?.message_type === 'file') return 90;
    if (item.message?.message_type === 'system') return 50;
    return 80;
  }}
/>
```

### Option 4: Multiple Scroll Attempts (Reliable)

```tsx
const handleHeightChanged = useCallback((height: number) => {
  if (pendingScrollToBottomRef.current && virtuosoRef.current) {
    pendingScrollToBottomRef.current = false;

    // Multiple attempts with increasing delays
    [0, 50, 150, 300].forEach(delay => {
      setTimeout(() => {
        virtuosoRef.current?.scrollTo({
          top: Number.MAX_SAFE_INTEGER,
          behavior: 'auto',
        });
      }, delay);
    });
  }
}, []);
```

### Option 5: Use autoscrollToBottom (Virtuoso native)

```tsx
<Virtuoso
  followOutput="smooth"  // Always follow new items
  // or
  followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
/>
```

## Recommended Solution

### Immediate Fix (Low Risk)

1. **ปรับ `defaultItemHeight`** จาก 40 เป็น 100:
```tsx
defaultItemHeight={100}
```

2. **เพิ่ม scroll attempts หลายครั้ง:**
```tsx
const scrollToBottomWithRetry = useCallback((smooth = true) => {
  if (!virtuosoRef.current) return;

  const doScroll = () => {
    virtuosoRef.current?.scrollTo({
      top: Number.MAX_SAFE_INTEGER,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  // Multiple attempts
  doScroll();
  setTimeout(doScroll, 50);
  setTimeout(doScroll, 200);
}, []);
```

### Long-term Fix (More Work)

1. **Standardize message heights** - ทำให้ทุก message type มี predictable height
2. **Implement `estimateSize`** - ให้ Virtuoso คำนวณ height ได้แม่นยำขึ้น
3. **Pre-calculate heights** - คำนวณ height ก่อน render

## Message Type Height Summary

| Type | Current Height | Recommended |
|------|---------------|-------------|
| text | 40-200px (variable) | Keep variable |
| image | 200px fixed | ✅ Good |
| video | Variable (aspect ratio) | Fixed 200px |
| album | N×200px + gaps | Keep, but estimate |
| sticker | 120px + time (~150px) | ✅ Good |
| file | ~70-80px | ✅ Good |
| system | ~40-50px | ✅ Good |
| date-separator | ~40px | ✅ Good |

## Testing Checklist

- [ ] Send text message → scroll to bottom
- [ ] Send image → scroll to bottom
- [ ] Send video → scroll to bottom
- [ ] Send album (3+ images) → scroll to bottom
- [ ] Send sticker → scroll to bottom
- [ ] Send file → scroll to bottom
- [ ] Mixed types in quick succession
- [ ] Load conversation with mixed types
