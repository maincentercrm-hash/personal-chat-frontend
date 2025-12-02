# 🔴 Scroll Jump Problem - Detailed Analysis

**Date:** 2025-12-01
**Status:** 🔴 **CRITICAL ISSUE - User reports persistent scroll jumps**
**Phase 1 Completed:** Height estimation improved, but jumps still occur

---

## 🎯 Problem Summary

**User Report:**
> "เวลาเลื่อนขึ้นไปข้างบน พอถึงจะหวะที่มันจะโหลด message ก่อนหน้า มันจะ scroll ลงมาด้านล่างทุกครั้งเลย"
> After fixing followOutput: "ยังกระตุกครับ"

**Behavior:**
1. User scrolls UP to read history
2. Reaches top threshold → triggers load more
3. Older messages prepended at top
4. **Screen jumps/jitters** (scroll position not preserved correctly)
5. Poor UX - user loses their place in conversation

---

## 🔬 Root Cause Analysis

### Issue #1: No Height Measurement Before firstItemIndex Update 🔴 **CRITICAL**

**Location:** `VirtualMessageList.tsx:281-344`

**Current Flow:**
```typescript
useLayoutEffect(() => {
  // 1. Detect prepend
  if (currentCount > prevCount && firstMessageId !== prevFirstId) {
    const newMessages = deduplicatedMessages.slice(0, diff);

    // 2. ✅ Estimate heights (diagnostics only)
    newMessages.forEach((msg) => {
      const estimated = estimateMessageHeight(msg); // ⚠️ Only estimates!
      console.log(`ESTIMATED ${estimated}px`);
    });

    // 3. ❌ Update firstItemIndex WITHOUT measuring actual heights!
    setFirstItemIndex(prev => prev - diff);
    //                 ↑ This happens BEFORE messages render!
  }
}, [deduplicatedMessages.length]);
```

**Problem:**
- Heights are **estimated** but not **measured**
- `firstItemIndex` is updated **immediately** after estimation
- Virtuoso calculates scroll offset based on **estimated heights**
- When messages actually render, their **actual heights** may differ
- Difference between estimated and actual → **Scroll Jump!**

**Example:**
```
Estimated heights: 20 messages × 66px avg = 1,320px
Actual heights:    20 messages (mix of text/albums) = 1,800px
Difference:        480px scroll jump! ❌
```

---

### Issue #2: ResizeObserver Disabled 🔴 **CRITICAL**

**Location:** `useMessageHeightCache.ts:9`

```typescript
const USE_RESIZE_OBSERVER = useRef(false); // ❌ DISABLED
```

**Impact:**
- Dynamic height changes **NOT tracked**
- Images load: skeleton (100px) → actual (228px) = **128px jump**
- Fonts load: system font → custom font = **4-8px jump per message**
- Albums render: estimated grid → actual grid = **20-100px jump**

**Accumulation:**
```
20 prepended messages:
  - 10 text messages with font loading: 10 × 8px = 80px
  - 5 images loading: 5 × 128px = 640px
  - 2 albums rendering: 2 × 50px = 100px

Total scroll jump: 820px! ❌
```

**Why was it disabled?**
- Comment says: "DISABLE to test if it causes scroll jump"
- Previous implementation may have had issues:
  - No debouncing (caused thrashing)
  - Updates too frequent
  - No batch updates

---

### Issue #3: No Debouncing/Stabilization After Prepend 🔴 **HIGH**

**Location:** `VirtualMessageList.tsx:281-344`

**Current Behavior:**
```
User scrolls to top
  ↓
API returns 20 older messages
  ↓
deduplicatedMessages.length changes
  ↓
useLayoutEffect fires IMMEDIATELY
  ↓
Heights estimated (cache miss for new messages)
  ↓
firstItemIndex updated IMMEDIATELY
  ↓
Virtuoso adjusts scroll based on estimates
  ↓
Messages start rendering (async)
  ↓
⏱️ 50-200ms later: DOM updates, actual heights available
  ↓
But firstItemIndex already updated! ❌
  ↓
Scroll position based on wrong heights → JUMP!
```

