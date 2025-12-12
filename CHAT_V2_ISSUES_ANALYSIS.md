# Chat V2 Issues Analysis & Solution

## สถานะปัจจุบัน

**ปัญหาหลัก:** เมื่อเปิด conversation หรือ F5 ไม่ scroll ไปล่างสุด และกระตุก

---

## Root Cause Analysis

### 1. ปัญหาหลัก: react-virtuoso + initialTopMostItemIndex

**สิ่งที่เกิดขึ้น:**
```
1. Component mount → messages = [] → listItems = []
2. initialTopMostItemIndex = listItems.length - 1 = -1 (ผิด!)
3. API fetch messages → messages = [...data]
4. listItems rebuild → แต่ initialTopMostItemIndex ถูกใช้แค่ครั้งแรกตอน mount
5. Virtuoso ไม่ scroll ไปล่างสุดเพราะ initial value ผิด
```

**Root cause:** `initialTopMostItemIndex` ทำงานแค่ตอน mount ครั้งแรก ไม่ใช่เมื่อ data เปลี่ยน

### 2. ปัญหารอง: Data Flow ไม่ synchronous

```
ChatLayout
  └── ChatV2TestPage
        └── useConversationPageLogic(conversationId)
              └── API: getMessages() → async
        └── MessageAreaV2
              └── MessageList
                    └── messages prop = [] ตอนแรก
```

**ปัญหา:**
- `conversationId` เปลี่ยนก่อน
- `messages` ยังเป็นของเก่า/ว่าง
- Virtuoso render ด้วย data ผิด → กระตุก

### 3. ปัญหาจาก react-virtuoso

ตาม TELEGRAM_STYLE_CHAT_ANALYSIS.md:
> "react-virtuoso - ดี: API ง่าย, handle bidirectional scroll. ปัญหา: Heavy, อาจ overkill"

**ปัญหาที่พบ:**
1. `key={conversationId}` → force re-mount แต่ไม่ช่วยเรื่อง initial scroll
2. `initialTopMostItemIndex` ใช้ค่าตอน mount ซึ่ง data ยังไม่พร้อม
3. `followOutput="smooth"` ไม่ทำงานกับ initial render

---

## เปรียบเทียบกับ Telegram Approach

| หัวข้อ | Telegram | Chat V2 ปัจจุบัน | ปัญหา |
|--------|----------|------------------|-------|
| Virtual Scroll | เขียนเอง | react-virtuoso | ควบคุมยาก |
| Initial Scroll | รอ data พร้อม | Mount ก่อน data | Scroll ผิด |
| Data Loading | Sync-like feel | Async with loading | กระตุก |
| Height | Pre-calculated | Dynamic | Layout shift |

---

## แนวทางแก้ไข

### Option A: แก้ไขภายใน react-virtuoso (Quick Fix)

**แนวคิด:** ไม่ render Virtuoso จนกว่า data จะพร้อม

```tsx
// MessageList.tsx
const [isInitialized, setIsInitialized] = useState(false);

// รอจนกว่า messages จะพร้อม
useEffect(() => {
  if (messages.length > 0 && !isInitialized) {
    setIsInitialized(true);
  }
}, [messages.length, isInitialized]);

// Reset เมื่อเปลี่ยน conversation
useEffect(() => {
  setIsInitialized(false);
}, [conversationId]);

// ไม่ render จนกว่าจะพร้อม
if (!isInitialized || messages.length === 0) {
  return <LoadingState />;
}

return <Virtuoso ... />;
```

**ข้อดี:** แก้เร็ว, ไม่ต้องเขียนใหม่
**ข้อเสีย:** ยังมีปัญหา timing, workaround ไม่ใช่ root fix

### Option B: ใช้ @tanstack/virtual แทน (Recommended)

ตาม TELEGRAM_STYLE_CHAT_ANALYSIS.md:
> "แนะนำ: @tanstack/virtual + Custom scroll logic"

**แนวคิด:** เขียน MessageList ใหม่ด้วย @tanstack/virtual

```tsx
// ใช้ @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

function MessageList({ messages, conversationId }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => estimateMessageHeight(messages[index]),
    overscan: 5,
  });

  // Scroll to bottom เมื่อ data พร้อม
  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
  }, [conversationId, messages.length > 0]);

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={messages[virtualItem.index].id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <MessageItem message={messages[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**ข้อดี:**
- ควบคุม scroll ได้เต็มที่
- Lightweight (12KB vs 40KB)
- ทำ scroll to bottom ได้ตรงจุด

**ข้อเสีย:**
- ต้องเขียน prepend logic เอง
- ต้องจัดการ scroll anchoring เอง

### Option C: เขียน Virtual Scroll เอง (Best Performance)

ตาม Telegram approach - เขียนเองเพื่อควบคุมทุกอย่าง

**ข้อดี:** ควบคุมได้ 100%
**ข้อเสีย:** ใช้เวลามาก

---

## Recommended Approach: Option B

### ขั้นตอนการ Implement

#### Step 1: ติดตั้ง @tanstack/react-virtual
```bash
npm install @tanstack/react-virtual
```

#### Step 2: สร้าง MessageListV3.tsx

```
src/components/chat-v2/
├── MessageList/           # เก่า (react-virtuoso)
├── MessageListV3/         # ใหม่ (@tanstack/virtual)
│   ├── index.ts
│   ├── MessageListV3.tsx
│   ├── useMessageVirtualizer.ts
│   ├── useScrollToBottom.ts
│   └── usePrependHandler.ts
```

#### Step 3: Core Implementation

```tsx
// useMessageVirtualizer.ts
export function useMessageVirtualizer({
  messages,
  parentRef,
  estimateHeight,
}) {
  return useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => estimateHeight(messages[index]),
    overscan: 5,
    // สำคัญ: ใช้ message.id เป็น key
    getItemKey: (index) => messages[index].id,
  });
}

