# แผนแก้ไขปัญหา "Zero-sized element" ในอัลบั้ม

## 📋 สรุปปัญหา

เมื่อแสดงอัลบั้ม (หลายรูป/วิดีโอในข้อความเดียว) เกิด warning:
```
react-virtuoso: Zero-sized element, this should not happen
```

และทำให้เว็บกระตุกตอนเลื่อน (scroll janking)

---

## 🔍 สาเหตุรากของปัญหา

### 1. **Mismatch ระหว่าง itemSize() และ DOM จริง**

**สิ่งที่เกิดขึ้น:**
- อัลบั้มที่มี 3 รูป จะมี 3 messages แยกกัน แต่ถูก group เป็นอัลบั้มเดียว:
  ```
  Message 1: album_id="abc", album_position=0, album_total=3  ← แสดงอัลบั้มทั้งหมด
  Message 2: album_id="abc", album_position=1, album_total=3  ← ซ่อน (return <div height:0>)
  Message 3: album_id="abc", album_position=2, album_total=3  ← ซ่อน (return <div height:0>)
  ```

**ปัญหา:**
- ใน `MessageItem.tsx` (บรรทัด 76):
  ```tsx
  if (albumPosition === 0) {
    return renderAlbum(albumId, albumMessages); // ✅ Render อัลบั้ม (height ~200-400px)
  } else {
    return <div style={{ height: 0, overflow: 'hidden' }} />; // ⚠️ Return div ที่ height=0
  }
  ```

- แต่ใน `VirtualMessageList.tsx` (บรรทัด 438-455) ฟังก์ชัน `itemSize()`:
  ```tsx
  itemSize={(el) => {
    const message = deduplicatedMessages[index];
    // ...
    return estimateMessageHeight(message); // ⚠️ คืน 220px สำหรับทุก album messages
  }}
  ```

**ผลลัพธ์:**
- **Message position 0**: Virtuoso คิดว่าสูง 220px → DOM จริงสูง ~250px ✅ พอรับได้
- **Message position 1**: Virtuoso คิดว่าสูง 220px → DOM จริงสูง 0px ❌ **MISMATCH!**
- **Message position 2**: Virtuoso คิดว่าสูง 220px → DOM จริงสูง 0px ❌ **MISMATCH!**

→ Virtuoso สับสน เลยโยน warning "Zero-sized element"

---

### 2. **การประมาณความสูงอัลบั้มไม่แม่นยำ**

ใน `useMessageHeightCache.ts` (บรรทัด 39-42):
```tsx
if (albumPosition === 0) {
  return 220; // ⚠️ ใช้ 220px แบบ hardcoded ไม่ว่าจะมีกี่รูป
}
```

**ความสูงจริงของอัลบั้ม** (วัดจาก CSS):
| จำนวนรูป | Layout Class | ความสูงโดยประมาณ |
|----------|--------------|-------------------|
| 1 รูป    | album-grid-1 | ~400px (1 คอลัมน์ เต็ม) |
| 2 รูป    | album-grid-2 | ~200px (1x2 grid) |
| 3 รูป    | album-grid-3 | ~270px (1 ใหญ่ + 2 เล็ก) |
| 4 รูป    | album-grid-4 | ~200px (2x2 grid) |
| 5-6 รูป  | album-grid-5-6 | ~300px (3 คอลัมน์) |
| 7-10 รูป | album-grid-7-10 | ~350px (3x3 grid) |

→ ใช้ 220px แบบเดียวกันทั้งหมดทำให้ไม่แม่นยำ → เกิด layout shift

---

### 3. **CSS aspect-ratio อาจสร้าง 0 height ชั่วคราว**

ใน `index.css`:
```css
.album-item {
  aspect-ratio: 1; /* ถ้า width = 0 → height = 0 */
}
```

และใน `AlbumMessage.tsx`:
```tsx
<img src={thumbnailUrl} loading="lazy" />
```

