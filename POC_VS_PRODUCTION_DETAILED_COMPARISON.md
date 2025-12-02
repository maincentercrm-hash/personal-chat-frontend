# 🔍 POC vs Production: Detailed Line-by-Line Comparison

## 🎯 Goal
วิเคราะห์ว่าทำไม POC scroll ลื่น ไม่เด้ง แต่ Production scroll แล้วเด้ง

---

## 📊 Overview

| Feature | POC | Production | Status |
|---------|-----|------------|--------|
| Lines of Code | 272 | ~850 | POC simple |
| Fixed Heights | ✅ Yes | ✅ Yes (ใหม่) | Same now |
| Height Cache | ❌ No | ✅ Yes | Production complex |
| ResizeObserver | ❌ No | ❌ Disabled | Same |
| followOutput | ❌ `false` | ✅ `'smooth'` | **DIFFERENT!** |
| Message Item | Simple | Complex (edit, reply, etc.) | Very different |

---

## 🔥 CRITICAL DIFFERENCES

### 1. **followOutput** ⚠️ MAJOR DIFFERENCE!

#### POC (Line 235):
```typescript
followOutput={false}  // ✅ DISABLED
```

#### Production (Lines 798-805):
```typescript
followOutput={(isAtBottom) => {
  console.log('📜 [VirtualMessageList] followOutput called:', { isAtBottom });
  setAtBottom(isAtBottom);

  // ✅ เสมอ auto-scroll เมื่อมีข้อความใหม่
  return 'smooth';  // ❌ ALWAYS returns 'smooth'!
}}
```

**🚨 THIS IS THE PROBLEM!**

**Analysis:**
- POC: `followOutput={false}` → Virtuoso ไม่ auto-scroll
- Production: `followOutput={() => 'smooth'}` → Virtuoso **ALWAYS** auto-scroll เมื่อมี state change!

**Why it causes scroll jump:**
1. User scroll up ไปบนสุด
2. API load ข้อความเก่า → messages array เปลี่ยน
3. Virtuoso detect change → call `followOutput()`
4. `followOutput()` return `'smooth'`
5. Virtuoso คิดว่า "user อยากอยู่ที่ล่างสุด" → **SCROLL DOWN AUTOMATICALLY!**
6. Result: Scroll jump!

---

### 2. Prepend Logic

#### POC (Lines 57-93):
```typescript
useLayoutEffect(() => {
  const currentCount = messages.length;
  const prevCount = prevCountRef.current;
  const firstMessageId = messages[0]?.id;
  const prevFirstId = prevFirstIdRef.current;

  // Simple detection
  if (currentCount > prevCount && firstMessageId !== prevFirstId) {
    const diff = currentCount - prevCount;

    // ✅ Calculate using FIXED heights
    const newMessages = messages.slice(0, diff);
    const totalHeight = newMessages.reduce((sum, msg) => {
      const isReply = !!(msg.reply_to_id || msg.reply_to_message);
      const type = isReply ? 'reply' : msg.message_type;
      return sum + (FIXED_HEIGHTS[type] || 80);
    }, 0);

    // Update index
    setFirstItemIndex(prev => prev - diff);
  }

  // Update refs
  prevCountRef.current = currentCount;
  prevFirstIdRef.current = firstMessageId;
}, [messages.length]);  // ✅ Simple dependency
```

#### Production (Lines 248-311):
```typescript
useLayoutEffect(() => {
  const currentCount = deduplicatedMessages.length;
  const prevCount = prevMessageCountRef.current;
  const firstMessageId = deduplicatedMessages[0]?.id;
  const prevFirstId = prevFirstMessageIdRef.current;

  // Complex detection with diagnostic logs
  if (currentCount > prevCount && prevCount > 0) {
    const diff = currentCount - prevCount;

    if (prevFirstId && firstMessageId !== prevFirstId) {
      // ✅ Prepending

      // 🔍 DIAGNOSTIC: Complex analysis
      console.group('[DIAGNOSTIC] Prepended Messages Analysis');
      const newMessages = deduplicatedMessages.slice(0, diff);
      let totalEstimated = 0;
      let totalCached = 0;
      // ... lots of diagnostic code ...

      // Calculate using CACHE + FIXED heights
      newMessages.forEach((msg, idx) => {
        const cached = heightCache.current.get(msg.id!);
        const fixedHeight = getFixedMessageHeight(msg);

        if (cached) {
          totalCached += cached;
        } else {
          totalEstimated += fixedHeight;
        }
      });

      console.groupEnd();

      setFirstItemIndex(prev => prev - diff);
    } else {
      // Appending
    }
  }

  prevMessageCountRef.current = currentCount;
  prevFirstMessageIdRef.current = firstMessageId || null;
}, [deduplicatedMessages.length, getFixedMessageHeight]);  // ✅ Complex dependency
```

**Differences:**
- POC: Simple, no cache, just fixed heights
- Production: Complex with cache + fixed heights + diagnostics
- **Both update firstItemIndex correctly**
- **Both should work!**

---

### 3. itemSize Function

