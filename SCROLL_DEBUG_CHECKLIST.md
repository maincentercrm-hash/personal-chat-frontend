# 🐛 Scroll Debug Checklist

## ปัญหา: Scroll Up/Down ไม่เรียก API load message

---

## ✅ Step-by-Step Debug

### 1. เปิด Console (F12) และ scroll up/down

**ตรวจสอบว่าเห็น logs ไหน:**

#### ✅ ควรเห็น (ถ้า VirtualMessageList ทำงาน):
```
[POC Pattern] 🔝 atTopStateChange: true | canLoadMore: true, isMounted: true
[POC Pattern] ⬆️ Calling onLoadMore directly
```

#### ✅ ควรเห็น (ถ้า Parent component ทำงาน):
```
🔄 handleLoadMoreMessages called | conversationId: xxx | isLoading: false
```

#### ❌ ถ้าไม่เห็นอะไรเลย:
- **ปัญหา**: atTopStateChange ไม่ fire → Layout issue หรือ Virtuoso ไม่ detect scroll

---

### 2. ตรวจสอบ Layout Issues

#### A. เช็ค Sidebar Overlap

**ปัญหาที่เป็นไปได้:**
- Sidebar อาจจะทับ MessageArea
- z-index ทำให้ scroll events ไม่ถูกส่งไป VirtualMessageList

**วิธีเช็ค:**
1. เปิด DevTools (F12)
2. คลิก Elements tab
3. Inspect MessageArea (hover ดูว่ามีพื้นที่กี่ pixel)
4. เช็คว่า Sidebar ทับหรือไม่

**ถ้าทับ → แก้ z-index หรือ margin**

---

#### B. เช็ค Height/Overflow

**ตรวจสอบ MessageArea:**
```
1. Inspect MessageArea element
2. เช็ค computed styles:
   - height: ควรเป็น fixed height (เช่น 100vh - header - input)
   - overflow: ควรเป็น hidden (Virtuoso จัดการเอง)
   - position: relative หรือ absolute
```

**ถ้า height = 0px หรือ auto → ปัญหา!**

---

#### C. เช็ค Virtuoso Container

**ตรวจสอบ Virtuoso element:**
```
1. Inspect <div class="virtuoso-scroller"> (ใน VirtualMessageList)
2. เช็ค:
   - height: ควรเป็น 100%
   - overflow-y: auto หรือ scroll
   - มี scrollbar ไหม
```

**ถ้าไม่มี scrollbar → Virtuoso ไม่ได้รับ height จาก parent!**

---

### 3. ตรวจสอบ Props

#### เช็คว่า onLoadMore ถูกส่งมาหรือไม่:

**เพิ่ม console.log ใน VirtualMessageList.tsx (Line ~90):**
```typescript
console.log('[DEBUG] VirtualMessageList props:', {
  onLoadMore: !!onLoadMore,
  onLoadMoreAtBottom: !!onLoadMoreAtBottom,
  messagesCount: messages.length,
  activeConversationId: _activeConversationId
});
```

**ถ้า onLoadMore = false → Parent ไม่ส่ง callback มา!**

---

### 4. ตรวจสอบ isMountedRef

#### เช็คว่า isMountedRef เป็น true หรือไม่:

**เพิ่ม console.log ใน conversation change effect (Line ~163):**
```typescript
useEffect(() => {
  if (initialScrollDoneRef.current !== _activeConversationId && _activeConversationId) {
    console.log('[DEBUG] Conversation changed:', {
      from: initialScrollDoneRef.current,
      to: _activeConversationId,
      isMounted: isMountedRef.current
    });

    // ... existing code ...

    const timer = setTimeout(() => {
      isMountedRef.current = true;
      console.log('[DEBUG] isMountedRef set to TRUE after 500ms');
    }, 500);

    return () => clearTimeout(timer);
  }
}, [_activeConversationId]);
```

**ถ้าไม่เห็น logs → useEffect ไม่ fire!**

---

### 5. ตรวจสอบ ChatLayout

**ปัญหาที่เป็นไปได้:**
- ChatLayout มี Sidebar ที่ block scroll
- Flex layout ทำให้ MessageArea ไม่มี height

