# 📐 Height Calculation System - Deep Dive

## 🎯 Overview

This document analyzes the complete height calculation and caching system, including estimation algorithms, measurement strategies, and cache management.

---

## 🏗️ System Architecture

### Core Components

```
useMessageHeightCache (Hook)
├── estimateMessageHeight()    - Initial height estimation
├── updateHeightCache()         - Cache update function
├── heightCache (Ref)           - Map<messageId, height>
└── Configuration flags
    ├── USE_HEIGHT_CACHE        - Enable caching (true)
    └── USE_RESIZE_OBSERVER     - Enable dynamic tracking (false ⚠️)

MessageItem (Component)
├── Initial measurement (on mount)
├── Stabilization timer (300ms for text)
├── ResizeObserver (if enabled)
└── Cache update logic

VirtualMessageList (Component)
└── itemSize={(el, index) => ...}
    ├── Check album format
    ├── Try cache first
    └── Fallback to estimate
```

---

## 📊 Height Estimation Algorithms

### Function: `estimateMessageHeight(message)`

**File:** `src/hooks/useMessageHeightCache.ts` (lines 56-111)

### Algorithm Flowchart

```
estimateMessageHeight(message)
  ↓
  ┌─ message_type?
  │
  ├─ 'text'
  │   ├─ Has content?
  │   │   ├─ YES → Calculate by length
  │   │   │   contentLength = message.content.length
  │   │   │   lines = Math.ceil(contentLength / 50)
  │   │   │   height = 74 + (lines - 1) × 20
  │   │   └─ NO → Default 74px
  │   └─ Return height
  │
  ├─ 'image'
  │   └─ Return 216px (fixed)
  │
  ├─ 'sticker'
  │   └─ Return 156px (fixed)
  │
  ├─ 'file'
  │   └─ Return 106px (fixed)
  │
  ├─ 'reply'
  │   └─ Return 130px (estimated)
  │
  ├─ 'album'
  │   ├─ Get photo count
  │   └─ Switch (photoCount)
  │       ├─ 1  → 400px
  │       ├─ 2  → 198px
  │       ├─ 3  → 268px
  │       ├─ 4  → 400px
  │       ├─ 5-6 → 350px
  │       └─ 7+ → 400px
  │
  └─ default → 100px (fallback)
```

---

## 🔢 Detailed Estimation Formulas

### 1. Text Messages

**Formula:**
```typescript
const contentLength = message.content?.length || 0;
const estimatedLines = Math.ceil(contentLength / CHARS_PER_LINE);
const estimatedHeight = BASE_HEIGHT + (estimatedLines - 1) * LINE_HEIGHT;

// Constants
const BASE_HEIGHT = 74;      // Single line height (measured)
const CHARS_PER_LINE = 50;   // Average characters that fit in one line
const LINE_HEIGHT = 20;      // Additional height per extra line
```

**Examples:**

| Content Length | Lines | Calculation | Estimated | Typical Actual |
|----------------|-------|-------------|-----------|----------------|
| 20 chars | 1 | 74 + 0×20 | 74px | 74px ✅ |
| 75 chars | 2 | 74 + 1×20 | 94px | 94-100px ⚠️ |
| 150 chars | 3 | 74 + 2×20 | 114px | 114-125px ⚠️ |
| 500 chars | 10 | 74 + 9×20 | 254px | 260-290px ⚠️ |

**Accuracy Issues:**

```typescript
// Issue #1: Fixed CHARS_PER_LINE doesn't account for:
- Font family (monospace vs proportional)
- Font size (14px vs 16px)
- Container width (mobile vs desktop)
- Emoji (counts as 1 char but displays wider)
- CJK characters (Chinese/Japanese/Korean - wider)

// Issue #2: Doesn't detect manual line breaks
content = "Line 1\n\nLine 3"  // 15 chars
estimatedLines = Math.ceil(15 / 50) = 1  // ❌ Wrong!
actualLines = 3                           // ✅ Correct
```

**Code Location:**
```typescript
// src/hooks/useMessageHeightCache.ts lines 75-81
if (message.message_type === 'text' && message.content) {
  const contentLength = message.content.length;
  const estimatedLines = Math.ceil(contentLength / 50);
  const estimatedHeight = 74 + (estimatedLines - 1) * 20;
  return Math.max(estimatedHeight, 74); // Min 74px
}
return 74; // Default text height
```