#### POC (Lines 194-198):
```typescript
itemSize={(index) => {
  const message = messages[index - firstItemIndex];
  if (!message) return 80;
  return getMessageHeight(message);  // ✅ Always returns fixed height
}}
```

#### Production (Lines 779-796):
```typescript
itemSize={(el) => {
  const index = typeof el === 'number' ? el : parseInt(el.getAttribute('data-index') || '0', 10);
  const message = deduplicatedMessages[index];
  if (!message) return 100;

  // Try cache first
  if (USE_HEIGHT_CACHE.current && message.id) {
    const cachedHeight = heightCache.current.get(message.id);
    if (cachedHeight) {
      cacheHits.current++;
      return cachedHeight;  // ✅ Return cached (most accurate)
    }
    cacheMisses.current++;
  }

  // Fallback to fixed height
  return getFixedMessageHeight(message);  // ✅ Returns fixed height
}}
```

**Differences:**
- POC: Always fixed height
- Production: Cache first, then fixed height
- **Production should be MORE accurate!**
- **This is NOT the problem**

---

### 4. Other Virtuoso Props

#### POC:
```typescript
<Virtuoso
  defaultItemHeight={POC_HEIGHT_GROUPS.reply}  // 80px
  useWindowScroll={false}
  scrollSeekConfiguration={{
    enter: (velocity) => Math.abs(velocity) > 1000,
    exit: (velocity) => Math.abs(velocity) < 100,
  }}
  followOutput={false}  // ✅ KEY!
  increaseViewportBy={{ top: 2000, bottom: 4000 }}
  overscan={500}
/>
```

#### Production:
```typescript
<Virtuoso
  defaultItemHeight={100}  // Different: 100px vs 80px
  // No useWindowScroll (default: false)
  // No scrollSeekConfiguration
  followOutput={(isAtBottom) => 'smooth'}  // ❌ KEY PROBLEM!
  increaseViewportBy={{ top: 1000, bottom: 1000 }}  // Smaller buffers
  // No overscan
/>
```

**Key Differences:**
| Prop | POC | Production | Impact |
|------|-----|------------|--------|
| `followOutput` | `false` | `() => 'smooth'` | 🔥 **CRITICAL** |
| `defaultItemHeight` | 80px | 100px | Minor |
| `increaseViewportBy` | 2000/4000 | 1000/1000 | Minor |
| `overscan` | 500 | none | Minor |
| `scrollSeekConfiguration` | Yes | No | Minor |

---

## 🔍 Root Cause Analysis

### Why Production Scrolls Down After Load More?

**Timeline:**
```
1. User scrolls up to top
   ↓
2. atTopStateChange(true) fires
   ↓
3. handleLoadMore() called
   ↓
4. API loads 20 older messages
   ↓
5. messages array updated (prepend 20 messages)
   ↓
6. deduplicatedMessages.length changes
   ↓
7. useLayoutEffect fires → firstItemIndex updated (10000 → 9980)
   ↓
8. Virtuoso detects state change
   ↓
9. **followOutput() called** ← PROBLEM HERE!
   ↓
10. followOutput() returns 'smooth'
   ↓
11. Virtuoso interprets as "user wants to stay at bottom"
   ↓
12. **Virtuoso scrolls down to bottom!** ❌
   ↓
13. User sees scroll jump!
```

### POC Timeline (Working):
```
1. User scrolls up to top
   ↓
2. atTopStateChange(true) fires
   ↓
3. onLoadMore() called
   ↓
4. API loads 20 older messages
   ↓
5. messages array updated (prepend 20 messages)
   ↓
6. messages.length changes
   ↓
7. useLayoutEffect fires → firstItemIndex updated (10000 → 9980)
   ↓
8. Virtuoso detects state change
   ↓
9. **followOutput is false** ← KEY DIFFERENCE!
   ↓
10. Virtuoso does NOT auto-scroll
   ↓
11. Virtuoso uses firstItemIndex to maintain position
   ↓
12. **Scroll stays at top!** ✅
   ↓
13. User continues reading older messages
```

---

## 🎯 Solution

### Primary Fix: Change followOutput Behavior

**Current (Broken):**
```typescript
followOutput={(isAtBottom) => {
  setAtBottom(isAtBottom);
  return 'smooth';  // ❌ Always returns smooth → always auto-scroll
}}
```

**Fix Option 1: Conditional (Like POC):**
```typescript
followOutput={false}  // ✅ Disable auto-scroll completely
```

**Fix Option 2: Smart Conditional:**
```typescript
followOutput={(isAtBottom) => {
  setAtBottom(isAtBottom);

  // Only auto-scroll if:
  // 1. User is at bottom
  // 2. New messages are being APPENDED (not prepended)
  // 3. User is scrolling DOWN (not UP)

  const isScrollingDown = lastScrollDirectionRef.current === 'down';
  const shouldAutoScroll = isAtBottom && isScrollingDown;

  return shouldAutoScroll ? 'smooth' : false;
}}
```