**ปัญหา:**
- รูปภาพโหลดแบบ lazy → อาจยังไม่มีขนาดตอน initial render
- Parent container ยังไม่ได้คำนวณความกว้าง → width = 0 → height = 0 ชั่วขณะ
- ทำให้ Virtuoso วัดความสูงผิดพลาด

---

## ✅ แผนการแก้ไข (5 ขั้นตอน)

### **ขั้นตอนที่ 1: แก้ itemSize() ให้คืน 0 สำหรับ album position > 0**

**ไฟล์:** `src/components/shared/VirtualMessageList.tsx`

**เป้าหมาย:** ทำให้ itemSize() คืนค่าที่ตรงกับ DOM จริง

**ก่อนแก้ไข:**
```tsx
itemSize={(el) => {
  const message = deduplicatedMessages[index];
  if (!message) return 100;

  // ⚠️ ไม่มีการตรวจสอบ album position
  return estimateMessageHeight(message); // คืน 220px สำหรับทุก album messages
}}
```

**หลังแก้ไข:**
```tsx
itemSize={(el) => {
  const message = deduplicatedMessages[index];
  if (!message) return 100;

  // ✅ เพิ่มการตรวจสอบ album position
  const albumId = message.metadata?.album_id;
  const albumPosition = message.metadata?.album_position;

  if (albumId !== undefined && albumPosition !== undefined && albumPosition > 0) {
    // Messages ที่มี position > 0 ไม่มี DOM จริง (height = 0)
    return 0; // ✅ คืน 0 ตรงกับ DOM
  }

  // ต่อด้วยการตรวจสอบ cache และ estimate ตามเดิม
  if (USE_HEIGHT_CACHE.current && message.id) {
    const cachedHeight = heightCache.current.get(message.id);
    if (cachedHeight) {
      cacheHits.current++;
      return cachedHeight;
    }
    cacheMisses.current++;
  }

  return estimateMessageHeight(message);
}}
```

**ผลลัพธ์:**
- Message position 0: คืน ~220-350px (ขึ้นกับจำนวนรูป)
- Message position 1,2,3,...: คืน 0px ✅ ตรงกับ DOM

---

### **ขั้นตอนที่ 2: ปรับ estimateMessageHeight() ให้คำนวณความสูงแม่นยำขึ้น**

**ไฟล์:** `src/hooks/useMessageHeightCache.ts`

**เป้าหมาย:** คำนวณความสูงตามจำนวนรูปจริง (metadata.album_total)

**ก่อนแก้ไข:**
```tsx
if (albumId !== undefined && albumPosition !== undefined) {
  if (albumPosition === 0) {
    return 220; // ⚠️ hardcoded ไม่แม่นยำ
  } else {
    return 0;
  }
}
```

**หลังแก้ไข:**
```tsx
if (albumId !== undefined && albumPosition !== undefined) {
  if (albumPosition === 0) {
    // ✅ คำนวณจากจำนวนรูปจริง
    const albumTotal = message.metadata?.album_total || 1;
    return estimateAlbumHeight(albumTotal);
  } else {
    return 0;
  }
}

// ✅ ฟังก์ชันใหม่: คำนวณความสูงอัลบั้มตามจำนวนรูป
function estimateAlbumHeight(photoCount: number): number {
  // Base height: grid + padding + caption + metadata
  const baseHeight = 100; // padding + caption + metadata (~100px)

  // Grid height based on photo count
  let gridHeight = 0;
  if (photoCount === 1) {
    gridHeight = 300; // 1 คอลัมน์ เต็ม
  } else if (photoCount === 2) {
    gridHeight = 150; // 1x2 grid (aspect-ratio: 1)
  } else if (photoCount === 3) {
    gridHeight = 200; // 1 ใหญ่ + 2 เล็ก
  } else if (photoCount === 4) {
    gridHeight = 150; // 2x2 grid
  } else if (photoCount <= 6) {
    gridHeight = 250; // 3 คอลัมน์, 2 แถว
  } else {
    gridHeight = 300; // 3x3 grid
  }

  return baseHeight + gridHeight;
}
```