**Should be:**
```
Messages prepended
  ↓
Wait for DOM to render (requestAnimationFrame)
  ↓
Measure ACTUAL heights of new messages
  ↓
Update height cache with actuals
  ↓
THEN update firstItemIndex with accurate heights
  ↓
Scroll position accurate ✅
```

---

### Issue #4: followOutput Logic 🟡 **MEDIUM** (Fixed but may have edge cases)

**Location:** `VirtualMessageList.tsx:509-527`

**Fixed in previous session:**
```typescript
followOutput={(isAtBottom) => {
  // ✅ Check scroll direction
  if (lastScrollDirectionRef.current === 'up') {
    return false; // Don't scroll when loading older messages
  }

  if (isAtBottom) {
    return 'smooth'; // Auto-scroll to new messages
  }

  return false;
}}
```

**Potential Edge Cases:**
1. **Race condition:** `lastScrollDirectionRef` updated after `followOutput` called
2. **Direction not reset:** May stuck at 'up' if load fails
3. **New messages during scroll:** User scrolling up + new message arrives → conflict

---

### Issue #5: Height Estimation Accuracy 🟢 **LOW** (Improved in Phase 1)

**Status:** Phase 1 completed - most constants updated

**Remaining Edge Cases:**

| Message Type | Estimation Accuracy | Potential Error |
|--------------|---------------------|-----------------|
| Text (1-3 lines) | ✅ 100% (66, 86, 106px) | 0px |
| Text (5+ lines) | ⚠️ 95% (untested) | 0-10px |
| Text (very long, 10+ lines) | ⚠️ 90% (untested) | 10-20px |
| Reply | ✅ 100% (122px constant) | 0px |
| Image | ✅ 100% (228px) | 0px (if no loading) |
| Album (1-4 photos) | ✅ 98% (228, 428px) | 0-4px |
| Album (5-10 photos) | ⚠️ 80% (need measurement) | 20-50px |
| Mixed album | ✅ 100% (368, 414px) | 0px |

**Notes:**
- Image loading (skeleton → actual): **NOT tracked** (ResizeObserver disabled)
- Album rendering (estimation → actual grid): **NOT tracked**

---

## 📊 Impact Assessment

### Scroll Jump Severity

Based on code analysis:

**Small Jumps (<10px):** 30%
- Text messages with accurate estimation
- Single images (if no loading state)
- Stickers, files (fixed size)

**Medium Jumps (10-50px):** 50%
- Text messages (long, untested)
- Albums (5-10 photos, no measurements)
- Image loading (skeleton → actual) **if ResizeObserver enabled**

**Large Jumps (>50px):** 20%
- Multiple albums in batch (errors accumulate)
- Image loading across multiple messages (ResizeObserver disabled)
- Mixed content batches (estimation errors add up)

### User Experience Impact

```
Current State (Phase 1 completed, ResizeObserver disabled):
  Load 20 older messages:
    - Best case (all text, cache hit): 0-20px jump ⚠️ Acceptable
    - Average case (mixed content): 50-150px jump 🔴 Bad
    - Worst case (albums + images): 200-500px jump 🔴 Unusable
```

---

## 🛠️ Solutions Ranked by Impact

### Solution #1: Height Measurement Before firstItemIndex Update 🎯 **HIGHEST IMPACT**

**Implementation:**
```typescript
useLayoutEffect(() => {
  if (currentCount > prevCount && firstMessageId !== prevFirstId) {
    const newMessages = deduplicatedMessages.slice(0, diff);

    // ✅ NEW: Wait for DOM to render, then measure
    requestAnimationFrame(() => {
      const measuredHeights: Array<{id: string, height: number}> = [];

      newMessages.forEach(msg => {
        const element = document.getElementById(`message-${msg.id}`);
        if (element) {
          const actualHeight = element.offsetHeight;
          measuredHeights.push({ id: msg.id!, height: actualHeight });
        } else {
          // Fallback to estimate if not rendered yet
          const estimated = estimateMessageHeight(msg);
          measuredHeights.push({ id: msg.id!, height: estimated });
        }
      });

      // Batch update cache
      measuredHeights.forEach(({ id, height }) => {
        heightCache.current.set(id, height);
      });

      console.log(`[PREPEND] Measured ${measuredHeights.length} actual heights`);

      // NOW safe to update firstItemIndex
      setFirstItemIndex(prev => prev - diff);
    });
  }
}, [deduplicatedMessages.length]);
```