---

### 2. Image Messages

**Formula:**
```typescript
const IMAGE_HEIGHT = 216; // Fixed
// Components:
// - Image area: 180px (aspect 4:3, ~240px width)
// - Padding/margins: 36px
```

**Accuracy:** ✅ **Very Good** (fixed aspect ratio)

**Code Location:**
```typescript
// src/hooks/useMessageHeightCache.ts line 84
if (message.message_type === 'image') {
  return 216;
}
```

---

### 3. Sticker Messages

**Formula:**
```typescript
const STICKER_HEIGHT = 156; // Fixed
// Components:
// - Sticker: 120px × 120px
// - Padding/margins: 36px
```

**Accuracy:** ✅ **Perfect** (always same size)

**Code Location:**
```typescript
// src/hooks/useMessageHeightCache.ts line 87
if (message.message_type === 'sticker') {
  return 156;
}
```

---

### 4. File Messages

**Formula:**
```typescript
const FILE_HEIGHT = 106; // Fixed
// Components:
// - Icon: 40px
// - File info (2 lines): 40px
// - Padding/margins: 26px
```

**Accuracy:** ✅ **Excellent** (very consistent)

**Code Location:**
```typescript
// src/hooks/useMessageHeightCache.ts line 90
if (message.message_type === 'file') {
  return 106;
}
```

---

### 5. Reply Messages

**Formula:**
```typescript
const REPLY_HEIGHT = 130; // Estimated
// Components:
// - Reply preview: 50px (2 lines, truncated)
// - Reply content: 74px (assumes 1 line)
// - Padding/margins: 6px
```

**Accuracy:** ⚠️ **Fair** (assumes 1-line reply content)

**Issues:**
```typescript
// Doesn't account for multi-line reply content
replyContent = "This is a very long reply message that will wrap to multiple lines"

// Estimated: 130px (assumes 1 line)
// Actual: 130 + (extraLines × 20) = 170px+
// Error: 40+ px ❌
```

**Code Location:**
```typescript
// src/hooks/useMessageHeightCache.ts line 105
if (message.message_type === 'reply') {
  return 130; // Fixed estimate
}
```

---

### 6. Album Messages

**Formula:**
```typescript
function getAlbumHeight(photoCount: number): number {
  switch (photoCount) {
    case 1:  return 400; // 1×1 large
    case 2:  return 198; // 2×1 horizontal
    case 3:  return 268; // 2×2 with 1 empty
    case 4:  return 400; // 2×2 full
    case 5:
    case 6:  return 350; // 3×2 grid
    case 7:
    case 8:
    case 9:
    case 10: return 400; // 3×3+ grid
    default: return 350; // Fallback
  }
}
```

