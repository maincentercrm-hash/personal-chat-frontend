# ⬆️⬇️ Load More Mechanism - Complete Analysis

## 🎯 Overview

This document analyzes the bidirectional infinite scrolling system, including load more at top (older messages) and load more at bottom (newer messages).

---

## 🏗️ System Architecture

### Components Involved

```
VirtualMessageList (Component)
├─ Virtuoso Configuration
│  ├─ atTopStateChange      - Detects scroll near top
│  ├─ atBottomStateChange   - Detects scroll near bottom
│  ├─ atTopThreshold: 400px
│  └─ atBottomThreshold: 100px
│
useScrollHandlers (Hook)
├─ handleLoadMore()          - Load older messages (scroll up)
├─ handleLoadMoreAtBottom()  - Load newer messages (scroll down)
├─ isLoadingMore (state)     - Loading flag for top
├─ isLoadingMoreBottom (state) - Loading flag for bottom
└─ Cooldown timers
│
useMessagesList (Hook)
└─ fetchMessages()           - API call
   ├─ Pagination logic
   ├─ Message deduplication
   └─ Album grouping
```

---

## ⬆️ Load More at Top (Older Messages)

### Trigger Configuration

**File:** `src/components/shared/VirtualMessageList.tsx` lines 485-495

```typescript
<Virtuoso
  atTopStateChange={(atTop) => {
    if (atTop && !isLoadingMore && isMountedRef.current) {
      console.log('[debug_scroll] 🔝 atTopStateChange:', atTop);
      handleLoadMore();
    }
  }}
  atTopThreshold={400}  // Trigger when 400px from top
  // ...
/>
```

### Trigger Conditions

```typescript
if (
  atTop &&                    // Within 400px of top
  !isLoadingMore &&           // Not already loading
  isMountedRef.current        // Component mounted and stable
) {
  handleLoadMore();
}
```

**Why these conditions?**
- `atTop`: Prevents loading when user isn't near top
- `!isLoadingMore`: Prevents duplicate API calls
- `isMountedRef.current`: Prevents loading during initial mount (avoids double-load)

### Load More Handler

**File:** `src/hooks/useScrollHandlers.ts` lines 30-57

```typescript
const handleLoadMore = useCallback(() => {
  // Prevent loading during initial mount
  if (!isMountedRef.current) {
    console.log('[debug_scroll] 🚫 Blocked: Component not fully mounted');
    return;
  }

  // Prevent duplicate loads
  if (isLoadingMore) {
    console.log('[debug_scroll] 🚫 Already loading more');
    return;
  }

  console.log('[debug_scroll] ⬆️ Loading more messages at TOP');

  // Set loading flag
  setIsLoadingMore(true);

  // Call parent's load function
  onLoadMore?.();

  // Note: Loading flag cleared by parent after data arrives
}, [isLoadingMore, onLoadMore]);
```

### Prepending Strategy (Virtuoso)

**How Virtuoso handles prepending:**

```
Before load:
firstItemIndex = 100000
messages = [msg1, msg2, msg3, ...]
           ↑ index 100000

After loading 20 older messages:
firstItemIndex = 99980  (decreased by 20)
messages = [old1, old2, ..., old20, msg1, msg2, msg3, ...]
           ↑ index 99980           ↑ still index 100000
```

**Key advantage:** msg1's index (100000) stays the same → scroll position preserved!

### Prepending Detection Logic

**File:** `src/components/shared/VirtualMessageList.tsx` lines 281-344