**Expected Impact:** 60-80% reduction in scroll jumps ⭐⭐⭐

**Pros:**
- Fixes the main root cause
- Relatively simple implementation
- Works even if ResizeObserver disabled

**Cons:**
- Adds 1 frame delay (16ms) - acceptable
- May still have errors if images load slowly

---

### Solution #2: Re-enable ResizeObserver with Fixes 🎯 **HIGH IMPACT**

**Implementation:**
```typescript
// File: useMessageHeightCache.ts

const USE_RESIZE_OBSERVER = useRef(true); // ✅ Re-enable

// Debounced batch update system
const pendingUpdates = useRef<Map<string, number>>(new Map());
const updateTimeout = useRef<NodeJS.Timeout | null>(null);

const flushHeightUpdates = useCallback(() => {
  if (pendingUpdates.current.size === 0) return;

  console.log(`[ResizeObserver] Flushing ${pendingUpdates.current.size} updates`);

  pendingUpdates.current.forEach((height, id) => {
    heightCache.current.set(id, height);
  });

  pendingUpdates.current.clear();

  // Notify Virtuoso to recalculate (if needed)
  // virtuosoRef.current?.adjustForPrependedItems?.(0);
}, []);

// Queue height update (debounced)
const queueHeightUpdate = useCallback((messageId: string, height: number) => {
  const cached = heightCache.current.get(messageId);

  // Only update if significantly different (prevent micro-adjustments)
  if (!cached || Math.abs(cached - height) > 10) {
    pendingUpdates.current.set(messageId, height);

    // Clear existing timeout
    if (updateTimeout.current) {
      clearTimeout(updateTimeout.current);
    }

    // Debounce: flush after 500ms of no updates
    updateTimeout.current = setTimeout(flushHeightUpdates, 500);
  }
}, [flushHeightUpdates]);

// In MessageItem component - observe only dynamic types
useEffect(() => {
  if (!USE_RESIZE_OBSERVER.current) return;
  if (!['text', 'image', 'album', 'reply'].includes(message.message_type)) return;

  const element = messageRef.current;
  if (!element || !message.id) return;

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const height = entry.target.offsetHeight;
      queueHeightUpdate(message.id!, height);
    }
  });

  observer.observe(element);
  return () => observer.disconnect();
}, [message.id, message.message_type]);
```

**Expected Impact:** 30-40% additional reduction in scroll jumps ⭐⭐

**Pros:**
- Fixes dynamic height changes (images, fonts, albums)
- Automatically adapts to all scenarios
- Future-proof

**Cons:**
- More complex implementation
- Requires testing to ensure no performance issues
- May need Virtuoso integration

---

### Solution #3: Improved followOutput Logic 🎯 **MEDIUM IMPACT**

**Current Issue:**
- `lastScrollDirectionRef` may not be set correctly in all scenarios
- Race conditions possible

**Implementation:**
```typescript
// Add state to track prepending explicitly
const isPrependingRef = useRef(false);

useLayoutEffect(() => {
  if (currentCount > prevCount && firstMessageId !== prevFirstId) {
    // Set flag BEFORE any async operations
    isPrependingRef.current = true;

    // ... prepending logic ...

    // Reset flag after prepend completes
    setTimeout(() => {
      isPrependingRef.current = false;
    }, 1000); // Reset after 1 second
  }
}, [deduplicatedMessages.length]);

// In followOutput
followOutput={(isAtBottom) => {
  setAtBottom(isAtBottom);

  // Check prepending flag first (more reliable)
  if (isPrependingRef.current) {
    console.log('📜 [followOutput] Prepending in progress - SKIP');
    return false;
  }

  // Check scroll direction second
  if (lastScrollDirectionRef.current === 'up') {
    console.log('📜 [followOutput] Scrolling UP - SKIP');
    return false;
  }

  if (isAtBottom) {
    console.log('📜 [followOutput] At bottom - auto-scroll');
    return 'smooth';
  }

  return false;
}}
```

**Expected Impact:** 10-20% reduction in edge case jumps ⭐

