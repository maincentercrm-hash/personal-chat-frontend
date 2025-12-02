# POC: Predictable Height Groups Strategy

## 🎯 เป้าหมาย
ทำให้ Virtual Scroll ลื่นไหลเหมือน LINE / Messenger / Telegram โดยไม่ต้องใช้ Fixed Height แบบเดียวกันทุก message

## 💡 แนวคิดหลัก: "Predictable Height Groups"

### ทำไมต้อง Predictable?
- ✅ Virtualizer รู้ความสูงคร่าว ๆ ล่วงหน้า → คำนวณ scroll position ได้แม่นยำ
- ✅ ไม่ต้องวัด DOM ก่อน render → ไม่มี layout shift
- ✅ Scroll bar ขนาดถูกต้อง → UX ดี
- ❌ ถ้า height random (83px, 273px, 419px, 77px...) → virtualizer งง → กระตุก

### ข้อค้นพบสำคัญจาก POC ปัจจุบัน
🏆 **ตอนนี้ POC ไหลลื่นมากเพราะใช้ 80px หมด!**
- ทุก message type = 80px
- Zero calculation, perfect accuracy
- แต่ไม่ realistic สำหรับแชทจริง (รูป/วิดีโอต้องใหญ่กว่า)

## 📐 Height Groups Strategy

### ระดับความสูงที่กำหนด (Predictable Heights)

```typescript
// Predictable Height Groups
const HEIGHT_GROUPS = {
  text: 80,      // ข้อความ 1-2 บรรทัด
  reply: 120,    // Quote + ข้อความ
  file: 100,     // Icon + ชื่อไฟล์
  sticker: 160,  // สติ๊กเกอร์ขนาดกลาง
  image: 220,    // รูปภาพ (clamped)
  video: 220,    // วิดีโอ (clamped)
  album: 240,    // อัลบั้ม (clamped)
} as const;
```

### ทำไมเลือกตัวเลขเหล่านี้?

1. **text: 80px**
   - เหมือนเดิม (already working perfect!)
   - เหมาะกับข้อความ 1-2 บรรทัด

2. **reply: 120px**
   - Quote box ~40px
   - ข้อความตอบกลับ ~40px
   - Padding + time ~40px
   - = 120px

3. **file: 100px**
   - Icon ~40px
   - ชื่อไฟล์ + ขนาด ~40px
   - Padding ~20px
   - = 100px

4. **sticker: 160px**
   - สติ๊กเกอร์ขนาดกลาง 120x120
   - Padding ~40px
   - = 160px

5. **image/video: 220px**
   - **MAX HEIGHT = 200px** (clamped!)
   - Padding + border ~20px
   - = 220px
   - 📌 ไม่ว่ารูปจะใหญ่แค่ไหน ก็ไม่เกิน 200px

6. **album: 240px**
   - Grid 2x2 หรือ 3x3 (clamped)
   - MAX HEIGHT = 220px
   - Padding ~20px
   - = 240px

## 🔥 กุญแจสำคัญ: Clamp Media Content

### ปัญหาที่ต้องแก้
```typescript
// ❌ ปัญหา: รูปขนาดต่างกันมาก
image1.jpg  → 1080x1920 → 1600px ❌ TOO TALL!
image2.jpg  → 3024x4032 → 4000px ❌ DISASTER!
video1.mp4  → 1920x1080 → 600px  ❌ RANDOM!
```

### วิธีแก้แบบ LINE/Messenger
```css
/* ✅ Clamp ความสูงสูงสุด */
.message-image {
  max-height: 200px;
  width: auto;
  max-width: 100%;
  object-fit: cover;
  border-radius: 12px;
}

.message-video {
  max-height: 200px;
  width: auto;
  max-width: 100%;
  border-radius: 12px;
}

.message-album {
  max-height: 220px;
  overflow: hidden;
  border-radius: 12px;
}
```

### ผลลัพธ์
```typescript
// ✅ หลัง Clamp: ความสูงอยู่ในกรอบ
image1.jpg  → 200px ✓
image2.jpg  → 200px ✓
video1.mp4  → 200px ✓

// Total height with padding
→ 220px (predictable!)
```

## 🏗️ Implementation Plan

### Phase 1: ปรับ Height Groups ใน POC (เริ่มที่นี่)

#### 1.1 อัพเดต poc.types.ts
```typescript
// poc.types.ts
export const POC_HEIGHT_GROUPS = {
  text: 80,
  reply: 120,
  file: 100,
  sticker: 160,
  image: 220,   // ← เปลี่ยนจาก 200
  video: 220,   // ← เพิ่มใหม่
  album: 240,   // ← เปลี่ยนจาก 300
} as const;

// Max content heights (before padding)
export const MAX_MEDIA_HEIGHT = {
  image: 200,
  video: 200,
  album: 220,
} as const;
```

#### 1.2 อัพเดต POCMessageItem.tsx
ปรับความสูงของแต่ละ type ตาม HEIGHT_GROUPS:

```tsx
// Before: ทุก type = 80px ❌
<div style={{ height: '80px' }}>

// After: ใช้ height ตาม type ✓
import { POC_HEIGHT_GROUPS } from '../types/poc.types';

case 'text':
  return <div style={{ height: `${POC_HEIGHT_GROUPS.text}px` }}>

case 'reply':
  return <div style={{ height: `${POC_HEIGHT_GROUPS.reply}px` }}>

case 'image':
  return <div style={{ height: `${POC_HEIGHT_GROUPS.image}px` }}>

// ... etc
```