```typescript
useLayoutEffect(() => {
  const currentCount = deduplicatedMessages.length;
  const prevCount = prevMessagesCount.current;

  // Detect if messages were prepended
  const firstMessageId = deduplicatedMessages[0]?.id;
  const prevFirstId = prevFirstMessageId.current;

  if (currentCount > prevCount && firstMessageId !== prevFirstId) {
    // Messages were added at the beginning!
    const diff = currentCount - prevCount;

    console.log(`[PREPEND] Detected ${diff} new messages at top`);
    console.log(`[PREPEND] First message changed: ${prevFirstId} → ${firstMessageId}`);

    // Update firstItemIndex
    setFirstItemIndex(prev => {
      const newIndex = prev - diff;
      console.log(`[PREPEND] firstItemIndex: ${prev} → ${newIndex}`);
      return newIndex;
    });

    // Diagnostic: Check heights of new messages
    console.group('[DIAGNOSTIC] Prepended Messages Analysis');
    const newMessages = deduplicatedMessages.slice(0, diff);

    newMessages.forEach((msg, idx) => {
      const cached = heightCache.current.get(msg.id!);
      const estimated = estimateMessageHeight(msg);
      const status = cached ? 'CACHED' : 'ESTIMATED';
      const height = cached || estimated;

      console.log(
        `[${idx}] ${msg.id}: ${status} ${height}px (${msg.message_type})`
      );
    });
    console.groupEnd();
  }

  // Update tracking refs
  prevMessagesCount.current = currentCount;
  prevFirstMessageId.current = firstMessageId;
}, [deduplicatedMessages]);
```

### Diagnostic Output Example

```
[PREPEND] Detected 20 new messages at top
[PREPEND] First message changed: msg-100 → msg-80
[PREPEND] firstItemIndex: 100000 → 99980

[DIAGNOSTIC] Prepended Messages Analysis
  [0] msg-80: ESTIMATED 74px (text)
  [1] msg-81: ESTIMATED 216px (image)
  [2] msg-82: ESTIMATED 106px (file)
  [3] msg-83: CACHED 94px (text)       ← From previous scroll session
  [4] msg-84: ESTIMATED 74px (text)
  ...
  [19] msg-99: ESTIMATED 130px (reply)

  Cache stats: 3/20 cached (15% hit rate)
  Total estimated height: 2,140px
```

---

## ⬇️ Load More at Bottom (Newer Messages)

### Trigger Configuration

**File:** `src/components/shared/VirtualMessageList.tsx` lines 496-506

```typescript
<Virtuoso
  atBottomStateChange={(atBottom) => {
    if (atBottom && !isLoadingMoreBottom && !isLoadingBottomRef.current) {
      console.log('[debug_scroll] 🔽 atBottomStateChange:', atBottom);
      handleLoadMoreAtBottom();
    }
  }}
  atBottomThreshold={100}  // Trigger when 100px from bottom
  // ...
/>
```

### Trigger Conditions

```typescript
if (
  atBottom &&                   // Within 100px of bottom
  !isLoadingMoreBottom &&       // Not already loading (state)
  !isLoadingBottomRef.current   // Not already loading (ref - double check)
) {
  handleLoadMoreAtBottom();
}
```

**Why double loading check?**
- State (`isLoadingMoreBottom`) may not update immediately
- Ref (`isLoadingBottomRef`) provides immediate synchronous check
- Prevents rapid-fire API calls when scrolling fast

### Load More Handler

**File:** `src/hooks/useScrollHandlers.ts` lines 59-84

```typescript
const handleLoadMoreAtBottom = useCallback(() => {
  // Double-check not loading
  if (isLoadingMoreBottom || isLoadingBottomRef.current) {
    console.log('[debug_scroll] 🚫 Already loading more at bottom');
    return;
  }

  console.log('[debug_scroll] ⬇️ Loading more messages at BOTTOM');

  // Set both state and ref
  setIsLoadingMoreBottom(true);
  isLoadingBottomRef.current = true;

  // Call parent's load function
  onLoadMoreAtBottom?.();

  // Clear loading flag after cooldown (300ms)
  setTimeout(() => {
    setIsLoadingMoreBottom(false);
    isLoadingBottomRef.current = false;
  }, 300);
}, [isLoadingMoreBottom, onLoadMoreAtBottom]);
```

### Cooldown Mechanism

**Why 300ms cooldown?**

```typescript
// Without cooldown:
User scrolls fast → atBottom triggers → API call
100ms later → Still atBottom → API call again! ❌
200ms later → Still atBottom → API call again! ❌

// With 300ms cooldown:
User scrolls fast → atBottom triggers → API call
100ms later → isLoadingBottomRef.current = true → Blocked ✅
200ms later → Still blocked ✅
300ms later → Cooldown expires → Can load again ✅
```

**Trade-off:**
- **Pro:** Prevents duplicate API calls
- **Con:** 300ms delay before can load more (but user unlikely to need it faster)

### Appending Strategy

**Simpler than prepending:**