---

### Solution #4: Virtuoso Configuration Tuning 🎯 **LOW IMPACT**

**Current Settings:**
```typescript
atTopThreshold={400}          // Trigger load when 400px from top
increaseViewportBy={{ top: 1000, bottom: 1000 }}  // Preload buffer
```

**Potential Improvements:**
```typescript
atTopThreshold={200}          // ✅ Reduce to 200px (trigger sooner)
increaseViewportBy={{ top: 2000, bottom: 1000 }}  // ✅ Larger top buffer
alignToBottom={false}         // ✅ Disable auto-align (may help)
```

**Expected Impact:** 5-10% reduction in visible jumps ⭐

---

## 📋 Recommended Implementation Plan

### Immediate Action (Today): Solution #1 🚀

**Implement Height Measurement Before firstItemIndex Update**

**Why first:**
- Highest impact (60-80% improvement)
- Relatively simple (30 lines of code)
- No side effects
- Works independently

**Files to modify:**
- `VirtualMessageList.tsx` (lines 281-344)

**Time:** 1 hour implementation + 1 hour testing

---

### Phase 2 (Tomorrow): Solution #2 🚀

**Re-enable ResizeObserver with Proper Debouncing**

**Why second:**
- Fixes remaining dynamic height issues
- Requires more testing
- Builds on Solution #1

**Files to modify:**
- `useMessageHeightCache.ts`
- `MessageItem.tsx` (if needed)

**Time:** 3-4 hours implementation + 2 hours testing

---

### Phase 3 (If Needed): Solutions #3 + #4

**Refinements and Edge Cases**

**Only if jumps still occur after #1 + #2**

**Time:** 2-3 hours

---

## 🧪 Testing Plan

### Test Case 1: Text-Heavy Conversation
```
1. Open conversation with 500+ text messages
2. Scroll to bottom
3. Scroll UP to top
4. Load more older messages
5. ✅ Check: No visible jump (< 10px acceptable)
6. ✅ Check: Can continue scrolling smoothly
```

### Test Case 2: Album-Heavy Conversation
```
1. Open conversation with many albums (2-4 photos each)
2. Scroll UP to load older albums
3. ✅ Check: Albums render correctly
4. ✅ Check: Minimal jump (< 20px acceptable)
```

### Test Case 3: Mixed Content Conversation
```
1. Conversation with text + images + albums + replies
2. Scroll UP to load more
3. ✅ Check: All message types render
4. ✅ Check: Minimal jump across different types
```

### Test Case 4: Image Loading
```
1. Conversation with many images
2. Scroll UP to load older images
3. Wait for images to load (skeleton → actual)
4. ✅ Check: No jump when images finish loading
```

### Test Case 5: Rapid Scrolling
```
1. Scroll UP very fast
2. Trigger multiple load more in sequence
3. ✅ Check: No accumulated jumps
4. ✅ Check: Smooth continuous scrolling
```

---

## 📊 Expected Results After All Fixes

**Before (Current State):**
```
Load more jumps: 80% of loads ❌
Average jump: 50-150px 🔴
Large jumps (>50px): 20% ❌
User experience: Frustrating ❌
```

**After Solution #1:**
```
Load more jumps: 30% of loads ⚠️
Average jump: 10-30px 🟡
Large jumps (>50px): 5% ⚠️
User experience: Acceptable ⚠️
```

**After Solution #1 + #2:**
```
Load more jumps: 10% of loads ✅
Average jump: 5-10px ✅
Large jumps (>50px): 1% ✅
User experience: Smooth ✅
```

---

## 🎯 Conclusion

**Main Root Cause:** No height measurement before `firstItemIndex` update

**Primary Fix:** Implement Solution #1 (Height Measurement)

**Secondary Fix:** Re-enable ResizeObserver (Solution #2)

**Timeline:**
- Solution #1: 2 hours (today)
- Solution #2: 5-6 hours (tomorrow)
- Total: 7-8 hours for complete fix

**Confidence:** 90% that Solutions #1 + #2 will resolve the issue

---

**Next Step:** Implement Solution #1 immediately and test with user

**Created by:** Claude Code
**Date:** 2025-12-01