**Accuracy:** ⚠️ **Fair** (doesn't include caption)

**Grid Layout Details:**

**1 Photo:**
```
┌────────────────┐
│                │
│                │  400px × 400px (large display)
│                │
│                │
└────────────────┘
Total: 400px
```

**2 Photos:**
```
┌────────┬────────┐
│        │        │
│   1    │   2    │  Each: 180px height
│        │        │
└────────┴────────┘
Total: 198px (180 + 18 padding)
```

**3 Photos:**
```
┌────────┬────────┐
│        │        │  Top: 180px each
│   1    │   2    │
├────────┴────────┤
│       3         │  Bottom: 80px
└────────────────┘
Total: 268px
```

**4 Photos:**
```
┌────────┬────────┐
│   1    │   2    │  Each: 180px
├────────┼────────┤
│   3    │   4    │
└────────┴────────┘
Total: 400px (180×2 + 40 gap)
```

**Issues:**
```typescript
// Issue #1: Caption not included
album.content = "This is a long caption describing the photos"

// Estimated: 400px (grid only)
// Actual: 400 + captionHeight (40-100px)
// Error: 40-100px ❌

// Issue #2: Photo aspect ratios vary
// Grid assumes square/landscape photos
// Portrait photos might render differently
```

**Code Location:**
```typescript
// src/hooks/useMessageHeightCache.ts lines 94-103
const photoCount = message.album_files?.length ||
                   message.metadata?.album_size || 1;

switch (photoCount) {
  case 1: return 400;
  case 2: return 198;
  case 3: return 268;
  case 4: return 400;
  case 5:
  case 6: return 350;
  default: return 400;
}
```

---

## 💾 Height Cache Management

### Cache Structure

```typescript
// src/hooks/useMessageHeightCache.ts line 7
const heightCache = useRef<Map<string, number>>(new Map());

// Structure:
// Map<messageId: string, height: number>
// Example:
{
  "msg-123": 106,   // File message
  "msg-124": 216,   // Image message
  "msg-125": 94,    // Short text message
  "msg-126": 254,   // Long text message
}
```

### Cache Operations

#### 1. Read from Cache

**Location:** `VirtualMessageList.tsx` lines 438-480

```typescript
itemSize={(el, index) => {
  const message = deduplicatedMessages[index];

  // Try cache first
  if (USE_HEIGHT_CACHE.current && message.id) {
    const cachedHeight = heightCache.current.get(message.id);
    if (cachedHeight) {
      cacheHits.current++;
      return cachedHeight;  // ✅ Cache hit
    }
    cacheMisses.current++;  // ❌ Cache miss
  }

  // Fallback to estimate
  return estimateMessageHeight(message);
}}
```

#### 2. Write to Cache

**Location:** `MessageItem.tsx` lines 171-248

```typescript
const updateHeightCache = useCallback((messageId: string, height: number) => {
  if (!USE_HEIGHT_CACHE.current || !messageId) return;

  const cachedHeight = heightCache.current.get(messageId);

  // Only update if difference > 10px
  if (!cachedHeight || Math.abs(cachedHeight - height) > 10) {
    heightCache.current.set(messageId, height);

    // Warn if estimate was significantly off
    if (cachedHeight && Math.abs(cachedHeight - height) > 5) {
      console.warn(
        `[HeightCache] Significant height change for ${messageId}: ` +
        `${cachedHeight}px → ${height}px (diff: ${Math.abs(cachedHeight - height)}px)`
      );
    }
  }
}, []);
```

#### 3. Cache Invalidation

**Never invalidated!** Cache persists for entire session.

**Potential Issue:**
```typescript
// If message is edited and height changes
message.content = "Short"  // Cached: 74px
// User edits to long message
message.content = "Very long message that spans multiple lines..."

// Cache still returns 74px! ❌
// Should invalidate on edit
```

---

## 📏 Height Measurement Strategy

### Two-Phase Measurement

**File:** `src/components/shared/VirtualMessageList/MessageItem.tsx` lines 171-248

#### Phase 1: Initial Measurement (On Mount)

```typescript
useLayoutEffect(() => {
  if (!messageRef.current || !message?.id) return;

  const element = messageRef.current;
  const initialHeight = element.offsetHeight;

  console.log(
    `[MessageItem] INITIAL ${message.message_type} ` +
    `estimated=${estimatedHeight}px → actual=${initialHeight}px ` +
    `(diff: ${Math.abs(initialHeight - estimatedHeight)}px)`
  );

  updateHeightCache(message.id, initialHeight);

  // ... Phase 2 below
}, [message?.id]);
```

**Why `useLayoutEffect`?**
- Runs synchronously after DOM mutations
- Gets accurate height before browser paint
- Prevents flash of incorrect size

#### Phase 2: Stabilization (Delayed Re-measurement)

**For Text Messages (300ms delay):**
```typescript
// Text messages: Wait for fonts/layout to stabilize
if (message.message_type === 'text') {
  const timer = setTimeout(() => {
    const finalHeight = element.offsetHeight;

    if (Math.abs(finalHeight - initialHeight) > 10) {
      console.log(
        `[MessageItem] STABILIZED text ` +
        `${initialHeight}px → ${finalHeight}px ` +
        `(diff: ${Math.abs(finalHeight - initialHeight)}px)`
      );
      updateHeightCache(message.id, finalHeight);
    }
  }, 300);

  return () => clearTimeout(timer);
}
```

**Why 300ms?**
- Allows web fonts to load
- Browser completes layout calculations
- Emoji rendering finishes

**For Media Messages (ResizeObserver):**
```typescript
// Images/Stickers: Use ResizeObserver (if enabled)
if (USE_RESIZE_OBSERVER.current &&
    (message.message_type === 'image' || message.message_type === 'sticker')) {

  const resizeObserver = new ResizeObserver(
    debounce((entries) => {
      const entry = entries[0];
      const newHeight = entry.contentRect.height;

      if (Math.abs(newHeight - initialHeight) > 10) {
        updateHeightCache(message.id, newHeight);
      }
    }, 150) // Debounce 150ms
  );

  resizeObserver.observe(element);
  return () => resizeObserver.disconnect();
}
```

**⚠️ Current Status:** ResizeObserver is **DISABLED**
```typescript
// src/hooks/useMessageHeightCache.ts line 9
USE_RESIZE_OBSERVER: useRef(false)
// Comment: "DISABLE to test if it causes scroll jump"
```

---

## 📊 Cache Performance Metrics

### Tracking Statistics

**File:** `src/hooks/useMessageHeightCache.ts` lines 22-48

```typescript
// Counters
const cacheHits = useRef(0);
const cacheMisses = useRef(0);
const queryCount = useRef(0);

// Log every 50 queries
queryCount.current++;
if (queryCount.current % 50 === 0) {
  const total = cacheHits.current + cacheMisses.current;
  const hitRate = (cacheHits.current / total * 100).toFixed(1);

  console.log(
    `[HeightCache] Real-time: ${cacheHits.current}/${total} hits ` +
    `(${hitRate}% hit rate) | Cache: ${heightCache.current.size} msgs`
  );
}

// Final stats on unmount
useEffect(() => {
  return () => {
    const total = cacheHits.current + cacheMisses.current;
    const hitRate = (cacheHits.current / total * 100).toFixed(1);

    console.log(
      `[HeightCache] Final: ${cacheHits.current}/${total} hits (${hitRate}% hit rate)`
    );
    console.log(
      `[HeightCache] Cache size: ${heightCache.current.size} messages`
    );
  };
}, []);
```

### Typical Performance

**Expected Metrics:**
```
Initial load (50 messages):
- Cache hits: 0 (nothing cached yet)
- Cache misses: 50
- Hit rate: 0%

After scrolling through 200 messages:
- Cache hits: 180 (revisiting cached messages)
- Cache misses: 70 (new messages)
- Hit rate: 72%

After full conversation scan (500 messages):
- Cache hits: 427
- Cache misses: 73
- Hit rate: 85-95% ✅
```

---

## 🎯 Update Threshold Logic

### When Cache Updates

**Threshold:** 10px difference

```typescript
const UPDATE_THRESHOLD = 10; // Hardcoded in logic

if (!cachedHeight || Math.abs(cachedHeight - height) > UPDATE_THRESHOLD) {
  heightCache.current.set(messageId, height);
}
```

**Why 10px?**
- **Pros:**
  - Prevents constant updates for tiny layout shifts
  - Reduces cache churn
  - Avoids scroll jump from minor changes

- **Cons:**
  - Accumulates small errors
  - 5-9px differences ignored (but warned)
  - Can cause noticeable shifts with many messages

### Warning Threshold

**Threshold:** 5px difference

```typescript
const WARNING_THRESHOLD = 5;

if (cachedHeight && Math.abs(cachedHeight - height) > WARNING_THRESHOLD) {
  console.warn(
    `[HeightCache] Significant height change: ` +
    `${cachedHeight}px → ${height}px (diff: ${diff}px)`
  );
}
```

**Example Warnings:**
```
[HeightCache] Significant height change for msg-123: 74px → 80px (diff: 6px)
[HeightCache] Significant height change for msg-456: 130px → 145px (diff: 15px)
```

**What this means:**
- 5-9px difference: Warned but not updated (under 10px threshold)
- 10+ px difference: Warned AND updated

---

## 🐛 Known Issues & Edge Cases

### Issue #1: ResizeObserver Disabled

**Impact:** Height changes after initial measurement not tracked

**Example:**
```typescript
// Image message with skeleton
<Skeleton height={180} />  // Initial: 180px

// Image loads
<img src={...} />          // Actual: 216px

// Difference: 36px
// ❌ Not detected (ResizeObserver disabled)
// ❌ Cached height stays 180px
// ❌ Scroll position shifts when scrolling past
```

**Solution:** Re-enable with proper debouncing

---

### Issue #2: Text Estimation by Length

**Impact:** Inaccurate for emoji, CJK characters, manual line breaks

**Example:**
```typescript
// Emoji-heavy message
content = "😀😁😂🤣😃😄😅😆😉😊" // 10 chars

// Estimated: 74px (1 line, 10 chars < 50)
// Actual: 94px (emoji render larger, wraps to 2 lines)
// Error: 20px ❌

// Manual line breaks
content = "Line 1\nLine 2\nLine 3" // 21 chars

// Estimated: 74px (1 line, 21 chars < 50)
// Actual: 114px (3 lines)
// Error: 40px ❌
```

**Solution:** Parse line breaks, measure emoji width

---

### Issue #3: Album Caption Ignored

**Impact:** Large height error for albums with long captions

**Example:**
```typescript
album.album_files = [photo1, photo2, photo3, photo4] // 4 photos
album.content = "Had an amazing time at the beach today with family! The weather was perfect and we built the coolest sandcastles. Can't wait to go back next summer!"

// Estimated: 400px (4-photo grid only)
// Actual: 480px (400px grid + 80px caption)
// Error: 80px ❌
```

**Solution:** Include caption in estimation

---

### Issue #4: Reply Content Not Estimated

**Impact:** Multi-line replies cause height mismatch

**Example:**
```typescript
reply.content = "I completely agree with your point about the importance of testing. We should definitely add more unit tests and integration tests to cover all edge cases."

// Estimated: 130px (assumes 1-line reply)
// Actual: 190px (4-line reply)
// Error: 60px ❌
```

**Solution:** Estimate reply content lines

---

## 📈 Improvement Recommendations

### Priority 1: Re-enable ResizeObserver

```typescript
// src/hooks/useMessageHeightCache.ts
USE_RESIZE_OBSERVER: useRef(true) // Change from false

// Add proper debouncing
const DEBOUNCE_DELAY = 500; // Increase from 150ms

// Only update if significant change
const MIN_CHANGE = 15; // Increase from 10px for ResizeObserver
```

### Priority 2: Improve Text Estimation

```typescript
function estimateTextHeight(content: string): number {
  // Count manual line breaks
  const manualLines = (content.match(/\n/g) || []).length + 1;

  // Estimate wrapped lines (more conservative)
  const charsPerLine = measureActualCharsPerLine(); // Dynamic measurement
  const totalChars = content.length;
  const wrappedLines = Math.ceil(totalChars / charsPerLine);

  // Use larger of the two
  const estimatedLines = Math.max(manualLines, wrappedLines);

  return 74 + (estimatedLines - 1) * 20;
}
```

### Priority 3: Include Caption Heights

```typescript
function estimateAlbumHeight(message: MessageDTO): number {
  const photoCount = message.album_files?.length || 1;
  const gridHeight = getAlbumHeight(photoCount);

  // Add caption height
  const caption = message.content || '';
  const captionLines = caption ? Math.ceil(caption.length / 50) : 0;
  const captionHeight = captionLines * 20;

  return gridHeight + captionHeight + 8; // +8px margin
}
```

### Priority 4: Cache Invalidation on Edit

```typescript
// When message is edited
useEffect(() => {
  if (message.edited_at) {
    // Invalidate cache
    heightCache.current.delete(message.id);
    // Re-measure
    const newHeight = messageRef.current?.offsetHeight || 0;
    updateHeightCache(message.id, newHeight);
  }
}, [message.edited_at]);
```

---

## 🧮 Height Calculation Accuracy Summary

| Message Type | Estimation Method | Accuracy | Common Error | Fix Priority |
|--------------|-------------------|----------|--------------|--------------|
| Text (short) | Length-based | ✅ Excellent | 0-5px | Low |
| Text (long) | Length-based | ⚠️ Fair | 10-30px | **High** |
| Text (emoji) | Length-based | ❌ Poor | 20-40px | **High** |
| Text (newlines) | Length-based | ❌ Poor | 20-60px | **High** |
| Reply (short) | Fixed estimate | ✅ Good | 0-10px | Medium |
| Reply (long) | Fixed estimate | ⚠️ Fair | 20-60px | Medium |
| Image | Fixed size | ✅ Excellent | 0px | Low |
| Sticker | Fixed size | ✅ Perfect | 0px | Low |
| File | Fixed size | ✅ Excellent | 0-5px | Low |
| Album (no caption) | Photo count | ✅ Good | 0-10px | Low |
| Album (with caption) | Photo count | ❌ Poor | 40-100px | **High** |

---

**Next:** See `04-load-more.md` for load more mechanism analysis and `05-jump-scroll.md` for jump/scroll logic.
