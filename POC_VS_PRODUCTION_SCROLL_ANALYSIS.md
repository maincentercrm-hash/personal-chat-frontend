# POC vs Production: Scroll Loading Analysis

## 🎯 สรุปปัญหา

**อาการ**: เมื่อกด F5 แล้ว scroll up ไปบนสุด **ไม่โหลดข้อความเก่า** ต้อง scroll down ก่อนถึงจะโหลดได้

**Timeline**: ปัญหาเกิดหลังจากทำ Forward Message feature

---

## 📊 เปรียบเทียบ POC vs Production

### 1. isMountedRef Setup

#### POC (Working) ✅
```typescript
// Line 44-52
useEffect(() => {
  const timer = setTimeout(() => {
    isMountedRef.current = true;
    console.log('[POC] ✅ Component mounted, auto-load enabled');
  }, 500);

  return () => clearTimeout(timer);
}, []); // ← ไม่มี dependency!
```

**ข้อดี:**
- Fire **เพียงครั้งเดียว** ตอน initial mount
- หลังจาก 500ms → `isMountedRef.current` = true → scroll up ได้เลย
- ไม่มี race condition

#### Production (Broken) ❌
```typescript
// Line 181-188
useEffect(() => {
  const timer = setTimeout(() => {
    isMountedRef.current = true;
    console.log('[debug_scroll] ✅ Component fully mounted...');
  }, 500);

  return () => clearTimeout(timer);
}, [_activeConversationId]); // ← มี dependency!
```

**ปัญหา:**
1. **Multiple Fires**: ทุกครั้งที่ `_activeConversationId` เปลี่ยน → clearTimeout → setTimeout ใหม่
2. **Race Condition Timeline**:
   ```
   t=0ms:    Component mount → _activeConversationId = undefined
   t=0ms:    useEffect fire → setTimeout 500ms (Timer A)
   t=200ms:  State sync → _activeConversationId = "abc"
   t=200ms:  useEffect fire ใหม่! → clearTimeout(Timer A) → setTimeout 500ms ใหม่ (Timer B)
   t=500ms:  Timer A ถูก cancel แล้ว ไม่ fire
   t=700ms:  Timer B fire → isMountedRef.current = true
   ```
3. **User Impact**: ถ้า user scroll ภายใน 700ms → `isMountedRef.current` = false → **SKIP!**
4. **Additional Reset**: Line 171 reset `isMountedRef.current = false` ตอนเปลี่ยน conversation แต่ไม่มี setTimeout ใหม่!

---

### 2. atTopStateChange Handler

#### POC (Working) ✅
```typescript
// Line 120-133
const handleAtTopStateChange = (atTop: boolean) => {
  if (atTop) {
    console.log(`[POC] 🔝 atTopStateChange: ${atTop} | isMounted: ${isMountedRef.current}, isLoading: ${isLoading}`);
  }

  // ✅ Call onLoadMore DIRECTLY
  if (atTop && !isLoading && isMountedRef.current) {
    console.log('[POC] ⬆️ Triggering load more');
    onLoadMore(); // ← DIRECT call!
  } else if (atTop && !isMountedRef.current) {
    console.log('[POC] ⏸️ Skipping auto-load on initial mount');
  }
};
```

**Flow:**
1. Check `isLoading` (from parent state)
2. Check `isMountedRef.current`
3. Call `onLoadMore()` **โดยตรง**

#### Production (Broken) ❌
```typescript
// Line 795-809
atTopStateChange={(atTop) => {
  if (atTop) {
    console.log(`[debug_scroll] 🔝 atTopStateChange: ${atTop} | isLoading: ${isLoadingMore}, isMounted: ${isMountedRef.current}`);
  }

  // ❌ Call through wrapper with DOUBLE CHECK
  if (atTop && !isLoadingMore && isMountedRef.current) {
    handleLoadMore(); // ← Call wrapper!
  } else if (atTop && !isMountedRef.current) {
    console.log(`[debug_scroll] ⏸️ Skipping auto-load on initial mount`);
  }
}}
```

