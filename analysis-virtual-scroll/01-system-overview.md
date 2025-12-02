# 📊 Virtual Scroll System - Overview & Architecture

## 🎯 Executive Summary

**Current State:** Chat application uses React Virtuoso for virtual scrolling with custom height caching system.

**Main Issues:**
- ⚠️ **Jittery scrolling** - scroll position jumps during navigation
- ⚠️ **Load more not smooth** - prepending causes scroll shifts
- ⚠️ **Height estimation inaccurate** - difference between estimated vs actual heights

**Root Causes Identified:**
1. ResizeObserver **DISABLED** - no dynamic height correction
2. Rigid height estimates - doesn't account for actual rendering variations
3. Album heights hardcoded - doesn't consider captions/grid variations
4. No height stabilization after prepending messages

---

## 🏗️ System Architecture

### Virtualization Library

**Library:** `react-virtuoso` (Telegram-style virtual scrolling)

**Main Component:** `src/components/shared/VirtualMessageList.tsx` (560 lines)

**Key Features:**
- Bidirectional infinite scrolling (load older + newer messages)
- Prepending pattern using `firstItemIndex` (starts at 100000)
- Height caching system with ~85-95% hit rate
- Auto-scroll to bottom with "follow output" mode
- Jump to message with highlight animation

---

## 📦 Component Structure

```
VirtualMessageList (Main Component)
│
├─ MessageListProvider (Context)
│  ├─ Height cache functions
│  ├─ Message formatting utilities
│  └─ Event callbacks (reply, edit, delete, etc.)
│
└─ Virtuoso (Virtual List Container)
   │
   ├─ Configuration
   │  ├─ firstItemIndex: 100000 (for prepending)
   │  ├─ itemSize: Dynamic per message
   │  ├─ atTopThreshold: 400px
   │  ├─ atBottomThreshold: 100px
   │  └─ increaseViewportBy: {top: 1000px, bottom: 1000px}
   │
   └─ itemContent: (index, data) => MessageItem
      │
      └─ MessageItem
         ├─ Height measurement logic
         ├─ ResizeObserver (DISABLED)
         └─ Message Component (Text/Image/File/etc.)
```

---

## 🔧 Core Configuration

### Virtuoso Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `firstItemIndex` | 100000 | Starting index for prepending pattern |
| `defaultItemHeight` | 100px | Fallback when height unknown |
| `atTopThreshold` | 400px | Trigger load more older messages |
| `atBottomThreshold` | 100px | Trigger load more newer messages |
| `increaseViewportBy.top` | 1000px | Pre-render buffer above viewport |
| `increaseViewportBy.bottom` | 1000px | Pre-render buffer below viewport |
| `followOutput` | 'smooth' | Auto-scroll behavior for new messages |

### Height Cache Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `USE_HEIGHT_CACHE` | true | Enable height caching |
| `USE_RESIZE_OBSERVER` | **false** ⚠️ | Enable dynamic height tracking |
| `updateThreshold` | 10px | Min change to update cache |
| `warningThreshold` | 5px | Warn if estimate off by >5px |
| `stabilityTimer` | 300ms | Wait before finalizing text height |
| `debounceTimer` | 150ms | ResizeObserver debounce (unused) |

---

## 📂 File Structure

### Core Components

```
src/components/shared/
├── VirtualMessageList.tsx              (560 lines) - Main virtual scroll component
├── VirtualMessageList.backup.tsx       - Backup version
├── VirtualMessageList/
│   └── MessageItem.tsx                 (383 lines) - Individual message renderer
├── MessageArea.tsx                     - Container component
└── message/
    ├── TextMessage.tsx                 - Text message component
    ├── ReplyMessage.tsx                - Reply message component
    ├── ImageMessage.tsx                - Image message component
    ├── FileMessage.tsx                 - File message component
    ├── StickerMessage.tsx              - Sticker message component
    ├── AlbumMessage.tsx                - OLD album format (deprecated)
    └── AlbumMessageV2.tsx              - NEW album format
```

### Hooks & Logic