// useScrollToBottom.ts
export function useScrollToBottom({
  virtualizer,
  messages,
  conversationId,
}) {
  const prevConversationIdRef = useRef(conversationId);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    // Reset เมื่อเปลี่ยน conversation
    if (prevConversationIdRef.current !== conversationId) {
      hasScrolledRef.current = false;
      prevConversationIdRef.current = conversationId;
    }

    // Scroll to bottom เมื่อ data พร้อม (แค่ครั้งแรก)
    if (messages.length > 0 && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      // ใช้ requestAnimationFrame เพื่อให้แน่ใจว่า DOM พร้อม
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(messages.length - 1, {
          align: 'end',
          behavior: 'auto'
        });
      });
    }
  }, [messages.length, conversationId, virtualizer]);
}

// usePrependHandler.ts
export function usePrependHandler({
  virtualizer,
  messages,
}) {
  const prevFirstIdRef = useRef<string | null>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    const currentFirstId = messages[0]?.id;
    const currentLength = messages.length;

    // ตรวจจับ prepend
    if (
      currentLength > prevLengthRef.current &&
      prevLengthRef.current > 0 &&
      currentFirstId !== prevFirstIdRef.current
    ) {
      const diff = currentLength - prevLengthRef.current;
      // @tanstack/virtual จัดการ scroll anchoring อัตโนมัติ
      // ถ้าต้องการ manual control:
      // virtualizer.scrollToOffset(virtualizer.scrollOffset + addedHeight);
    }

    prevFirstIdRef.current = currentFirstId;
    prevLengthRef.current = currentLength;
  }, [messages, virtualizer]);
}
```

#### Step 4: Height Estimation

```tsx
// heightEstimator.ts
const LINE_HEIGHT = 21;
const CHAR_PER_LINE = 40;
const BUBBLE_PADDING = 24;
const TIME_HEIGHT = 16;

export function estimateMessageHeight(message: MessageDTO): number {
  switch (message.message_type) {
    case 'text':
      return estimateTextHeight(message.content || '');
    case 'image':
      return estimateImageHeight(message);
    case 'sticker':
      return 120 + 20; // sticker size + time
    case 'file':
      return 72; // fixed height
    case 'album':
      return estimateAlbumHeight(message);
    case 'video':
      return estimateVideoHeight(message);
    default:
      return 60;
  }
}

function estimateTextHeight(content: string): number {
  const lines = Math.ceil(content.length / CHAR_PER_LINE);
  return Math.max(40, (lines * LINE_HEIGHT) + BUBBLE_PADDING + TIME_HEIGHT);
}

function estimateImageHeight(message: MessageDTO): number {
  // ใช้ metadata หรือ default
  const width = message.media_metadata?.width || 320;
  const height = message.media_metadata?.height || 200;
  const aspectRatio = height / width;
  const maxWidth = 320;
  return Math.min(400, maxWidth * aspectRatio) + TIME_HEIGHT;
}
```

---

## Implementation Plan

### Phase 1: Quick Fix (วันนี้)
- [ ] แก้ไข MessageList ให้รอ data พร้อมก่อน render Virtuoso
- [ ] ทดสอบ scroll to bottom

### Phase 2: @tanstack/virtual Migration (2-3 วัน)
- [ ] ติดตั้ง @tanstack/react-virtual
- [ ] สร้าง MessageListV3 ใหม่
- [ ] Implement scroll to bottom
- [ ] Implement prepend handling (load more)
- [ ] ทดสอบทุก case

### Phase 3: Height Estimation (1-2 วัน)
- [ ] สร้าง heightEstimator
- [ ] Measure จริงหลัง render
- [ ] Update cache

### Phase 4: Polish (1 วัน)
- [ ] Performance testing
- [ ] Edge cases
- [ ] Cleanup old code

---

## Checklist ก่อน Production

### Scroll Behavior
- [ ] เปิด conversation → scroll ลงล่างสุดทันที (ไม่กระตุก)
- [ ] F5 refresh → scroll ลงล่างสุดทันที
- [ ] เปลี่ยน conversation → scroll ลงล่างสุดทันที
- [ ] Load more (scroll up) → position ไม่กระโดด
- [ ] New message → scroll ลงล่าง (ถ้าอยู่ล่างอยู่แล้ว)

### Performance
- [ ] Scroll FPS >= 55
- [ ] DOM nodes < 100
- [ ] ไม่มี layout shift

---

*Created: December 2024*
*Status: Analysis Complete - Ready for Implementation*