**ผลลัพธ์:**
- 1 รูป: ~400px (แทนที่ 220px)
- 2 รูป: ~250px
- 3 รูป: ~300px
- 4 รูป: ~250px
- 5-6 รูป: ~350px
- 7-10 รูป: ~400px

→ แม่นยำกว่าเดิมมาก ลด layout shift

---

### **ขั้นตอนที่ 3: เพิ่ม min-height ใน CSS**

**ไฟล์:** `src/index.css`

**เป้าหมาย:** ป้องกัน 0 height ตอน initial render

**เพิ่มโค้ดนี้:**
```css
/* Album Grid Base */
.album-grid {
  display: grid;
  gap: 4px;
  border-radius: 12px;
  overflow: hidden;
  background: hsl(var(--muted));
  min-height: 150px; /* ✅ เพิ่ม min-height ป้องกัน 0 height */
}

/* แต่ละ layout class ก็เพิ่ม min-height */
.album-grid-1 {
  grid-template-columns: 1fr;
  max-width: 400px;
  min-height: 300px; /* ✅ 1 รูป ต้องมีความสูงขั้นต่ำ */
}

.album-grid-2 {
  grid-template-columns: 1fr 1fr;
  max-width: 400px;
  min-height: 150px; /* ✅ 2 รูป */
}

.album-grid-3 {
  grid-template-columns: 2fr 1fr;
  grid-template-rows: 1fr 1fr;
  max-width: 400px;
  min-height: 200px; /* ✅ 3 รูป */
}

.album-grid-4 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  max-width: 400px;
  min-height: 150px; /* ✅ 4 รูป */
}

.album-grid-5-6 {
  grid-template-columns: repeat(3, 1fr);
  max-width: 450px;
  min-height: 250px; /* ✅ 5-6 รูป */
}

.album-grid-7-10 {
  grid-template-columns: repeat(3, 1fr);
  max-width: 450px;
  min-height: 300px; /* ✅ 7-10 รูป */
}
```

**ผลลัพธ์:**
- แม้รูปภาพยังโหลดไม่เสร็จ → grid ก็มีความสูงขั้นต่ำอยู่แล้ว
- ลด layout shift ตอนโหลดรูป

---

### **ขั้นตอนที่ 4: ปรับ renderAlbum() ให้มี inline style**

**ไฟล์:** `src/hooks/useAlbumRenderer.tsx`

**เป้าหมาย:** ให้แน่ใจว่า wrapper div มี min-height ตั้งแต่ render

**ก่อนแก้ไข:**
```tsx
return (
  <div
    key={`album-${albumId}`}
    data-message-id={firstMessage.id}
    className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 py-1`}
  >
```

**หลังแก้ไข:**
```tsx
// ✅ คำนวณ min-height ตามจำนวนรูป
const albumTotal = albumMessages[0]?.metadata?.album_total || albumMessages.length;
const minHeight = estimateAlbumHeight(albumTotal);