**handleLoadMore (Line 391-408):**
```typescript
const handleLoadMore = useCallback(async () => {
  if (!onLoadMore || isLoadingMore) { // ← CHECK อีกครั้ง!
    return;
  }

  console.log('[debug_scroll] ⬆️ Load more at TOP triggered');
  setIsLoadingMore(true);

  try {
    await Promise.resolve(onLoadMore());
  } finally {
    setIsLoadingMore(false);
  }
}, [onLoadMore, isLoadingMore]);
```

**ปัญหา: Double `isLoadingMore` Check**

1. **First Check** (Line 804): `if (atTop && !isLoadingMore && isMountedRef.current)`
2. **Second Check** (Line 392): `if (!onLoadMore || isLoadingMore) return`

**Race Condition:**
```
t=0ms:  atTopStateChange fires
        → Check: isLoadingMore = false ✅
        → Pass → Call handleLoadMore()

t=1ms:  (Meanwhile) Something else sets isLoadingMore = true

t=2ms:  handleLoadMore executes
        → Check: isLoadingMore = true ❌
        → SKIP! No API call!
```

---

### 3. Conversation Change Handling

#### POC (Working) ✅
- **ไม่มี conversation change** (เป็น standalone page)
- `isMountedRef` ถูก setup ครั้งเดียวตอน mount
- Simple และ predictable

#### Production (Broken) ❌
```typescript
// Line 162-178: Conversation change effect
useEffect(() => {
  if (initialScrollDoneRef.current !== _activeConversationId) {
    console.log('[debug_scroll] 🔄 Conversation changed, reinitializing...');

    // Reset everything
    isMountedRef.current = false; // ← Reset to false

    // ... clear cache, reset state ...
  }
}, [_activeConversationId]);

// Line 181-188: isMountedRef setup (ซ้ำซ้อน!)
useEffect(() => {
  const timer = setTimeout(() => {
    isMountedRef.current = true;
  }, 500);
  return () => clearTimeout(timer);
}, [_activeConversationId]); // ← Fire ทุกครั้งที่ conversation เปลี่ยน
```

**ปัญหา: Two useEffects with Same Dependency**

1. **Effect #1** (Line 162): Reset `isMountedRef = false` + clear cache
2. **Effect #2** (Line 181): setTimeout 500ms → set `isMountedRef = true`

**Execution Order:**
```
เมื่อ _activeConversationId เปลี่ยน:
1. Effect #1 fire → isMountedRef = false
2. Effect #2 fire → clearTimeout (previous) → setTimeout 500ms ใหม่
3. รอ 500ms
4. Timer fire → isMountedRef = true

ถ้า user scroll ภายใน 500ms → SKIP!
```

---

## 🔍 Forward Message มีผลต่อ Scroll หรือไม่?

### Architecture

```
ConversationPageDemo
  └─ MessageArea
       ├─ MessageSelectionProvider (Forward Message Context)
       │    └─ MessageSelectionToolbar (Forward UI)
       └─ VirtualMessageList (Scroll handling)
```

### Analysis

#### 1. MessageSelectionContext (Forward Message)
- **Purpose**: จัดการ multi-select messages สำหรับ Forward
- **State**: `selectedMessages`, `isSelectionMode`, `handleSelectMessage`
- **Impact on Scroll**: **ไม่เกี่ยวข้องโดยตรง**

**เหตุผล:**
- Context ไม่ได้แทรกแซง scroll handlers
- ไม่ได้ modify `isMountedRef` หรือ `isLoadingMore`
- ไม่ได้เปลี่ยน `_activeConversationId`

#### 2. Timeline of Events

**ก่อนทำ Forward Message:**
- VirtualMessageList มี scroll logic ที่ทำงานปกติ
- อาจจะมี bugs แฝง แต่ยังไม่เห็นอาการ

