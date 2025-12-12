# Telegram-Style Chat System Analysis

## สารบัญ
1. [ทำไม Telegram ถึงลื่น](#1-ทำไม-telegram-ถึงลื่น)
2. [Core Architecture ที่ต้องมี](#2-core-architecture-ที่ต้องมี)
3. [Virtual Scroll ที่ถูกต้อง](#3-virtual-scroll-ที่ถูกต้อง)
4. [Message Types & Dynamic Height](#4-message-types--dynamic-height)
5. [Performance Metrics ที่ต้องวัด](#5-performance-metrics-ที่ต้องวัด)
6. [Common Pitfalls](#6-common-pitfalls-ที่ต้องหลีกเลี่ยง)
7. [Recommended Libraries](#7-recommended-libraries)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

## 1. ทำไม Telegram ถึงลื่น

### Telegram ทำอะไรที่ต่างจากคนอื่น:

| Feature | Telegram | ทั่วไป |
|---------|----------|--------|
| **Message Height** | Pre-calculated บน server | คำนวณตอน render |
| **Image Loading** | Progressive JPEG + Blur hash | Load ทีเดียว |
| **Scroll** | Native scroll + GPU composite | JS-based scroll |
| **DOM Nodes** | ~20-30 visible | มักจะ render หมด |
| **State Updates** | Batch + requestAnimationFrame | Immediate |
| **Message Database** | IndexedDB + SQLite (WASM) | Memory only |

### Key Insights จาก Telegram Web:

1. **ไม่ใช้ Virtual Scroll Library** - เขียนเอง เพราะต้อง control ทุกอย่าง
2. **Pre-render height** - คำนวณ height ก่อน render จริง
3. **Skeleton ที่ถูกขนาด** - Skeleton มี height เท่ากับ content จริง
4. **Intersection Observer** - ใช้ native API แทน scroll event
5. **CSS Containment** - ใช้ `contain: strict` เพื่อ isolate repaint

---

## 2. Core Architecture ที่ต้องมี

### 2.1 Message Store Architecture

```
┌─────────────────────────────────────────────────────┐
│                   MESSAGE STORE                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐  │
│  │  IndexedDB   │◄──►│  In-Memory Cache         │  │
│  │  (Persist)   │    │  (Active conversation)   │  │
│  └──────────────┘    └──────────────────────────┘  │
│         │                       │                   │
│         ▼                       ▼                   │
│  ┌──────────────┐    ┌──────────────────────────┐  │
│  │ Height Cache │    │  Rendered Messages       │  │
│  │ (Pre-calc)   │    │  (Virtualized window)    │  │
│  └──────────────┘    └──────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2.2 แยก Concerns ให้ชัด

```
src/
├── core/
│   ├── virtualScroll/
│   │   ├── VirtualList.tsx        # Core virtual list (ไม่รู้จัก message)
│   │   ├── useVirtualRange.ts     # คำนวณ visible range
│   │   ├── useScrollAnchor.ts     # จัดการ scroll position
│   │   └── heightCache.ts         # Height estimation & cache
│   │
│   └── messageRenderer/
│       ├── MessageFactory.tsx     # เลือก component ตาม type
│       ├── heightEstimator.ts     # คำนวณ height ก่อน render
│       └── types/
│           ├── TextMessage.tsx
│           ├── ImageMessage.tsx
│           ├── FileMessage.tsx
│           ├── AlbumMessage.tsx
│           └── ...
│
├── features/
│   └── chat/
│       ├── ChatMessageList.tsx    # รวม Virtual + Message
│       ├── useChatScroll.ts       # Chat-specific scroll logic
│       └── useLoadMore.ts         # Pagination logic
│
└── stores/
    ├── messageStore.ts            # Message state
    └── heightStore.ts             # Height cache (แยกออกมา!)
```

---

## 3. Virtual Scroll ที่ถูกต้อง

### 3.1 หลักการสำคัญ

```
┌─────────────────────────────────────────┐
│           VIEWPORT (visible)            │
│  ┌───────────────────────────────────┐  │
│  │  Message 50                       │  │ ◄─ overscan top (2-3 items)
│  │  Message 51                       │  │
│  ├───────────────────────────────────┤  │
│  │  Message 52                       │  │
│  │  Message 53                       │  │
│  │  Message 54  ◄─ anchor message    │  │ ◄─ visible range
│  │  Message 55                       │  │
│  │  Message 56                       │  │
│  ├───────────────────────────────────┤  │
│  │  Message 57                       │  │ ◄─ overscan bottom (2-3 items)
│  │  Message 58                       │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  SPACER TOP: sum of heights 0-49  │  │ ◄─ CSS transform หรือ padding
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  SPACER BOTTOM: sum of 59-end     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 3.2 สิ่งที่ต้องทำให้ถูก

#### A) Scroll Anchoring (สำคัญมาก!)

```typescript
// ปัญหา: เมื่อ load more ด้านบน scroll จะกระโดด
// วิธีแก้: Anchor ไว้ที่ message ปัจจุบัน

interface ScrollAnchor {
  messageId: string;
  offsetFromTop: number;  // ระยะจาก viewport top ถึง message
}

// ก่อน load more
const anchor = {
  messageId: firstVisibleMessage.id,
  offsetFromTop: firstVisibleMessage.getBoundingClientRect().top
};

// หลัง load more
const newPosition = getMessageElement(anchor.messageId).offsetTop;
scrollContainer.scrollTop = newPosition - anchor.offsetFromTop;
```

#### B) Height Estimation (ก่อน render)

```typescript
// ต้องคำนวณ height ได้โดยไม่ต้อง render จริง

function estimateMessageHeight(message: Message): number {
  switch (message.type) {
    case 'text':
      return estimateTextHeight(message.content);
    case 'image':
      return estimateImageHeight(message.media);
    case 'album':
      return estimateAlbumHeight(message.album);
    // ...
  }
}

function estimateTextHeight(content: string): number {
  const CHAR_PER_LINE = 45;  // ขึ้นกับ container width
  const LINE_HEIGHT = 20;
  const PADDING = 24;

  const lines = Math.ceil(content.length / CHAR_PER_LINE);
  return (lines * LINE_HEIGHT) + PADDING;
}
```

#### C) Bidirectional Infinite Scroll

```typescript
// Chat ต้อง scroll ได้ทั้ง 2 ทิศ:
// - ขึ้น = load older messages
// - ลง = load newer messages (เมื่อ jump to message)

interface InfiniteScrollState {
  hasMoreTop: boolean;
  hasMoreBottom: boolean;
  isLoadingTop: boolean;
  isLoadingBottom: boolean;

  // สำคัญ: ต้องมี threshold ที่เหมาะสม
  topThreshold: number;     // 200-500px
  bottomThreshold: number;  // 100-200px
}
```

---

## 4. Message Types & Dynamic Height

### 4.1 ปัญหาหลักของ Dynamic Height

| ปัญหา | สาเหตุ | วิธีแก้ |
|-------|--------|--------|
| **Layout Shift** | Height เปลี่ยนหลัง render | Pre-calculate + Reserve space |
| **Scroll Jump** | Height ไม่ตรง estimate | Update estimate หลัง measure |
| **Image Pop-in** | Load แล้ว height เพิ่ม | ใช้ aspect ratio จาก metadata |
| **Text Reflow** | Font load ช้า | ใช้ `font-display: block` |

### 4.2 แต่ละ Message Type ต้องทำอะไร

#### Text Message
```typescript
// Height = padding + (lines × lineHeight)
// ต้องรู้: container width, font size, line height

interface TextHeightParams {
  content: string;
  containerWidth: number;
  fontSize: number;
  lineHeight: number;
  padding: { top: number; bottom: number };
  hasReply?: boolean;      // +40-60px
  hasReactions?: boolean;  // +24px
}
```

#### Image Message
```typescript
// ต้องได้ aspect ratio มาจาก server!
interface ImageMessage {
  url: string;
  thumbnail: string;      // blur hash หรือ tiny image
  width: number;          // original width
  height: number;         // original height
  // คำนวณ display size จาก aspect ratio
}

function calculateImageDisplaySize(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = 320,
  maxHeight: number = 400
): { width: number; height: number } {
  const ratio = originalWidth / originalHeight;

  if (originalWidth > maxWidth) {
    return { width: maxWidth, height: maxWidth / ratio };
  }
  if (originalHeight > maxHeight) {
    return { width: maxHeight * ratio, height: maxHeight };
  }
  return { width: originalWidth, height: originalHeight };
}
```

#### Album Message (ยากที่สุด!)
```typescript
// Album layout ขึ้นกับจำนวนและ aspect ratio ของแต่ละรูป
// Telegram ใช้ algorithm พิเศษในการจัด layout

interface AlbumLayout {
  type: 'grid' | 'horizontal' | 'vertical' | 'mixed';
  rows: AlbumRow[];
  totalHeight: number;
}

// แนะนำ: ใช้ predefined layouts
const ALBUM_LAYOUTS = {
  1: { rows: 1, cols: 1, maxHeight: 400 },
  2: { rows: 1, cols: 2, maxHeight: 200 },
  3: { rows: 2, layout: '1-2', maxHeight: 300 },
  4: { rows: 2, cols: 2, maxHeight: 300 },
  // ... สำหรับ 5-10 items
};
```

### 4.3 Height Cache Strategy

```typescript
interface HeightCache {
  // Level 1: Estimated (ก่อน render)
  estimated: Map<string, number>;

  // Level 2: Measured (หลัง render)
  measured: Map<string, number>;

  // ใช้ measured ถ้ามี, ไม่งั้นใช้ estimated
  getHeight(messageId: string): number;

  // Update หลัง measure
  setMeasuredHeight(messageId: string, height: number): void;
}

// สำคัญ: เมื่อ measured !== estimated ต้อง:
// 1. Update cache
// 2. Recalculate total height
// 3. Adjust scroll position ถ้าจำเป็น
```

---

## 5. Performance Metrics ที่ต้องวัด

### 5.1 Core Metrics

| Metric | Target | วิธีวัด |
|--------|--------|--------|
| **First Contentful Paint** | < 1s | Performance API |
| **Time to Interactive** | < 2s | Performance API |
| **Scroll FPS** | 60fps | requestAnimationFrame |
| **Frame Drop** | < 5% | Performance Observer |
| **Memory Usage** | < 100MB | performance.memory |
| **DOM Nodes** | < 100 | document.querySelectorAll |

### 5.2 Chat-Specific Metrics

```typescript
interface ChatMetrics {
  // Scroll Performance
  scrollFPS: number;                    // Target: 60
  scrollJank: number;                   // Frames > 16ms

  // Virtual List
  visibleItemCount: number;             // Target: 10-20
  totalDOMNodes: number;                // Target: < 100
  heightCacheHitRate: number;           // Target: > 90%

  // Load Performance
  loadMoreLatency: number;              // Time to load + render
  messageRenderTime: number;            // Per message

  // Memory
  messageStoreSize: number;             // Messages in memory
  imagesCached: number;                 // Loaded images

  // Accuracy
  heightEstimateAccuracy: number;       // |estimated - actual| / actual
  scrollPositionDrift: number;          // หลัง load more
}
```

### 5.3 วิธีวัด Scroll Performance

```typescript
// วัด FPS ขณะ scroll
function measureScrollFPS(callback: (fps: number) => void) {
  let frames = 0;
  let lastTime = performance.now();

  function tick() {
    frames++;
    const now = performance.now();

    if (now - lastTime >= 1000) {
      callback(frames);
      frames = 0;
      lastTime = now;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// วัด Long Frames (Jank)
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn('Long frame:', entry.duration);
    }
  }
});
observer.observe({ entryTypes: ['longtask'] });
```

### 5.4 DevTools ที่ควรใช้

1. **Chrome DevTools Performance Tab**
   - Record ขณะ scroll
   - ดู flame chart หา bottleneck
   - ดู Layout Shift

2. **React DevTools Profiler**
   - หา unnecessary re-renders
   - ดู component render time

3. **Lighthouse**
   - Overall performance score
   - Recommendations

4. **Web Vitals Extension**
   - CLS (Cumulative Layout Shift)
   - FID (First Input Delay)
   - LCP (Largest Contentful Paint)

---

## 6. Common Pitfalls ที่ต้องหลีกเลี่ยง

### 6.1 Performance Killers

| Pitfall | ทำไมแย่ | วิธีแก้ |
|---------|---------|--------|
| **Render ทุก message** | DOM nodes เยอะ | Virtual scroll |
| **Re-render ทั้ง list** | Expensive | Memoization + stable keys |
| **Scroll event listener** | Fire บ่อยเกิน | Intersection Observer |
| **Calculate in render** | Block main thread | useMemo / Pre-calculate |
| **Inline styles object** | New reference ทุก render | CSS classes / styled |
| **Anonymous functions** | New reference | useCallback |
| **Deep object comparison** | Expensive | Shallow compare |

### 6.2 Common Mistakes กับ Virtual Scroll

```typescript
// ❌ BAD: Key ที่ไม่ stable
{messages.map((msg, index) => (
  <Message key={index} {...msg} />  // index เปลี่ยนเมื่อ prepend!
))}

// ✅ GOOD: Stable key
{messages.map(msg => (
  <Message key={msg.id} {...msg} />
))}


// ❌ BAD: ไม่ reserve space สำหรับ image
<img src={url} />  // Height = 0 จนกว่าจะ load

// ✅ GOOD: Reserve space ด้วย aspect ratio
<div style={{ paddingBottom: `${(height/width) * 100}%` }}>
  <img src={url} />
</div>


// ❌ BAD: Re-calculate ทุก render
function MessageList({ messages }) {
  const sorted = messages.sort((a, b) => a.timestamp - b.timestamp);
  // ...
}

// ✅ GOOD: Memoize
function MessageList({ messages }) {
  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.timestamp - b.timestamp),
    [messages]
  );
}
```

### 6.3 Library-Specific Issues

#### react-virtuoso
- ดี: API ง่าย, handle bidirectional scroll
- ปัญหา: Heavy, อาจ overkill

#### @tanstack/virtual
- ดี: Lightweight, flexible
- ปัญหา: ต้องเขียน scroll logic เอง

#### react-window
- ดี: Fast, simple
- ปัญหา: ไม่รองรับ dynamic height ดี

---

## 7. Recommended Libraries

### 7.1 Virtual Scroll Options

| Library | Dynamic Height | Bidirectional | Bundle Size | Recommendation |
|---------|---------------|---------------|-------------|----------------|
| **@tanstack/virtual** | ดี | ต้องเขียนเอง | 12KB | แนะนำ - flexible |
| **react-virtuoso** | ดีมาก | Built-in | 40KB | ดี แต่ heavy |
| **react-window** | ไม่ดี | ไม่มี | 6KB | ไม่แนะนำสำหรับ chat |
| **Custom** | ควบคุมได้หมด | ตามต้องการ | - | ถ้ามีเวลา |

### 7.2 Recommended Stack

```typescript
// Core
"@tanstack/react-virtual": "^3.x"   // Virtual scroll
"zustand": "^5.x"                    // State management
"idb-keyval": "^6.x"                 // IndexedDB wrapper

// Image
"blurhash": "^2.x"                   // Blur placeholder
"react-intersection-observer": "^9.x"  // Lazy load

// Performance
"web-vitals": "^3.x"                 // Metrics
```

### 7.3 Architecture Decision

```
แนะนำ: @tanstack/virtual + Custom scroll logic

เหตุผล:
1. Lightweight (12KB vs 40KB)
2. Full control over scroll behavior
3. Easier to customize
4. Better for bidirectional scroll
5. Active maintenance

Trade-off:
- ต้องเขียน scroll anchoring เอง
- ต้องจัดการ load more เอง
- แต่จะได้ code ที่เข้าใจและ debug ง่ายกว่า
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

#### 1.1 Setup Height Estimation System
```typescript
// ต้องทำก่อน virtual scroll
// เพราะ virtual scroll ต้องรู้ height

interface HeightEstimator {
  estimateText(content: string, width: number): number;
  estimateImage(width: number, height: number): number;
  estimateAlbum(items: AlbumItem[]): number;
  estimateFile(): number;
  estimateSticker(): number;
}
```

#### 1.2 Setup Message Store
```typescript
// Zustand store with:
// - Messages by conversation
// - Height cache
// - Pagination state

interface MessageStore {
  messages: Record<string, Message[]>;
  heightCache: Record<string, number>;

  // Pagination
  hasMoreTop: Record<string, boolean>;
  hasMoreBottom: Record<string, boolean>;

  // Actions
  loadMessages(conversationId: string, direction: 'top' | 'bottom'): Promise<void>;
  addMessage(message: Message): void;
  updateMessage(id: string, updates: Partial<Message>): void;
}
```

### Phase 2: Virtual Scroll Core (Week 2-3)

#### 2.1 Basic Virtual List
```typescript
// ไม่รู้จัก message - แค่ render items

interface VirtualListProps {
  itemCount: number;
  itemSize: (index: number) => number;
  renderItem: (index: number) => ReactNode;
  overscan?: number;
}
```

#### 2.2 Scroll Anchoring
```typescript
// จัดการ scroll position เมื่อ prepend/append

interface ScrollAnchor {
  save(): void;
  restore(): void;
}
```

### Phase 3: Message Rendering (Week 3-4)

#### 3.1 Message Components
```
TextMessage     - Simple, measure once
ImageMessage    - Aspect ratio + lazy load
FileMessage     - Fixed height
AlbumMessage    - Complex layout
StickerMessage  - Fixed size
```

#### 3.2 Message Factory
```typescript
function MessageFactory({ message }: { message: Message }) {
  switch (message.type) {
    case 'text': return <TextMessage {...message} />;
    case 'image': return <ImageMessage {...message} />;
    // ...
  }
}
```

### Phase 4: Integration & Polish (Week 4-5)

#### 4.1 Chat Integration
- Combine virtual scroll + messages
- Load more (top/bottom)
- Jump to message
- Scroll to bottom on new message

#### 4.2 Performance Optimization
- Add metrics
- Profile and fix bottlenecks
- Memory optimization

### Phase 5: Edge Cases (Week 5-6)

#### 5.1 Handle Edge Cases
- Empty state
- Error state
- Offline support
- Message editing/deleting
- Reactions

---

## Checklist ก่อน Production

### Performance
- [ ] Scroll FPS >= 55 บน mid-range device
- [ ] DOM nodes < 100 ขณะ scroll
- [ ] Memory ไม่ leak หลังใช้ 30 นาที
- [ ] Load more ไม่กระตุก

### Functionality
- [ ] Scroll ขึ้น-ลงได้ smooth
- [ ] Load more ทั้ง 2 ทิศทาง
- [ ] Jump to message ทำงานถูกต้อง
- [ ] Scroll to bottom เมื่อ message ใหม่
- [ ] Height ไม่กระโดดเมื่อ image load

### Message Types
- [ ] Text แสดงถูกต้อง
- [ ] Image มี placeholder + lazy load
- [ ] Album layout ถูกต้อง
- [ ] File download ได้
- [ ] Sticker แสดงถูกต้อง
- [ ] Reply แสดง quoted message
- [ ] Forward แสดง original sender

### Edge Cases
- [ ] Empty conversation
- [ ] Single message
- [ ] 10,000+ messages
- [ ] Very long text message
- [ ] Mixed media album
- [ ] Deleted message
- [ ] Edited message

---

## Resources

### Articles
- [Telegram Web Source Code](https://github.com/nicegram/nicegram-web-z)
- [How Discord Indexes Billions of Messages](https://discord.com/blog/how-discord-indexes-billions-of-messages)
- [Virtual Scrolling: Core Principles](https://blog.logrocket.com/virtual-scrolling-core-principles-and-basic-implementation-in-react/)

### Libraries Documentation
- [@tanstack/react-virtual](https://tanstack.com/virtual/latest)
- [react-virtuoso](https://virtuoso.dev/)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)

---

*Document Version: 1.0*
*Created: December 2024*
*สำหรับ: Chat Frontend V2 Rebuild*