```
src/hooks/
├── useMessageHeightCache.ts            (138 lines) - Height estimation & caching
├── useScrollHandlers.ts                (190 lines) - Jump & scroll logic
└── useMessagesList.ts                  - Message data management
```

### Context & Types

```
src/contexts/
└── MessageListContext.tsx              - Shared state & functions

src/types/
└── message.types.ts                    - Message & album type definitions
```

---

## 🔄 Data Flow

### 1. Message List Loading

```
useMessagesList (hook)
  ↓ Fetches messages from API
  ↓ Deduplicates messages
  ↓ Groups albums
  ↓
VirtualMessageList (component)
  ↓ Receives deduplicatedMessages
  ↓ Calculates firstItemIndex for prepending
  ↓
Virtuoso
  ↓ Renders visible items + buffer
  ↓
MessageItem
  ↓ Estimates height (cache or calculate)
  ↓ Measures actual height on mount
  ↓ Updates cache if difference > 10px
```

### 2. Height Calculation Flow

```
itemSize={(el, index) => ...}
  ↓
Check if message is album
  ├─ YES → Check cache → Return cached or estimated
  └─ NO → Check cache → Return cached or estimated
      ↓
estimateMessageHeight(message)
  ├─ Text: 74px + extra lines (50 chars = 1 line)
  ├─ Image: 216px (fixed)
  ├─ Sticker: 156px (fixed)
  ├─ File: 106px (fixed)
  ├─ Reply: 130px (estimated)
  └─ Album: Based on photo count (198-400px)
```

### 3. Scroll Event Flow

```
User scrolls near top/bottom
  ↓
atTopStateChange / atBottomStateChange
  ↓
Checks: !isLoadingMore && isMountedRef.current
  ↓
handleLoadMore() / handleLoadMoreAtBottom()
  ↓
API call to fetch more messages
  ↓
Messages prepended/appended
  ↓
firstItemIndex adjusted (for prepending)
  ↓
Virtuoso re-renders with new items
  ↓
⚠️ POTENTIAL SCROLL JUMP HERE ⚠️
```

---

## 🎨 Rendering Strategy

### Prepending Pattern (Load Older Messages)

React Virtuoso uses `firstItemIndex` to handle prepending efficiently:

```typescript
// Initial state
firstItemIndex = 100000
messages = [msg1, msg2, msg3]  // indices: 100000, 100001, 100002

// After loading 5 older messages
firstItemIndex = 99995  // DECREASED by 5
messages = [old1, old2, old3, old4, old5, msg1, msg2, msg3]
// indices: 99995, 99996, 99997, 99998, 99999, 100000, 100001, 100002
```

**Why this works:**
- Virtual indices stay stable
- msg1 stays at index 100000 → scroll position preserved
- No need to recalculate all positions

**When it fails:**
- If prepended message heights are incorrect
- Scroll position shifts up/down unexpectedly

---

## 📊 Performance Metrics

### Height Cache Statistics

**Typical Performance:**
- Cache hit rate: **85-95%**
- Cache size: 50-500+ messages (depends on conversation length)
- Update frequency: Low (only when estimate differs >10px)

**Logging:**
```
[HeightCache] Real-time: 427/450 hits (94.9% hit rate) | Cache: 245 msgs
[HeightCache] Final: 427/450 hits (94.9% hit rate)
```

### Render Buffer

**Buffer Zones:**
- Top: 1000px (pre-renders ~10-15 messages above viewport)
- Bottom: 1000px (pre-renders ~10-15 messages below viewport)
- Total viewport: Screen height + 2000px

**Why Telegram-style:**
- Prevents white flashes during scrolling
- Allows smooth bi-directional scrolling
- Trade-off: Higher memory usage

---

## 🐛 Known Issues

### Issue #1: ResizeObserver Disabled

**File:** `src/hooks/useMessageHeightCache.ts:9`

```typescript
USE_RESIZE_OBSERVER: useRef(false)  // ⚠️ DISABLED
// Comment: "DISABLE to test if it causes scroll jump"
```

**Impact:**
- ❌ No dynamic height correction after initial measurement
- ❌ Images loading don't update cached heights
- ❌ Text wrapping changes not detected
- ❌ Album layout shifts not tracked