**หลังทำ Forward Message:**
- เพิ่ม MessageSelectionProvider wrapper
- **อาจจะมีการ refactor VirtualMessageList** → เปลี่ยน scroll logic
- ปัญหา scroll เริ่มปรากฏ

#### 3. สมมติฐาน (Hypothesis)

**Forward Message ไม่ได้ทำให้ scroll พัง โดยตรง**

แต่:
1. **Timing Coincidence**: ปัญหา scroll มีอยู่แล้ว (dependency bug) แต่ยังไม่เห็นอาการ
2. **Refactor Side Effects**: ตอนทำ Forward Message อาจจะมีการ refactor code ที่เกี่ยวกับ:
   - Message rendering
   - Context structure
   - State management
   - **isMountedRef logic** (เปลี่ยนจาก `[]` เป็น `[_activeConversationId]`)
3. **Test Scenario Changed**: ก่อนหน้านี้อาจจะไม่ได้ทดสอบ F5 + instant scroll up

---

## 🐛 Root Causes Identified

### Primary Issue: isMountedRef Timing

**Problem:**
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    isMountedRef.current = true;
  }, 500);
  return () => clearTimeout(timer);
}, [_activeConversationId]); // ← นี่คือปัญหา!
```

**Why it breaks:**
1. เมื่อ `_activeConversationId` เปลี่ยนหลายครั้งระหว่าง mount (common ใน async app)
2. แต่ละครั้ง → clearTimeout → setTimeout ใหม่
3. รวมแล้วใช้เวลา **700ms+** แทนที่จะเป็น 500ms
4. User scroll ภายใน 700ms → skip

**Impact:**
- ❌ F5 + immediate scroll up → SKIP
- ❌ เปลี่ยน conversation เร็วๆ → SKIP
- ⚠️ ถ้า state sync ช้า → อาจจะใช้เวลานานกว่า 1 วินาที

### Secondary Issue: Double isLoadingMore Check

**Problem:**
```typescript
// Check #1 (atTopStateChange)
if (atTop && !isLoadingMore && isMountedRef.current) {
  handleLoadMore();
}

// Check #2 (handleLoadMore)
if (!onLoadMore || isLoadingMore) return;
```

**Why it's problematic:**
- สร้าง race condition ถ้ามี multiple scroll events
- ซับซ้อนโดยไม่จำเป็น (POC ไม่มี double check)
- ทำให้ debug ยาก

---

## ✅ Solutions

### Solution 1: Fix isMountedRef (Match POC) ⭐ RECOMMENDED

```typescript
// ❌ REMOVE: useEffect with [_activeConversationId] dependency
// แทนที่ด้วย:

// ✅ Setup once on initial mount (match POC)
useEffect(() => {
  const timer = setTimeout(() => {
    isMountedRef.current = true;
    console.log('[debug_scroll] ✅ Component mounted, auto-load enabled');
  }, 500);
  return () => clearTimeout(timer);
}, []); // ← NO dependency

// ✅ Reset when conversation changes
useEffect(() => {
  if (initialScrollDoneRef.current !== _activeConversationId && _activeConversationId) {
    console.log('[debug_scroll] 🔄 Conversation changed, reinitializing...');

    // Reset
    isMountedRef.current = false;

    // Re-enable after 500ms
    const timer = setTimeout(() => {
      isMountedRef.current = true;
      console.log('[debug_scroll] ✅ New conversation ready');
    }, 500);

    return () => clearTimeout(timer);
  }
}, [_activeConversationId]);
```

**Benefits:**
- ✅ Match POC pattern exactly
- ✅ Predictable timing (always 500ms)
- ✅ No race conditions
- ✅ Works for both initial mount and conversation change

---

### Solution 2: Remove Double isLoadingMore Check ⭐ RECOMMENDED

```typescript
// ✅ OPTION A: Call onLoadMore directly (like POC)
atTopStateChange={(atTop) => {
  if (atTop && onLoadMore && isMountedRef.current) {
    console.log('[debug_scroll] ⬆️ Calling onLoadMore directly');
    onLoadMore(); // ← Direct call
  }
}}

