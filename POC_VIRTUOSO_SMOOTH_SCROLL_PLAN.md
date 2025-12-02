# POC: Smooth Scroll with React-Virtuoso (Adapted from react-window techniques)

## 🎯 เป้าหมาย
แก้ปัญหา **Visual Jump / Scroll Jank** ในแชทที่มีความสูงแตกต่างกัน โดยใช้ **react-virtuoso** (ไม่ใช่ react-window)

---

## 📚 เทคนิคหลักจากคำแนะนำ (react-window → react-virtuoso)

### ✅ เทคนิคที่ 1: **Estimate-by-type** (Semi-fixed heights)
**react-window:**
```typescript
const ESTIMATED_BY_TYPE = {
  text: 80,
  image: 140,
  sticker: 140,
  video: 140,
  file: 80,
  reply: 100,
};
```

**react-virtuoso (ของเรา):**
```typescript
// ✅ เรามีแล้วใน POC_HEIGHT_GROUPS!
import { POC_HEIGHT_GROUPS } from '../types/poc.types';

// ใช้เป็น default estimate
const getEstimatedHeight = (message: MessageDTO): number => {
  const isReply = !!(message.reply_to_id || message.reply_to_message);
  const type = isReply ? 'reply' : message.message_type;
  return POC_HEIGHT_GROUPS[type] || POC_HEIGHT_GROUPS.text;
};
```

---

### ✅ เทคนิคที่ 2: **Measure-once + Cache**
**react-window:**
```typescript
const sizeMapRef = useRef<Map<string, number>>(new Map());

// วัดครั้งเดียวใน MeasuredMessage component
useLayoutEffect(() => {
  const ro = new ResizeObserver((entries) => {
    const h = Math.ceil(entries[0].contentRect.height);
    onMeasure(message.id, h);
  });
  ro.observe(node);
}, []);
```

**react-virtuoso (แนะนำ):**
```typescript
// ใช้ Virtuoso's built-in measurement caching
<Virtuoso
  // ✅ DEFAULT: Virtuoso มี auto-measurement built-in
  // แต่เราต้อง "hint" ด้วย defaultItemHeight
  defaultItemHeight={120}

  // ✅ OPTIONAL: กำหนด initial size per item
  initialItemCount={messages.length}

  // ✅ KEY: ใช้ itemSize prop เพื่อให้ estimate ที่ดีกว่า
  itemSize={(index) => {
    const message = messages[index - firstItemIndex];
    return getEstimatedHeight(message);
  }}
/>
```

**📌 ข้อดีของ Virtuoso:**
- มี built-in measurement cache (ไม่ต้องทำเอง!)
- Auto-detect content height changes
- ไม่ต้อง manual `resetAfterIndex`

---

### ✅ เทคนิคที่ 3: **Preserve Scroll Position on Prepend**
**react-window:**
```typescript
async function handleLoadMoreTop() {
  const prevScrollOffset = listRef.current._outerRef.scrollTop;
  const prevScrollHeight = outer.scrollHeight;

  await loadMoreTop();

  requestAnimationFrame(() => {
    const delta = outer.scrollHeight - prevScrollHeight;
    outer.scrollTop = prevScrollOffset + delta;
  });
}
```

**react-virtuoso (ของเราทำแล้ว!):**
```typescript
// ✅ เรามีแล้วใน POCMessageList.tsx:56-92
useLayoutEffect(() => {
  // Detect prepend
  if (currentCount > prevCount && firstMessageId !== prevFirstId) {
    const diff = currentCount - prevCount;

    // Update firstItemIndex
    setFirstItemIndex(prev => prev - diff);
  }
}, [messages.length]);
```

**📌 Virtuoso ทำอัตโนมัติ:**
- เมื่อใช้ `firstItemIndex`, Virtuoso จะ preserve scroll position เอง
- ไม่ต้อง manual scroll adjustment!

---

### ✅ เทคนิคที่ 4: **Inverted Rendering** (rotate 180deg)
**react-window:**
```typescript
<List
  style={{ transform: "rotate(180deg)" }}
>
  {({ index, style }) => (
    <div style={{ ...style, transform: "rotate(180deg)" }}>
      <Row />
    </div>
  )}
</List>
```

**react-virtuoso (มี built-in!):**
```typescript
// ❌ ไม่ต้องใช้ rotate trick!
// ✅ Virtuoso มี property "initialTopMostItemIndex" สำหรับ bottom-anchored

<Virtuoso
  // Scroll to bottom initially
  initialTopMostItemIndex={firstItemIndex + messages.length - 1}

  // ✅ Follow output (auto-scroll to bottom on new message)
  followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
/>
```

**📌 ข้อดี:**
- ไม่ต้อง rotate (clean code!)
- Built-in auto-scroll to bottom
- Natural chat UX

---

### ✅ เทคนิคที่ 5: **Overscan / Buffer**
**react-window:**
```typescript
<List
  overscanCount={8} // render extra items
/>
```

