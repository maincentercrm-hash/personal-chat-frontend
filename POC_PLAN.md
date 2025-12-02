# 🧪 POC: Virtual Scroll with Fixed Heights

**วัตถุประสงค์:** ทดสอบว่าปัญหา scroll jump เกิดจาก **height estimation** หรือ **Virtuoso prepend logic**

**วันที่:** 2025-12-01
**สถานะ:** 📋 Planning

---

## 🎯 เป้าหมาย

### สมมติฐานที่ต้องการพิสูจน์:

**Hypothesis 1:** ปัญหา scroll jump เกิดจาก **height estimation ไม่แม่นยำ**
- ถ้า POC ที่มี fixed heights **ไม่กระตุก** → สมมติฐานนี้ถูกต้อง ✅
- แก้ไข: ปรับปรุง height estimation ต่อ

**Hypothesis 2:** ปัญหา scroll jump เกิดจาก **Virtuoso prepend logic หรือ configuration**
- ถ้า POC ที่มี fixed heights **ยังกระตุก** → สมมติฐานนี้ถูกต้อง ✅
- แก้ไข: ปรับ Virtuoso config หรือ prepend logic

---

## 📁 โครงสร้าง POC

### ตำแหน่ง: `src/poc-virtual-scroll/`

```
src/poc-virtual-scroll/
├── components/
│   ├── POCMessageList.tsx          # Virtual list component (Virtuoso)
│   ├── POCMessageItem.tsx          # Message renderer (fixed heights)
│   └── POCLoadingIndicator.tsx     # Loading spinner
├── pages/
│   └── POCTestPage.tsx             # Test page with load more
├── hooks/
│   └── usePOCMessages.ts           # Mock message data generator
├── types/
│   └── poc.types.ts                # Simple message types
└── README.md                       # POC documentation
```

---

## 🎨 Message Types (Fixed Heights)

### ความสูงคงที่ (ไม่มี dynamic content):

| Message Type | Fixed Height | Content |
|--------------|--------------|---------|
| **Text** | **80px** | Plain text (single line, no wrap) |
| **Image** | **200px** | Color block (no actual image) |
| **Album** | **300px** | Multiple color blocks |
| **Reply** | **140px** | Quote + text (fixed layout) |
| **Sticker** | **150px** | Emoji (no image) |
| **File** | **100px** | Icon + filename |

**Key Points:**
- ✅ **ไม่มี dynamic content** (text ไม่ wrap, image ไม่ load)
- ✅ **ไม่มี image loading** (ใช้ color blocks แทน)
- ✅ **ไม่มี font loading** (system font only)
- ✅ **ไม่มี complex styling** (minimal CSS)

---

## 🔧 Implementation Details

### 1. POCMessageList.tsx

**Features:**
```typescript
// Virtuoso configuration (similar to production)
<Virtuoso
  data={messages}
  firstItemIndex={firstItemIndex}
  initialTopMostItemIndex={messages.length - 1}

  // ✅ Fixed height per message type (no estimation)
  itemSize={(message) => {
    switch (message.type) {
      case 'text': return 80;
      case 'image': return 200;
      case 'album': return 300;
      case 'reply': return 140;
      case 'sticker': return 150;
      case 'file': return 100;
      default: return 80;
    }
  }}

  // Load more
  atTopStateChange={(atTop) => {
    if (atTop) handleLoadMore();
  }}
  atTopThreshold={400}

  // Follow output (same as production)
  followOutput={(isAtBottom) => {
    if (scrollDirection === 'up') return false;
    return isAtBottom ? 'smooth' : false;
  }}
/>
```

**NO:**
- ❌ Height estimation
- ❌ Height caching
- ❌ ResizeObserver
- ❌ requestAnimationFrame delay

**Prepend Logic:**
```typescript
// Simple prepend (similar to production)
useLayoutEffect(() => {
  if (currentCount > prevCount && firstId !== prevFirstId) {
    const diff = currentCount - prevCount;

    // ✅ NO height measurement (using fixed itemSize)
    setFirstItemIndex(prev => prev - diff);
  }
}, [messages.length]);
```