**Why disabled:** Previous attempt to enable caused scroll jumps (likely due to incorrect debouncing)

---

### Issue #2: Height Estimation Inaccuracy

**Text Messages:**
```typescript
// Estimation: 50 characters = 1 line = 20px
estimatedHeight = 74 + Math.floor(contentLength / 50) * 20

// Reality: Depends on font, padding, emoji, line breaks
actualHeight = ???  // Can differ by 10-30px
```

**Albums:**
```typescript
// Estimation: Based ONLY on photo count
1 photo: 400px
2 photos: 198px
3 photos: 268px
4 photos: 400px

// Reality: Grid layout + caption height
actualHeight = gridHeight + captionHeight + padding
```

---

### Issue #3: Scroll Position Shift on Prepend

**What happens:**
1. User scrolls to top
2. API loads 20 older messages
3. Messages prepended
4. Heights estimated for new messages
5. ⚠️ If estimates wrong → total height incorrect
6. Scroll position "jumps" to compensate

**Example:**
```
Estimated total height: 2000px (20 msgs × 100px)
Actual total height: 2400px (some msgs 120-150px)
Difference: 400px

Result: Scroll jumps down 400px unexpectedly
```

---

### Issue #4: No Stabilization After Load

**Current behavior:**
```typescript
// After prepending
setFirstItemIndex(prev => prev - diff);
// ← No height verification
// ← No scroll position correction
// ← Just hope estimates are correct
```

**Better approach (not implemented):**
```typescript
// After prepending
1. Measure all new messages
2. Update height cache
3. Calculate scroll offset needed
4. Apply scroll correction
5. Then update firstItemIndex
```

---

## 🔍 Diagnostic Tools Available

### Console Logging

**Height Cache:**
```javascript
// Every 50 queries
[HeightCache] Real-time: X/Y hits (Z% hit rate) | Cache: N msgs

// Final stats
[HeightCache] Final: X/Y hits (Z% hit rate)
[HeightCache] Cache size: N messages
```

**Prepend Analysis:**
```javascript
[DIAGNOSTIC] Prepended Messages Analysis
[0] msg-123: CACHED 106px (file)
[1] msg-124: ESTIMATED 74px (text) - ⚠️ Could differ!
[2] msg-125: CACHED 216px (image)
```

**Jump/Scroll:**
```javascript
[Jump] Scrolling to index 245/500 (49%)
[Jump] Retry scroll after images loaded
[Jump] ✨ Highlighting message for 2s
```

**Load More:**
```javascript
[debug_scroll] 🔝 atTopStateChange: true
[debug_scroll] 🔽 atBottomStateChange: false
```

---

## 📈 Recommended Improvements

### Priority 1: Enable ResizeObserver (with proper debouncing)

```typescript
USE_RESIZE_OBSERVER: useRef(true)  // Re-enable
// Add 300-500ms debounce
// Only update cache if >10px difference
// Batch updates to prevent thrashing
```

### Priority 2: Improve Height Estimation

```typescript
// Text: Measure font metrics properly
// Album: Include caption height in estimate
// Reply: Measure quoted message height
```

### Priority 3: Stabilization After Prepend

```typescript
// After loading older messages:
1. Measure all new message heights
2. Update cache immediately
3. Calculate expected scroll offset
4. Apply correction if needed
```

### Priority 4: Dynamic Album Heights

```typescript
// Don't hardcode album heights
// Calculate based on:
- Photo aspect ratios
- Grid layout (1x1, 2x1, 2x2, etc.)
- Caption length
- Padding/margins
```

---

## 📚 References

**Library Documentation:**
- React Virtuoso: https://virtuoso.dev/
- Prepending pattern: https://virtuoso.dev/prepend-items

**Related Files:**
- See `02-message-types.md` for detailed message type analysis
- See `03-height-calculation.md` for height estimation formulas
- See `04-load-more.md` for load more mechanism details
- See `05-jump-scroll.md` for jump/scroll logic details

---

**Analysis Date:** 2025-11-30
**Analyzed By:** Claude Code
**Status:** Issues identified, recommendations provided