**ตรวจสอบ:**
```typescript
// ChatLayout structure ควรเป็น:
<div className="flex h-screen">
  <Sidebar /> {/* Fixed width */}
  <main className="flex-1 flex flex-col"> {/* Take remaining space */}
    <Header /> {/* Fixed height */}
    <MessageArea className="flex-1 overflow-hidden" /> {/* Take remaining height */}
    <MessageInput /> {/* Fixed height */}
  </main>
</div>
```

---

## 🔍 Quick Test

### Test 1: เช็ค atTopStateChange fire หรือไม่

**เพิ่ม alert ใน atTopStateChange (Line ~796):**
```typescript
atTopStateChange={(atTop) => {
  if (atTop) {
    alert('atTopStateChange FIRED!'); // ← เพิ่ม alert
    console.log(`[POC Pattern] 🔝 atTopStateChange: ${atTop}`);
  }
  // ...
}}
```

**Scroll up ไปบนสุด:**
- ✅ ถ้าเห็น alert → atTopStateChange fire (ปัญหาอยู่ที่ props หรือ logic)
- ❌ ถ้าไม่เห็น alert → Virtuoso ไม่ detect scroll (ปัญหาที่ layout!)

---

### Test 2: เช็ค onLoadMore ถูกเรียกหรือไม่

**เพิ่ม alert ใน handleLoadMoreMessages (useConversationPageLogic.ts Line ~378):**
```typescript
const handleLoadMoreMessages = useCallback(async () => {
  alert('handleLoadMoreMessages CALLED!'); // ← เพิ่ม alert
  console.log('🔄 handleLoadMoreMessages called');
  // ...
}, [conversationId, isLoadingMoreMessages]);
```

**Scroll up ไปบนสุด:**
- ✅ ถ้าเห็น alert → callback ถูกเรียก (ปัญหาอยู่ที่ API call)
- ❌ ถ้าไม่เห็น alert → callback ไม่ถูกเรียก (ปัญหาที่ VirtualMessageList!)

---

## 🎯 สรุป Debug Flow

```
1. User scrolls up
   ↓
2. Virtuoso detects scroll position
   ↓
3. atTopStateChange(true) fires? → เช็ค Test 1
   ↓ YES
4. Check: atTop && onLoadMore && isMountedRef.current?
   ↓ YES
5. Call: onLoadMore() → เช็ค Test 2
   ↓ YES
6. handleLoadMoreMessages executes
   ↓
7. API call
   ↓
8. Messages loaded
```

**ถ้า step ไหนไม่ผ่าน → ปัญหาอยู่ที่นั่น!**

---

## 💡 Solution ตามปัญหา

### ถ้า atTopStateChange ไม่ fire (Test 1 ไม่ผ่าน):

**→ ปัญหา: Layout Issue**

**แก้ไข:**
1. เช็ค MessageArea height
2. เช็ค Virtuoso container height
3. เช็ค Sidebar overlap
4. เช็ค ChatLayout flex structure

---

### ถ้า atTopStateChange fire แต่ onLoadMore ไม่ถูกเรียก (Test 1 ผ่าน, Test 2 ไม่ผ่าน):

**→ ปัญหา: Props หรือ Logic Issue**

**แก้ไข:**
1. เช็คว่า `onLoadMore` prop ถูกส่งมา (add console.log)
2. เช็คว่า `isMountedRef.current === true` (add console.log)
3. เช็คว่า condition ใน if statement ผ่านหรือไม่

---

### ถ้าทั้ง Test 1 และ Test 2 ผ่าน แต่ messages ไม่โหลด:

**→ ปัญหา: API Call Issue**

**แก้ไข:**
1. เช็ค Network tab ว่ามี API call ไหม
2. เช็ค response ว่าได้ data ไหม
3. เช็ค error ใน console

---

## 📋 Next Steps

1. ✅ ทดสอบ Test 1 (alert ใน atTopStateChange)
2. ✅ ทดสอบ Test 2 (alert ใน handleLoadMoreMessages)
3. ✅ ส่ง console logs + screenshots มาให้ผมดู
4. ✅ ผมจะแก้ให้ตามปัญหาที่เจอ

---

**กรุณาทดสอบ Test 1 และ Test 2 แล้วส่งผลมาครับ! 🙏**