---

### 2. POCMessageItem.tsx

**Ultra-simple rendering:**

```typescript
// Text Message (80px fixed)
<div style={{ height: '80px', padding: '16px' }}>
  <div>Text message content</div>
  <div>12:34</div>
</div>

// Image Message (200px fixed)
<div style={{ height: '200px', padding: '16px' }}>
  <div style={{
    width: '150px',
    height: '150px',
    background: '#ddd'
  }} />
  <div>12:34</div>
</div>

// Album Message (300px fixed)
<div style={{ height: '300px', padding: '16px' }}>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
    <div style={{ width: '100%', height: '140px', background: '#ddd' }} />
    <div style={{ width: '100%', height: '140px', background: '#ddd' }} />
  </div>
  <div>12:34</div>
</div>
```

**ไม่มี:**
- ❌ Image tags (ใช้ color blocks)
- ❌ Text wrapping (fixed one line)
- ❌ Dynamic padding/margin
- ❌ Complex components

---

### 3. usePOCMessages.ts

**Mock data generator:**

```typescript
export const usePOCMessages = () => {
  const [messages, setMessages] = useState<POCMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate mock messages
  const generateMessages = (count: number, startId: number) => {
    const types = ['text', 'image', 'album', 'reply', 'sticker', 'file'];

    return Array.from({ length: count }, (_, i) => ({
      id: `${startId + i}`,
      type: types[Math.floor(Math.random() * types.length)],
      content: `Message ${startId + i}`,
      timestamp: new Date().toISOString(),
    }));
  };

  // Initialize with 50 messages
  useEffect(() => {
    setMessages(generateMessages(50, 0));
  }, []);

  // Load more (prepend 30 messages)
  const loadMore = async () => {
    if (isLoading) return;

    setIsLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const oldestId = parseInt(messages[0]?.id || '0');
    const newMessages = generateMessages(30, oldestId - 30);

    setMessages(prev => [...newMessages, ...prev]);
    setIsLoading(false);
  };

  return { messages, loadMore, isLoading };
};
```

---

### 4. POCTestPage.tsx

**Simple test page:**

```typescript
export const POCTestPage = () => {
  const { messages, loadMore, isLoading } = usePOCMessages();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '16px', background: '#f0f0f0' }}>
        <h1>POC: Virtual Scroll Test</h1>
        <p>Total messages: {messages.length}</p>
        <p>Status: {isLoading ? 'Loading...' : 'Ready'}</p>
      </header>

      <main style={{ flex: 1, overflow: 'hidden' }}>
        <POCMessageList
          messages={messages}
          onLoadMore={loadMore}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
};
```

---

## 🧪 Testing Plan

### Test Case 1: Basic Load More
```
1. เปิด POC test page
2. Scroll ไปด้านบน
3. รอให้ load more (30 messages)
4. สังเกต scroll behavior

Expected:
  ✅ ถ้าไม่กระตุก → ปัญหาคือ height estimation
  ❌ ถ้ายังกระตุก → ปัญหาคือ Virtuoso/prepend logic
```

### Test Case 2: Rapid Load More
```
1. Scroll up หลายครั้งติดกัน
2. Load more 3-5 ครั้ง
3. สังเกต scroll behavior

Expected:
  ✅ Scroll position ควรคงที่ทุกครั้ง
```

### Test Case 3: Mixed Message Types
```
1. Load messages ที่มี mixed types (text + album + image)
2. Scroll up to load more
3. สังเกตว่า message types ต่างๆ ทำให้กระตุกไหม

Expected:
  ✅ ไม่ควรกระตุก (เพราะ fixed heights)
```

---

## 📊 Expected Results

### Scenario A: POC ไม่กระตุก ✅

**สรุป:**
- ปัญหาอยู่ที่ **height estimation** ใน production code
- Height estimation ไม่แม่นยำพอ
- Messages ที่ยังไม่ render ทำให้ estimate ผิด

**แก้ไข:**
1. ปรับปรุง height estimation constants
2. Enable ResizeObserver
3. เพิ่ม retry measurement
4. หรือใช้ fixed heights สำหรับบาง types

