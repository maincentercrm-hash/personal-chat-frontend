# VirtualMessageList.tsx - Code Analysis

## สรุป: ไฟล์นี้มีปัญหาหนักมาก (1100+ lines)

**Verdict: ควรเขียนใหม่ทั้งหมด**

---

## ปัญหาที่พบ

### 1. **ขนาดไฟล์ใหญ่เกินไป (1100+ lines)**

| Section | Lines | ควรแยกไหม? |
|---------|-------|-----------|
| Types & Imports | 1-60 | ✅ แยกเป็น types file |
| Height Cache Logic | 111-340 | ✅ แยกเป็น hook |
| Message Components | 548-936 | ✅ แยกเป็นไฟล์แยก |
| Main Component | 70-1103 | ใหญ่เกินไป |

**ปัญหา:** Single file responsibility ถูกละเมิด - มีทั้ง:
- Height estimation
- Height caching
- Message rendering
- Edit form
- Selection mode
- Scroll logic
- Load more logic
- Date separator logic

---

### 2. **Nested Component Definition (CRITICAL)**

```tsx
// ❌ BAD: Component ถูก define ภายใน component หลัก
const VirtualMessageList = forwardRef(...) => {

  // Line 549-616: EditMessageForm ถูก define ภายใน!
  const EditMessageForm = memo(({ ... }) => { ... });

  // Line 620-935: MessageItem ถูก define ภายใน!
  const MessageItem = memo(({ message }) => { ... });

});
```

**ผลกระทบ:**
- Re-create function ทุก render
- memo() ไม่ทำงาน (reference เปลี่ยนทุกครั้ง)
- Performance แย่มาก
- React DevTools แสดง re-render บ่อยเกินไป

---

### 3. **Height Cache ซับซ้อนเกินไป**

```tsx
// มี 3 ระบบ height ที่ทับซ้อนกัน:

// 1. heightCache (Map)
const heightCache = useRef<Map<string, number>>(new Map());

// 2. PRODUCTION_MESSAGE_HEIGHTS (hardcoded)
const PRODUCTION_MESSAGE_HEIGHTS = { text: 66, image: 228, ... };

// 3. ResizeObserver ใน MessageItem
useLayoutEffect(() => {
  const observer = new ResizeObserver(...);
  observer.observe(element);
});
```

**ปัญหา:**
- 3 sources of truth
- Logic กระจายหลายที่
- Debug ยากมาก
- ไม่ชัดเจนว่าใช้ค่าจากไหน

---

### 4. **State Management ซับซ้อน**

```tsx
// มี ref/state มากเกินไป:
const virtuosoRef = useRef<VirtuosoHandle>(null);
const isJumpingRef = useRef(false);
const initialScrollDoneRef = useRef<string | null>(null);
const lastScrollDirectionRef = useRef<'up' | 'down' | null>(null);
const isMountedRef = useRef(false);
const scrolledAfterChangeRef = useRef(false);
const heightCache = useRef<Map<string, number>>(new Map());
const cacheHits = useRef(0);
const cacheMisses = useRef(0);
const prevMessageCountRef = useRef(0);
const prevFirstMessageIdRef = useRef<string | null>(null);

const [_isAtBottom, setIsAtBottom] = useState(true);
const [isLoadingMore, setIsLoadingMore] = useState(false);
const [showScrollButton, setShowScrollButton] = useState(false);
const [newMessagesCount, setNewMessagesCount] = useState(0);
const [firstItemIndex, setFirstItemIndex] = useState(INITIAL_INDEX);
```

**Total: 11 refs + 5 states = 16 pieces of state**

ยากมากในการติดตามว่า state ไหนเปลี่ยนเมื่อไหร่

---

### 5. **useLayoutEffect กับ ResizeObserver (Performance Killer)**

```tsx
// Line 637-711: ทุก MessageItem มี ResizeObserver ของตัวเอง
useLayoutEffect(() => {
  const observer = new ResizeObserver((entries) => {
    // debounce logic
    // update height cache
  });
  observer.observe(element);
}, [message.id, message.message_type]);
```

**ปัญหา:**
- สร้าง ResizeObserver ต่อ message (ถ้ามี 100 messages = 100 observers)
- useLayoutEffect block paint
- Debounce แต่ยังมี overhead

---

### 6. **Console.log มากเกินไป (50+ console statements)**

```tsx
console.log('[HeightCache] Updated...');
console.log('[Mount] 🎬 VirtualMessageList mounted...');
console.log('[ConversationChange] 🔄...');
console.log('[debug_scroll] 📥 Messages changed...');
console.log('[handleLoadMore] 🔍 Called!...');
// ... และอีกมาก
```

**ผลกระทบ:**
- Slow down rendering
- Console cluttered
- ยากต่อการ debug จริงๆ

---

### 7. **Props มากเกินไป (30+ props)**

```tsx
interface VirtualMessageListProps {
  messages: MessageDTO[];
  currentUserId: string;
  activeConversationId: string;
  onLoadMore?: () => void;
  onLoadMoreAtBottom?: () => void;
  onReplyMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onResendMessage?: (messageId: string) => void;
  onImageClick?: (messageIdOrUrl: string, imageIndex?: number) => void;
  scrollToMessage?: (messageId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  isBusinessView?: boolean;
  isGroupChat?: boolean;
  isAdmin?: boolean;
  formatTime: (timestamp: string) => string;
  getMessageStatus: (message: MessageDTO, isUser: boolean) => string | undefined;
  renderMessageStatus: (status: string | null) => string | null;
  getFormattedSender: (message: MessageDTO, defaultName?: string) => string;
  isOwnMessage: (message: MessageDTO) => boolean;
  handleCopyMessage: (content: string) => void;
  editingMessageId?: string | null;
  editingContent?: string;
  onEditingContentChange?: (content: string) => void;
  onConfirmEdit?: (content?: string) => void;
  onCancelEdit?: () => void;
}
```