```
Before load:
messages = [..., msg98, msg99, msg100]
                               ↑ last message

After loading 20 newer messages:
messages = [..., msg98, msg99, msg100, msg101, msg102, ..., msg120]
                                       ↑ new messages appended
```

**No index manipulation needed!** Just push to end of array.

---

## 🔄 Message Pagination Logic

### API Integration

**File:** `src/hooks/useMessagesList.ts` (example structure)

```typescript
const fetchMessages = useCallback(async (direction: 'before' | 'after', cursor?: string) => {
  const params = {
    conversation_id: conversationId,
    limit: 20,  // Fetch 20 messages at a time
    [direction]: cursor  // before: cursor (older) or after: cursor (newer)
  };

  const response = await api.get('/messages', { params });

  return {
    messages: response.data.messages,
    nextCursor: response.data.next_cursor,
    prevCursor: response.data.prev_cursor,
    hasMore: response.data.has_more
  };
}, [conversationId]);
```

### Load More at Top Flow

```
1. User scrolls near top (< 400px)
   ↓
2. atTopStateChange(true) fires
   ↓
3. handleLoadMore() called
   ↓
4. onLoadMore?.() → Parent component
   ↓
5. fetchMessages('before', oldestMessageCursor)
   ↓
6. API returns 20 older messages
   ↓
7. Messages prepended to array
   ↓
8. deduplicatedMessages updates
   ↓
9. useLayoutEffect detects prepend
   ↓
10. firstItemIndex decreased by 20
   ↓
11. Virtuoso re-renders
   ↓
12. ⚠️ Height estimation for new messages
   ↓
13. If estimates wrong → Scroll position shifts! ❌
```

### Load More at Bottom Flow

```
1. User scrolls near bottom (< 100px from end)
   ↓
2. atBottomStateChange(true) fires
   ↓
3. handleLoadMoreAtBottom() called
   ↓
4. onLoadMoreAtBottom?.() → Parent component
   ↓
5. fetchMessages('after', newestMessageCursor)
   ↓
6. API returns 20 newer messages
   ↓
7. Messages appended to array
   ↓
8. deduplicatedMessages updates
   ↓
9. Virtuoso re-renders with new items
   ↓
10. User continues scrolling down ✅
```

**Much simpler!** No firstItemIndex manipulation, no scroll position concerns.

---

## 📊 Threshold Configuration Analysis

### Why 400px for Top, 100px for Bottom?

**Top Threshold (400px):**
```
Viewport height: 800px (typical)
Buffer: 400px = 50% of viewport

User sees top message
↓ Scrolls up
↓ 400px before hitting top edge
↓ Load more triggers
↓ New messages load
↓ User never sees empty space ✅
```

**Benefits:**
- Early loading prevents waiting
- Smooth scrolling experience
- 400px ≈ 4-6 messages buffer

**Bottom Threshold (100px):**
```
Viewport height: 800px
Buffer: 100px = 12.5% of viewport

User sees bottom message
↓ Scrolls down
↓ 100px before hitting bottom edge
↓ Load more triggers
```

**Why smaller than top?**
- Users typically scroll to see new messages (active intent)
- Less need for large buffer
- Prevents pre-loading messages user may not want

---

## 🐛 Known Issues

### Issue #1: Scroll Jump on Prepend

**Problem:** When loading older messages, if height estimates are wrong, scroll position jumps.

**Example:**
```
// 20 messages prepended
Estimated total height: 2000px (20 × 100px avg)
Actual total height:    2400px (some long text, albums with captions)

Difference: 400px

// Result: Screen "jumps" down 400px
// User loses their place ❌
```

**Visual:**
```
Before load:
┌────────────┐
│ msg-100    │ ← User viewing this
│ msg-101    │
└────────────┘

After load (wrong heights):
┌────────────┐
│ msg-85     │ ← Screen jumped!
│ msg-86     │
└────────────┘   User was viewing msg-100, now sees msg-85 ❌
```

**Why this happens:**
1. Virtuoso calculates total scrollable height from item heights
2. If estimates wrong → Total height wrong
3. Virtuoso adjusts scroll position to maintain relative position
4. But relative position based on wrong heights → Jumps