---

### Scenario B: POC ยังกระตุก ❌

**สรุป:**
- ปัญหาอยู่ที่ **Virtuoso configuration** หรือ **prepend logic**
- ไม่ใช่เรื่อง height estimation

**แก้ไข:**
1. ปรับ Virtuoso config:
   - `atTopThreshold`
   - `increaseViewportBy`
   - `initialTopMostItemIndex`
2. ปรับ prepend logic:
   - Timing ของ `setFirstItemIndex`
   - การ sync กับ DOM
3. ลองใช้ `adjustForPrependedItems` API
4. ตรวจสอบ Virtuoso version (อาจมี bug)

---

## 📝 Implementation Checklist

### Phase 1: Setup (30 minutes)
- [ ] สร้าง folder `src/poc-virtual-scroll/`
- [ ] สร้าง types (`poc.types.ts`)
- [ ] สร้าง mock data hook (`usePOCMessages.ts`)

### Phase 2: Components (1 hour)
- [ ] สร้าง `POCMessageItem.tsx` (fixed heights)
- [ ] สร้าง `POCMessageList.tsx` (Virtuoso)
- [ ] สร้าง `POCLoadingIndicator.tsx`

### Phase 3: Test Page (30 minutes)
- [ ] สร้าง `POCTestPage.tsx`
- [ ] เพิ่ม route สำหรับ POC page
- [ ] ทดสอบ basic rendering

### Phase 4: Testing (1 hour)
- [ ] Test Case 1: Basic Load More
- [ ] Test Case 2: Rapid Load More
- [ ] Test Case 3: Mixed Message Types
- [ ] บันทึกผล

### Phase 5: Analysis (30 minutes)
- [ ] วิเคราะห์ผลทดสอบ
- [ ] สรุปว่าปัญหาอยู่ที่ไหน
- [ ] เขียน report

**Total Time:** ~3-4 hours

---

## 🚀 Next Steps

### ถ้า POC ไม่กระตุก:
1. นำ fixed heights ไปใช้ใน production (สำหรับบาง types)
2. ปรับปรุง estimation algorithm
3. Enable ResizeObserver

### ถ้า POC ยังกระตุก:
1. ศึกษา Virtuoso documentation เพิ่มเติม
2. ทดลอง config ต่างๆ
3. ลองใช้ prepend strategy อื่น
4. พิจารณาใช้ library อื่น (เช่น react-window)

---

## 📌 Important Notes

### ⚠️ ข้อจำกัดของ POC:

1. **ไม่มี real content**
   - ใช้ mock data
   - ไม่มี image loading
   - ไม่มี complex layout

2. **ไม่มี real user behavior**
   - ไม่มี typing, sending messages
   - ไม่มี WebSocket updates
   - ไม่มี real-time features

3. **Simplified logic**
   - ไม่มี editing, replying
   - ไม่มี context menu
   - ไม่มี message status

### ✅ จุดแข็งของ POC:

1. **Isolated test**
   - แยกปัญหา height estimation ออกจาก prepend logic
   - ง่ายต่อการ debug

2. **Fast iteration**
   - แก้ไขและทดสอบได้เร็ว
   - ไม่กระทบ production code

3. **Clear results**
   - ผลชัดเจน: กระตุก หรือ ไม่กระตุก
   - รู้ได้เลยว่าปัญหาอยู่ที่ไหน

---

## 🎯 Success Criteria

**POC ถือว่าสำเร็จถ้า:**
1. ✅ Render messages ได้ถูกต้อง (fixed heights)
2. ✅ Load more ทำงานได้ (prepend messages)
3. ✅ สามารถสรุปได้ว่าปัญหาอยู่ที่ height estimation หรือ prepend logic

**POC ไม่สำเร็จถ้า:**
1. ❌ มี bugs ใน POC เอง
2. ❌ ผลทดสอบไม่ชัดเจน
3. ❌ ไม่สามารถ reproduce ปัญหาได้

---

**Ready to implement!** 🚀

พร้อมให้เริ่มทำ POC เมื่อได้รับการอนุมัติ