return (
  <div
    key={`album-${albumId}`}
    data-message-id={firstMessage.id}
    className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 py-1`}
    style={{ minHeight: `${minHeight}px` }} // ✅ เพิ่ม inline min-height
  >
```

**หมายเหตุ:** ต้อง import `estimateAlbumHeight` จาก utils หรือสร้างใหม่ในไฟล์นี้

---

### **ขั้นตอนที่ 5: ทดสอบและตรวจสอบ**

**สิ่งที่ต้องทดสอบ:**

1. **ไม่มี warning "Zero-sized element" ใน console**
   - เปิด DevTools → Console
   - เลื่อนดูอัลบั้ม → ไม่ควรมี warning

2. **การเลื่อนไม่กระตุก**
   - Load อัลบั้มหลายๆ อัน
   - เลื่อนขึ้น-ลง ดูว่ามี janking หรือไม่

3. **ความสูงถูกต้อง**
   - ตรวจสอบใน console log ว่า estimated height ≈ actual height
   - ดู cache hit rate ว่าสูงขึ้นหรือไม่

4. **อัลบั้มแสดงผลถูกต้อง**
   - ทดสอบอัลบั้ม 1-10 รูป
   - คลิกเปิด lightbox ได้ปกติ

---

## 🎯 ผลลัพธ์ที่คาดหวัง

### ก่อนแก้ไข:
```
[Virtuoso] Message 1 (position=0): estimated=220px, actual=268px → Shift! 🔴
[Virtuoso] Message 2 (position=1): estimated=220px, actual=0px   → WARNING! ⚠️
[Virtuoso] Message 3 (position=2): estimated=220px, actual=0px   → WARNING! ⚠️
→ Scroll janking, layout shift
```

### หลังแก้ไข:
```
[Virtuoso] Message 1 (position=0): estimated=300px, actual=268px → Good! ✅
[Virtuoso] Message 2 (position=1): estimated=0px, actual=0px     → Perfect! ✅
[Virtuoso] Message 3 (position=2): estimated=0px, actual=0px     → Perfect! ✅
→ Smooth scrolling, no warnings
```

---

## 📊 ตารางสรุปการเปลี่ยนแปลง

| ไฟล์ | ฟังก์ชัน/บรรทัด | การเปลี่ยนแปลง | ผลลัพธ์ |
|------|------------------|----------------|----------|
| `VirtualMessageList.tsx` | `itemSize()` (438) | เพิ่มการตรวจสอบ album_position > 0 → คืน 0 | แก้ warning "Zero-sized element" |
| `useMessageHeightCache.ts` | `estimateMessageHeight()` (32) | เพิ่มฟังก์ชัน `estimateAlbumHeight()` คำนวณตามจำนวนรูป | ลด layout shift |
| `index.css` | `.album-grid-*` | เพิ่ม min-height ให้ทุก layout class | ป้องกัน 0 height ตอน loading |
| `useAlbumRenderer.tsx` | `renderAlbum()` (92) | เพิ่ม inline style minHeight | ให้แน่ใจว่ามีความสูงตั้งแต่แรก |

---

## 🔧 ขั้นตอนการทำงาน (Implementation Order)

1. ✅ **เริ่มจาก useMessageHeightCache.ts** (เพิ่มฟังก์ชัน estimateAlbumHeight)
2. ✅ **แก้ VirtualMessageList.tsx** (itemSize() ตรวจสอบ position > 0)
3. ✅ **แก้ index.css** (เพิ่ม min-height)
4. ✅ **แก้ useAlbumRenderer.tsx** (เพิ่ม inline minHeight)
5. ✅ **ทดสอบ** (เปิด console ดู warning และ scroll performance)

---

## ❓ คำถามสำหรับการยืนยัน

1. **คุณต้องการให้ผมแก้ไขทั้ง 5 ขั้นตอนเลยหรือไม่?**
2. **หรือจะแก้ทีละขั้นตอน แล้วทดสอบก่อน?**
3. **มี CSS อื่นๆ ที่คุณใช้สำหรับอัลบั้มหรือไม่?** (เช่น Tailwind classes)

---

## 📝 หมายเหตุเพิ่มเติม

- **Performance:** การคำนวณ album height แม่นยำขึ้นจะช่วยลด cache misses และเพิ่ม cache hit rate
- **UX:** scroll ที่ smooth ขึ้นจะทำให้ผู้ใช้รู้สึกว่าแอปเร็วและ responsive
- **Maintenance:** แยกฟังก์ชัน estimateAlbumHeight ออกมาจะทำให้ปรับแต่งภายหลังง่ายขึ้น

---

**พร้อมเริ่มแก้ไขเมื่อคุณยืนยัน!** 🚀