**Solution:**
```typescript
// After prepending, re-measure all new messages immediately
const newMessages = deduplicatedMessages.slice(0, diff);

// Force measurement
newMessages.forEach(msg => {
  const element = document.getElementById(`msg-${msg.id}`);
  if (element) {
    const actualHeight = element.offsetHeight;
    updateHeightCache(msg.id, actualHeight);
  }
});

// Then update firstItemIndex
setFirstItemIndex(prev => prev - diff);
```

---

### Issue #2: Rapid Scroll Triggers Multiple Loads

**Problem:** If user scrolls very fast near top, might trigger multiple loads before first one completes.

**Example:**
```
t=0ms:   User at 390px from top
t=10ms:  atTopStateChange(true) → Load triggered
t=20ms:  Still loading, but user scrolled to 380px
t=30ms:  atTopStateChange fires again → Blocked by isLoadingMore ✅
```

**Current Protection:**
```typescript
if (!isLoadingMore && isMountedRef.current) {
  handleLoadMore(); // Only if not already loading
}
```

**Works, but could be improved:**
```typescript
// Add timestamp-based cooldown
const lastLoadTime = useRef(0);
const LOAD_COOLDOWN = 1000; // 1 second

if (Date.now() - lastLoadTime.current < LOAD_COOLDOWN) {
  return; // Too soon after last load
}

lastLoadTime.current = Date.now();
handleLoadMore();
```

---

### Issue #3: Load More During Jump

**Problem:** If user jumps to old message, then scrolls up, might load duplicates.

**Example:**
```
1. User in chat with 500 messages
2. User jumps to message #50 (old)
3. Virtuoso scrolls to index 50
4. Only messages 30-70 loaded in virtual window
5. User scrolls up slightly
6. Hits atTopThreshold
7. Loads more messages before #30
8. But messages 1-29 might already exist in full array! ❌
```

**Current Protection:**
```typescript
// In useMessagesList - deduplication by message ID
const deduplicatedMessages = useMemo(() => {
  const seen = new Set();
  return allMessages.filter(msg => {
    if (seen.has(msg.id)) return false;
    seen.add(msg.id);
    return true;
  });
}, [allMessages]);
```

**Deduplication prevents duplicates in UI, but:**
- Wastes API call
- Causes unnecessary re-render
- Could be smarter about checking before calling API

---

### Issue #4: No Visual Loading Indicator

**Problem:** When loading more, user doesn't know it's happening.

**Current:** No spinner, no "Loading..." text

**Should add:**
```tsx
{isLoadingMore && (
  <div className="loading-indicator-top">
    <Spinner size="sm" />
    <span>Loading older messages...</span>
  </div>
)}

{isLoadingMoreBottom && (
  <div className="loading-indicator-bottom">
    <Spinner size="sm" />
    <span>Loading newer messages...</span>
  </div>
)}
```

---

## 📈 Performance Analysis

### Load More Timing (Typical)

```
Network Request:
- API latency: 100-300ms
- Data size: 20 messages ≈ 50-100KB
- Parse JSON: 5-10ms

Processing:
- Deduplication: 5-10ms
- Album grouping: 10-20ms
- State update: 5ms

Rendering:
- React re-render: 20-50ms
- Virtuoso recalculation: 10-30ms
- Height measurement: 20 × 2-5ms = 40-100ms

Total: 200-500ms (typical)
```

### Bottlenecks

**Slowest parts:**
1. **Network latency** (100-300ms) → Can't optimize much
2. **Height measurement** (40-100ms) → Can optimize!
3. **React re-render** (20-50ms) → OK with React 18

**Optimization opportunity:**
```typescript
// Batch height measurements
const measureAllHeights = () => {
  const heights = [];
  newMessages.forEach(msg => {
    const element = document.getElementById(`msg-${msg.id}`);
    heights.push({ id: msg.id, height: element.offsetHeight });
  });

  // Single cache update with all heights
  batchUpdateHeightCache(heights);
};
```

---

## 🎯 Improvement Recommendations

### Priority 1: Stabilize Heights Before Adjusting firstItemIndex