**Fix Option 3: Based on prepend detection:**
```typescript
const isPrependingRef = useRef(false);

useLayoutEffect(() => {
  // ... existing prepend detection ...

  if (currentCount > prevCount && prevFirstId && firstMessageId !== prevFirstId) {
    isPrependingRef.current = true;  // ← Set flag
    // ... rest of prepend logic ...

    // Reset flag after next render
    setTimeout(() => {
      isPrependingRef.current = false;
    }, 100);
  }
}, [deduplicatedMessages.length, getFixedMessageHeight]);

// In Virtuoso:
followOutput={(isAtBottom) => {
  setAtBottom(isAtBottom);

  // Don't auto-scroll if prepending
  if (isPrependingRef.current) {
    return false;  // ✅ Prevent scroll during prepend
  }

  return isAtBottom ? 'smooth' : false;
}}
```

---

## 📋 Implementation Plan

### Phase 1: Quick Fix (Highest Priority) ⭐⭐⭐
**Change followOutput to match POC:**
```typescript
followOutput={false}
```

**Impact:**
- ✅ Fixes scroll jump immediately
- ✅ Scroll up loads older messages without jumping
- ⚠️ Loses auto-scroll to bottom on new messages
- ⚠️ User must manually scroll to bottom

**Testing:**
1. Scroll up → load older messages → should stay at top ✅
2. Scroll down → should NOT auto-scroll to bottom ⚠️
3. New message arrives → should NOT auto-scroll ⚠️

---

### Phase 2: Smart followOutput (Recommended) ⭐⭐
**Implement conditional followOutput:**
```typescript
followOutput={(isAtBottom) => {
  setAtBottom(isAtBottom);

  // Only auto-scroll when:
  // - At bottom
  // - Scrolling down
  // - NOT loading more at top

  const isScrollingUp = lastScrollDirectionRef.current === 'up';

  if (isScrollingUp) {
    return false;  // ✅ Never auto-scroll when scrolling up
  }

  return isAtBottom ? 'smooth' : false;
}}
```

**Impact:**
- ✅ Fixes scroll jump when loading older messages
- ✅ Keeps auto-scroll to bottom when user is at bottom
- ✅ Best of both worlds!

**Testing:**
1. Scroll up → load older messages → should stay at top ✅
2. At bottom + new message → should auto-scroll ✅
3. Middle + new message → should NOT auto-scroll ✅

---

### Phase 3: Additional Improvements (Optional) ⭐
**1. Adjust buffer sizes to match POC:**
```typescript
increaseViewportBy={{ top: 2000, bottom: 4000 }}
```

**2. Add overscan:**
```typescript
overscan={500}
```

**3. Add scrollSeekConfiguration:**
```typescript
scrollSeekConfiguration={{
  enter: (velocity) => Math.abs(velocity) > 1000,
  exit: (velocity) => Math.abs(velocity) < 100,
}}
```

**Impact:**
- ✅ Smoother scrolling
- ✅ Better performance
- ✅ Match POC behavior exactly

---

## 🧪 Testing Checklist

### Test Case 1: Load Older Messages (Primary Issue)
```
1. Open chat conversation
2. Wait 300ms (for isMounted)
3. Scroll up to top
4. Wait for older messages to load
5. **Expected**: Scroll stays at top, no jump ✅
6. **Current**: Scroll jumps down ❌
```

### Test Case 2: New Message at Bottom
```
1. Open chat conversation
2. Scroll to bottom
3. Send new message or receive message
4. **Expected**: Auto-scroll to bottom ✅
5. **After Fix Option 1**: No auto-scroll ⚠️
6. **After Fix Option 2**: Auto-scroll works ✅
```

### Test Case 3: New Message at Middle
```
1. Open chat conversation
2. Scroll to middle
3. Receive new message
4. **Expected**: Stay at middle, show "new message" indicator
5. **After Fix**: Should work correctly ✅
```

---

## 📝 Summary

### Root Cause
**`followOutput={() => 'smooth'}`** in Production causes Virtuoso to auto-scroll to bottom whenever state changes, including when loading older messages at top!

### Key Differences POC vs Production
1. **followOutput**: `false` vs `'smooth'` ← **PRIMARY ISSUE**
2. Height calculation: Same now (both use fixed heights)
3. Prepend logic: Similar (both correct)
4. Buffer sizes: Different (minor impact)

### Recommended Fix
**Phase 2: Smart conditional followOutput**
```typescript
followOutput={(isAtBottom) => {
  setAtBottom(isAtBottom);
  const isScrollingUp = lastScrollDirectionRef.current === 'up';
  return (isScrollingUp || !isAtBottom) ? false : 'smooth';
}}
```

This gives:
- ✅ No scroll jump when loading older messages
- ✅ Auto-scroll when at bottom and new messages arrive
- ✅ Best UX

---

## 🎯 Next Steps

1. ✅ Create this comparison document
2. ⬜ Implement Phase 1 (Quick Fix)
3. ⬜ Test Phase 1
4. ⬜ Implement Phase 2 (Smart followOutput)
5. ⬜ Test Phase 2
6. ⬜ Optionally implement Phase 3
7. ⬜ Final testing

**Ready to implement fixes!** 🚀