**react-virtuoso:**
```typescript
<Virtuoso
  // ✅ เรามีแล้ว! (POCMessageList.tsx:237)
  increaseViewportBy={{ top: 2000, bottom: 4000 }}
  overscan={500}
/>
```

**📌 Tuning recommendations:**
```typescript
// ปัจจุบัน (เดิม):
increaseViewportBy={{ top: 2000, bottom: 4000 }}
overscan={500}

// ลองเพิ่ม (แก้ jump):
increaseViewportBy={{ top: 4000, bottom: 6000 }}  // +100%
overscan={1000}                                     // +100%
```

---

### ✅ เทคนิคที่ 6: **Clamp Heights** (Predictable sizes)
**react-window (คำแนะนำ):**
```typescript
// Clamp image to fixed dimensions
<div style={{ width: "220px", height: "140px", objectFit: "cover" }}>
  <img />
</div>
```

**react-virtuoso (เราทำแล้วบางส่วน!):**
```typescript
// ✅ เรามีแล้วใน POCMessageItem.tsx:51-56
<div
  style={{
    maxHeight: `${MAX_MEDIA_HEIGHT.image}px`,  // 200px
    minHeight: '160px'
  }}
>
```

**📌 ปรับปรุงให้ predictable มากขึ้น:**
```typescript
// เพิ่ม fixed width + height
style={{
  width: '220px',      // ✅ Fixed width
  height: '140px',     // ✅ Fixed height (ไม่ใช่ max)
  objectFit: 'cover'
}}
```

---

## 🔧 แผนการปรับปรุง POC (Phase by Phase)

### Phase 1: ลด Height Gap (Quick Win) ⚡
**ปัญหา:** Gap 140-160px ระหว่าง types → jump มาก

**แก้:** ลด gap ให้เหลือ 40-60px
```typescript
// poc.types.ts - ปรับให้ใกล้เคียงกัน
export const POC_HEIGHT_GROUPS = {
  text: 80,       // เดิม
  reply: 100,     // ลดจาก 120 → 100
  file: 90,       // ลดจาก 100 → 90
  sticker: 120,   // ลดจาก 160 → 120
  image: 140,     // ลดจาก 220 → 140
  video: 140,     // ลดจาก 220 → 140
  album: 160,     // ลดจาก 240 → 160
};

// ปรับ MAX_MEDIA_HEIGHT ตาม
export const MAX_MEDIA_HEIGHT = {
  image: 120,     // ลดจาก 200 → 120
  video: 120,     // ลดจาก 200 → 120
  album: 140,     // ลดจาก 220 → 140
};
```

**Expected result:**
- Jump ลดลง 50-70%
- ยังเห็นรูป/วิดีโอชัดเจน
- Balance ระหว่าง smooth + realistic

---

### Phase 2: เพิ่ม Buffer (Medium effort) 🚀
**ปัญหา:** Item ถูกลบเร็วเกินไป → jump

**แก้:** เพิ่ม buffer/overscan
```typescript
// POCMessageList.tsx - เพิ่ม buffer
<Virtuoso
  // ปรับจาก:
  increaseViewportBy={{ top: 2000, bottom: 4000 }}
  overscan={500}

  // เป็น:
  increaseViewportBy={{ top: 6000, bottom: 8000 }}  // +200%
  overscan={1500}                                    // +200%

  // ✅ ทำให้:
  // - Item ค้างนานกว่า → ไม่หายทันที
  // - Pre-render มากขึ้น → transition smooth
/>
```

**Trade-off:**
- ✅ Jump ลดลง 30-50%
- ❌ Memory +20-30%

---

### Phase 3: Fixed Width/Height สำหรับ Media (Best for predictability) 🎯
**ปัญหา:** รูป/วิดีโอขนาดไม่แน่นอน → Virtuoso estimate ผิด

**แก้:** กำหนดขนาดตายตัว
```typescript
// POCMessageItem.tsx - Image case
case 'image':
  return (
    <div style={{ height: `${POC_HEIGHT_GROUPS.image}px` }}>
      <div
        style={{
          width: '220px',      // ✅ Fixed
          height: '120px',     // ✅ Fixed (ไม่ใช่ max)
          objectFit: 'cover',
          borderRadius: '12px',
          backgroundColor: '#e5e7eb'
        }}
      >
        {/* แสดงรูปจริง (future) หรือ placeholder */}
        🖼️ รูปภาพ
      </div>
    </div>
  );
```

**Expected result:**
- Virtuoso รู้ขนาดแน่นอน 100%
- Jump เกือบหมดไป (90-95% better)

---

### Phase 4: Tune Scroll Seek Configuration (Advanced) 🔬
**ปัญหา:** Fast scroll ยัง jank