```typescript
useLayoutEffect(() => {
  if (currentCount > prevCount && firstMessageId !== prevFirstId) {
    const diff = currentCount - prevCount;
    const newMessages = deduplicatedMessages.slice(0, diff);

    // 1. Force immediate measurement of all new messages
    const measuredHeights = newMessages.map(msg => {
      const element = document.getElementById(`msg-${msg.id}`);
      return {
        id: msg.id,
        height: element?.offsetHeight || estimateMessageHeight(msg)
      };
    });

    // 2. Update cache with measured heights
    measuredHeights.forEach(({ id, height }) => {
      updateHeightCache(id, height);
    });

    // 3. Now safe to update firstItemIndex
    setFirstItemIndex(prev => prev - diff);
  }
}, [deduplicatedMessages]);
```

### Priority 2: Add Visual Loading Indicators

```tsx
<Virtuoso
  components={{
    Header: () => (
      isLoadingMore ? (
        <div className="flex justify-center py-2">
          <Spinner size="sm" />
          <span className="ml-2 text-sm text-gray-500">
            Loading older messages...
          </span>
        </div>
      ) : null
    ),
    Footer: () => (
      isLoadingMoreBottom ? (
        <div className="flex justify-center py-2">
          <Spinner size="sm" />
          <span className="ml-2 text-sm text-gray-500">
            Loading newer messages...
          </span>
        </div>
      ) : null
    )
  }}
/>
```

### Priority 3: Smarter Load Triggering

```typescript
// Don't load if we already have those messages
const handleLoadMore = useCallback(() => {
  // Check if we actually need more messages
  const oldestMessage = deduplicatedMessages[0];
  const canLoadMore = /* check with backend cursor or hasMore flag */;

  if (!canLoadMore) {
    console.log('[debug_scroll] 🚫 No more messages to load');
    return;
  }

  // Continue with normal load...
}, [deduplicatedMessages]);
```

### Priority 4: Implement Scroll Position Correction

```typescript
// After prepending, verify scroll position maintained
const scrollPositionBefore = virtuosoRef.current.getState().scrollTop;
const totalHeightBefore = /* calculate from old heights */;

// ... prepend happens ...

const totalHeightAfter = /* calculate from new heights */;
const heightDifference = totalHeightAfter - totalHeightBefore;
const expectedScrollPosition = scrollPositionBefore + heightDifference;
const actualScrollPosition = virtuosoRef.current.getState().scrollTop;

if (Math.abs(expectedScrollPosition - actualScrollPosition) > 10) {
  // Scroll position drifted, correct it
  virtuosoRef.current.scrollTo({
    top: expectedScrollPosition,
    behavior: 'auto' // Instant correction
  });
}
```

---

## 📚 Load More Flow Diagrams

### Complete Load More at Top Flow

```
User scrolls up
    ↓
Within 400px of top?
    ↓ YES
atTopStateChange(true)
    ↓
isLoadingMore?
    ↓ NO
isMountedRef.current?
    ↓ YES
handleLoadMore()
    ↓
setIsLoadingMore(true)
    ↓
onLoadMore() → API call
    ↓
← 20 older messages returned
    ↓
Prepend to messages array
    ↓
deduplicatedMessages updates
    ↓
useLayoutEffect detects prepend
    ↓
Measure new message heights (⚠️ MISSING!)
    ↓
Update firstItemIndex (prev - 20)
    ↓
Virtuoso re-renders
    ↓
⚠️ Scroll position shift if heights wrong
    ↓
User continues scrolling
```

### Complete Load More at Bottom Flow

```
User scrolls down
    ↓
Within 100px of bottom?
    ↓ YES
atBottomStateChange(true)
    ↓
isLoadingMoreBottom?
    ↓ NO
isLoadingBottomRef.current?
    ↓ NO
handleLoadMoreAtBottom()
    ↓
setIsLoadingMoreBottom(true)
isLoadingBottomRef.current = true
    ↓
onLoadMoreAtBottom() → API call
    ↓
← 20 newer messages returned
    ↓
Append to messages array
    ↓
deduplicatedMessages updates
    ↓
Virtuoso re-renders
    ↓
New messages appear at bottom ✅
    ↓
300ms cooldown expires
    ↓
isLoadingMoreBottom = false
isLoadingBottomRef.current = false
    ↓
Ready for next load
```

---

**Next:** See `05-jump-scroll.md` for jump to message and scroll behavior analysis.