**ปัญหา:**
- Component รู้มากเกินไป
- Prop drilling
- ยากต่อการ test

---

### 8. **Virtuoso Configuration ที่ซับซ้อน**

```tsx
<Virtuoso
  firstItemIndex={firstItemIndex}                    // Prepend pattern
  initialTopMostItemIndex={...}                      // Initial scroll
  initialItemCount={...}                             // Initial count
  defaultItemHeight={100}                            // Default height
  itemSize={(el) => { /* complex logic */ }}         // Dynamic height
  followOutput={(isAtBottom) => { /* complex */ }}   // Auto-scroll
  atTopStateChange={(atTop) => { /* load more */ }}  // Top trigger
  atTopThreshold={400}                               // Threshold
  atBottomStateChange={(atBottom) => { /* ... */ }} // Bottom trigger
  atBottomThreshold={100}                            // Threshold
  increaseViewportBy={{ top: 1000, bottom: 1000 }}  // Buffer
  itemContent={(index, message) => { /* ... */ }}   // Render
/>
```

มี 12+ configurations - ยากต่อการเข้าใจและ debug

---

## Dependency Graph (ซับซ้อนมาก)

```
VirtualMessageList
├── heightCache (ref)
│   ├── updateHeightCache (callback)
│   ├── getProductionMessageHeight (callback)
│   └── itemSize (Virtuoso prop)
├── scroll state
│   ├── isJumpingRef
│   ├── lastScrollDirectionRef
│   ├── scrolledAfterChangeRef
│   └── isMountedRef
├── message state
│   ├── firstItemIndex
│   ├── prevMessageCountRef
│   └── prevFirstMessageIdRef
├── UI state
│   ├── isAtBottom
│   ├── isLoadingMore
│   ├── showScrollButton
│   └── newMessagesCount
├── MessageItem (nested)
│   ├── ResizeObserver
│   ├── useLongPress
│   ├── Selection context
│   └── Message type switch
└── EditMessageForm (nested)
    └── Textarea state
```

---

## แนวทางการเขียนใหม่

### Architecture ที่แนะนำ

```
src/components/chat/
├── MessageList/
│   ├── index.tsx              # Main export
│   ├── MessageList.tsx        # Core list component (~200 lines)
│   ├── useMessageList.ts      # State & logic hook (~150 lines)
│   ├── useHeightCache.ts      # Height caching hook (~100 lines)
│   ├── useScrollBehavior.ts   # Scroll logic hook (~100 lines)
│   └── types.ts               # TypeScript types
│
├── MessageItem/
│   ├── index.tsx              # Main export
│   ├── MessageItem.tsx        # Wrapper with context menu (~100 lines)
│   ├── MessageContent.tsx     # Content renderer (switch) (~50 lines)
│   └── useMessageItem.ts      # Item-specific logic
│
├── messages/                   # (existing - keep separate)
│   ├── TextMessage.tsx
│   ├── ImageMessage.tsx
│   ├── FileMessage.tsx
│   └── ...
│
└── shared/
    ├── DateSeparator.tsx      # (existing)
    ├── ScrollToBottomButton.tsx # (existing)
    └── EditMessageForm.tsx    # Extract from VirtualMessageList
```

### หลักการสำคัญ

1. **แยก concerns**
   - List rendering (Virtuoso)
   - Message rendering (MessageItem)
   - Height management (useHeightCache)
   - Scroll behavior (useScrollBehavior)

2. **Component อยู่นอก component หลัก**
   - MessageItem ต้อง define นอก
   - EditMessageForm ต้อง define นอก

3. **ลด props ด้วย Context**
   - MessageListContext สำหรับ shared functions
   - ไม่ต้อง pass formatTime, isOwnMessage, etc. ผ่าน props

4. **Height cache ที่เรียบง่าย**
   - ใช้แค่ Map<messageId, height>
   - Virtuoso handle ส่วนใหญ่เองได้

5. **ลบ console.log ทั้งหมด**
   - ใช้ debug mode flag แทน
   - หรือ logger utility

---

## สรุป: ทำอะไรก่อน?

### Option A: Refactor ทีละส่วน (Safe but slow)
1. Extract EditMessageForm → file แยก
2. Extract MessageItem → file แยก
3. Extract height cache → hook แยก
4. Extract scroll logic → hook แยก
5. Clean up main component

### Option B: Rewrite จาก scratch (Fast but risky)
1. สร้าง MessageListV2/ folder ใหม่
2. เริ่มจาก Virtuoso + basic rendering
3. เพิ่ม features ทีละอย่าง
4. Test แต่ละ step
5. Replace เมื่อพร้อม

### Recommendation: **Option B**

เพราะ:
- Code เดิมซับซ้อนเกินไปที่จะ refactor ทีละส่วน
- มี technical debt สะสมมาก
- เขียนใหม่จะได้ architecture ที่ดีกว่า
- ใช้ `?mode=v2` เพื่อ test ก่อน replace

---

## Timeline โดยประมาณ

| Phase | Task | Effort |
|-------|------|--------|
| 1 | Setup folder structure + types | 1 hour |
| 2 | Basic MessageList with Virtuoso | 2 hours |
| 3 | MessageItem + message types | 2 hours |
| 4 | Height caching (simple) | 1 hour |
| 5 | Scroll behavior (load more) | 2 hours |
| 6 | Selection mode | 1 hour |
| 7 | Edit message | 1 hour |
| 8 | Testing & polish | 2 hours |

**Total: ~12 hours of focused work**

---

*Analysis Date: December 2024*