#### 1.3 เพิ่ม Clamp Styles
```tsx
// POCMessageItem.tsx - Image case
case 'image':
  return (
    <div style={{ height: `${POC_HEIGHT_GROUPS.image}px` }}>
      <div className="flex items-center justify-center"
           style={{
             maxHeight: '200px',
             backgroundColor: '#e5e7eb' // placeholder สี
           }}>
        🖼️ รูปภาพ (max 200px)
      </div>
      <div className={timeClass}>{formatTime(message.created_at)}</div>
    </div>
  );
```

### Phase 2: ทดสอบทีละ Type

#### Test Plan
1. **Test 1: Text only (baseline)**
   - ใช้ conversation ที่มีแต่ text messages
   - ✅ ควรไหลลื่นเหมือนเดิม (80px)

2. **Test 2: Text + Reply**
   - เพิ่ม reply messages เข้าไป
   - ✅ ควรไหลลื่น (80px + 120px mixed)

3. **Test 3: Text + Image**
   - เพิ่ม image messages
   - ✅ ควรไหลลื่น (80px + 220px mixed)
   - 🎯 **นี่คือ critical test!**

4. **Test 4: Text + Album**
   - เพิ่ม album messages
   - ✅ ควรไหลลื่น (80px + 240px mixed)

5. **Test 5: All types mixed**
   - Mix ทุก type
   - ✅ ควรไหลลื่นทั้งหมด

### Phase 3: เพิ่ม Height Measurement & Caching (อนาคต)

#### 3.1 สร้าง Height Cache Hook
```typescript
// hooks/useMessageHeightCache.ts
const useMessageHeightCache = () => {
  const heightCache = useRef<Map<string, number>>(new Map());

  const setHeight = (messageId: string, height: number) => {
    heightCache.current.set(messageId, height);
  };

  const getHeight = (messageId: string, defaultHeight: number) => {
    return heightCache.current.get(messageId) ?? defaultHeight;
  };

  return { setHeight, getHeight };
};
```

#### 3.2 วัดความสูงจริงครั้งเดียว
```typescript
// Measure once on mount
useEffect(() => {
  if (ref.current && !heightCache.has(message.id)) {
    const actualHeight = ref.current.offsetHeight;
    setHeight(message.id, actualHeight);
  }
}, [message.id]);
```

## 📊 Expected Results

### ก่อนปรับ (ตอนนี้)
```
All messages: 80px, 80px, 80px, 80px...
✅ Smooth: 100%
❌ Realistic: 0% (รูปต้องใหญ่กว่านี้)
```

### หลังปรับ Phase 1
```
Messages: 80px, 220px, 80px, 120px, 240px, 80px...
✅ Smooth: 95%+ (predictable groups)
✅ Realistic: 80% (ใกล้เคียงแชทจริง)
```

### หลังปรับ Phase 2-3
```
Messages: 82px, 218px, 79px, 124px, 238px, 81px...
✅ Smooth: 98%+ (measured + cached)
✅ Realistic: 95% (เหมือนแชทจริง)
```

## 🎯 Success Criteria

### Phase 1 Success =
- [ ] แต่ละ message type มี height ตาม HEIGHT_GROUPS
- [ ] Scroll ไหลลื่น (no jank)
- [ ] Scroll bar ขนาดถูกต้อง
- [ ] Load more ทำงานปกติ
- [ ] รูป/วิดีโอไม่เกิน max height (200px)

### Phase 2 Success =
- [ ] ทุก type test passed
- [ ] Mixed types ไหลลื่น
- [ ] Jump to message แม่นยำ
- [ ] Performance ดี (60fps)

## 🚀 Next Steps

1. ✅ **อ่านแผนนี้ให้เข้าใจ**
2. 🔄 **เริ่ม Phase 1**: ปรับ height groups
3. 🧪 **ทดสอบ Phase 2**: ทีละ type
4. 📈 **วัดผล**: เทียบกับ 80px baseline
5. 🎉 **Deploy**: ถ้าผลลัพธ์ดี นำไปใช้จริง

## 📝 Notes

### ทำไมไม่ใช้ Dynamic Height 100%?
- ❌ `height: auto` → virtualizer ไม่รู้ความสูงล่วงหน้า → ต้องวัด DOM → slow
- ❌ Random heights → scroll position คำนวณผิด → jump
- ✅ Predictable groups → virtualizer เดาได้ → smooth

### LINE/Messenger ใช้วิธีนี้จริงหรือ?
✅ ใช่! พวกเขาใช้:
1. Height estimation (คาดการณ์ความสูงก่อน)
2. Clamp media content (จำกัดขนาดรูป/วิดีโอ)
3. Measure once + cache (วัดครั้งเดียว)
4. Predictable groups (ความสูงอยู่ในกรอบ)

### จะรู้ได้ยังไงว่าไหลลื่น?
- Scroll ขึ้นลง 100 messages → ไม่กระตุก
- Load more → ไม่เด้ง
- Jump to message → ไม่เลื่อนผิดที่
- FPS = 60 (ดูใน DevTools Performance)

---

**Last Updated**: 2025-12-01
**Status**: Ready to implement Phase 1
**Current POC**: All 80px (smooth baseline) ✅
**Next**: Add height groups (80/120/220/240) 🎯