// OR

// ✅ OPTION B: Remove check from atTopStateChange
atTopStateChange={(atTop) => {
  if (atTop && isMountedRef.current) {
    handleLoadMore(); // ← Let handleLoadMore do all checks
  }
}}
```

**Benefits:**
- ✅ Single source of truth for loading state
- ✅ No race conditions
- ✅ Simpler logic

---

### Solution 3: Reduce setTimeout to 200ms (Quick Fix)

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    isMountedRef.current = true;
  }, 200); // ← ลดจาก 500ms → 200ms
  return () => clearTimeout(timer);
}, [_activeConversationId]);
```

**Benefits:**
- ⚡ Quick fix
- ⚠️ Still has race condition ถ้า state sync ช้ากว่า 200ms
- ⚠️ ไม่ได้แก้ root cause

---

## 📋 Recommended Implementation Order

1. **Step 1**: Fix isMountedRef timing (Solution 1) ⭐ HIGH PRIORITY
2. **Step 2**: Remove double check (Solution 2) ⭐ HIGH PRIORITY
3. **Step 3**: Test thoroughly:
   - F5 + immediate scroll up
   - F5 + wait 1 sec + scroll up
   - เปลี่ยน conversation + scroll up
   - Multiple rapid conversation changes

---

## 🧪 Testing Checklist

### Test Case 1: F5 + Immediate Scroll
```
1. เปิด conversation page
2. กด F5
3. ทันที scroll up ไปบนสุดภายใน 500ms
Expected: ⚠️ Skip (by design - prevent auto-load on mount)
Action: Scroll up อีกครั้งหลัง 500ms → ควรโหลด
```

### Test Case 2: F5 + Wait + Scroll
```
1. เปิด conversation page
2. กด F5
3. รอ 1 วินาที
4. Scroll up ไปบนสุด
Expected: ✅ โหลดข้อความเก่าทันที
```

### Test Case 3: Conversation Change
```
1. อยู่ใน conversation A
2. คลิกไป conversation B
3. รอ 500ms
4. Scroll up ไปบนสุด
Expected: ✅ โหลดข้อความเก่าทันที
```

### Test Case 4: Rapid Conversation Changes
```
1. คลิก conversation A
2. ทันทีคลิก conversation B (ภายใน 100ms)
3. ทันทีคลิก conversation C (ภายใน 100ms)
4. รอ 1 วินาที
5. Scroll up ไปบนสุด
Expected: ✅ โหลดข้อความเก่าของ conversation C
```

---

## 📝 Forward Message Impact Summary

### Direct Impact: ❌ None
- Forward Message feature (MessageSelectionContext) **ไม่ได้ทำให้ scroll พัง โดยตรง**
- Context ไม่ได้แทรกแซง scroll logic

### Indirect Impact: ⚠️ Possible
1. **Timing**: เกิดขึ้นหลังจากทำ Forward Message
2. **Refactor**: อาจจะมีการแก้ไข VirtualMessageList ระหว่างทำ Forward
3. **Testing**: Forward Message ทำให้เจอ bug ที่มีอยู่แล้ว (latent bug)

### Conclusion: 🎯
**ปัญหาอยู่ที่ isMountedRef dependency bug ไม่ใช่ Forward Message**

แต่การทำ Forward Message อาจจะ:
- เป็นจุดที่ refactor code และเปลี่ยน dependency
- หรือเป็นจุดที่เริ่มทดสอบ F5 + scroll behavior จริงจัง

---

## ✅ Next Steps

1. ✅ Implement Solution 1 (Fix isMountedRef)
2. ✅ Implement Solution 2 (Remove double check)
3. ✅ Run all test cases
4. ✅ Verify POC pattern match
5. ✅ Deploy and monitor

**Expected Result**: Scroll up ทำงานได้ทันทีหลัง F5 (หลัง 500ms)