**แก้:** ปรับ scroll seek behavior
```typescript
// POCMessageList.tsx
<Virtuoso
  scrollSeekConfiguration={{
    // เข้า placeholder mode เมื่อ scroll เร็ว
    enter: (velocity) => Math.abs(velocity) > 2000,  // เพิ่มจาก 1000
    exit: (velocity) => Math.abs(velocity) < 50,     // ลดจาก 100

    // แสดง placeholder แทนเนื้อหาจริง (optional)
    change: (_, range) => range.startIndex
  }}
/>
```

---

### Phase 5: Custom Height Cache (Expert level) 💎
**ปัญหา:** Virtuoso auto-measure ยังไม่แม่นพอ

**แก้:** สร้าง manual height cache
```typescript
// hooks/usePOCHeightCache.ts (ใหม่)
export const usePOCHeightCache = () => {
  const cacheRef = useRef<Map<string, number>>(new Map());

  const getHeight = (message: MessageDTO): number => {
    const cached = cacheRef.current.get(message.id);
    if (cached) return cached;

    // Fallback to estimated
    return getEstimatedHeight(message);
  };

  const setHeight = (id: string, height: number) => {
    cacheRef.current.set(id, height);
  };

  return { getHeight, setHeight };
};

// POCMessageItem.tsx - เพิ่ม measurement
useLayoutEffect(() => {
  if (ref.current) {
    const height = ref.current.getBoundingClientRect().height;
    onHeightMeasured(message.id, height);
  }
}, [message.id]);
```

---

## 🎯 แนะนำให้ทำ (Priority Order)

### 🥇 Top Priority (ทำก่อน)
1. **Phase 1: ลด Height Gap** (30 นาที)
   - แก้ที่ `poc.types.ts`
   - ทดสอบทันที
   - Expected: Jump ลด 50-70%

### 🥈 High Priority (ถ้า Phase 1 ยังไม่พอ)
2. **Phase 3: Fixed Width/Height** (1 ชั่วโมง)
   - แก้ที่ `POCMessageItem.tsx`
   - กำหนดขนาดตายตัว
   - Expected: Jump ลด 90%+

### 🥉 Medium Priority (Fine-tuning)
3. **Phase 2: เพิ่ม Buffer** (15 นาที)
   - แก้ที่ `POCMessageList.tsx`
   - เพิ่ม `increaseViewportBy` + `overscan`
   - Expected: Jump ลด 30-50%

### 🏅 Low Priority (Advanced optimization)
4. **Phase 4-5**: ถ้ายังไม่ smooth 100%

---

## 📊 Comparison: react-window vs react-virtuoso

| Feature | react-window | react-virtuoso (เรา) | Status |
|---------|--------------|---------------------|--------|
| Variable heights | ✅ Manual `itemSize` | ✅ Auto + `itemSize` hint | ✅ เรามี |
| Measurement cache | ❌ Manual Map | ✅ Built-in | ✅ ดีกว่า |
| Prepend handling | ❌ Manual scroll adjust | ✅ Auto with `firstItemIndex` | ✅ เรามี |
| Inverted mode | ❌ rotate(180deg) trick | ✅ `initialTopMostItemIndex` | ✅ เรามี |
| Overscan | ✅ `overscanCount` | ✅ `increaseViewportBy` + `overscan` | ✅ เรามี |
| Scroll seek | ❌ ไม่มี | ✅ `scrollSeekConfiguration` | ✅ Bonus! |

**สรุป:** 🏆 **react-virtuoso ดีกว่า react-window สำหรับ chat!**

---

## 🚀 Quick Start (เริ่มเลย!)

### Step 1: ลด Height Gap (ลดจาก 80/120/220/240 → 80/100/140/160)
```bash
# แก้ไฟล์เดียว
src/poc-virtual-scroll/types/poc.types.ts
```

### Step 2: ทดสอบ
```bash
npm run dev
# เปิด POC test page
# Scroll ขึ้นลง ดูว่า jump ลดลงไหม
```

### Step 3: (ถ้ายังไม่พอ) Fixed Media Sizes
```bash
# แก้ไฟล์เดียว
src/poc-virtual-scroll/components/POCMessageItem.tsx
# เปลี่ยน maxHeight → height (fixed)
```

---

## 💡 Pro Tips

### Tip 1: เริ่มจาก Gap ที่เล็กที่สุด
```
Gap 40px → แทบไม่ jump
Gap 60px → jump นิดหน่อย (ยอมรับได้)
Gap 100px+ → jump เห็นชัด ❌
```

### Tip 2: ใช้ Fixed Dimensions สำหรับ Media
```css
/* ❌ Bad (unpredictable) */
max-height: 200px;
width: auto;

/* ✅ Good (predictable) */
width: 220px;
height: 140px;
object-fit: cover;
```

### Tip 3: Monitor Performance
```typescript
// Log ใน console
console.log('[Virtuoso] Rendered items:', range.endIndex - range.startIndex);
console.log('[Virtuoso] Total height:', messages.length * avgHeight);
```

---

**Last Updated**: 2025-12-01
**Status**: Ready to implement Phase 1
**Next**: ลด Height Gap ใน poc.types.ts
