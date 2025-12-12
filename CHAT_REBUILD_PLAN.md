# Chat System Rebuild Plan - Telegram Style

## เป้าหมาย
สร้าง Chat System ใหม่ที่ลื่นไหลเหมือน Telegram โดยเขียนใหม่ทั้งหมดแยก folder

---

## Folder Structure ใหม่

```
src/components/chat-v2/
├── index.ts                    # Export ทั้งหมด
│
├── MessageList/
│   ├── index.ts
│   ├── MessageList.tsx         # Main list component
│   ├── MessageListContext.tsx  # Context สำหรับ shared functions
│   ├── useMessageList.ts       # Main hook (state + logic)
│   ├── useHeightCache.ts       # Height caching
│   ├── useScrollAnchor.ts      # Scroll position management
│   └── types.ts                # Types สำหรับ MessageList
│
├── MessageItem/
│   ├── index.ts
│   ├── MessageItem.tsx         # Wrapper component
│   ├── MessageBubble.tsx       # Bubble styling (Telegram-style)
│   ├── MessageContent.tsx      # Content renderer (switch type)
│   ├── MessageStatus.tsx       # Read/Delivered/Sent icons
│   ├── MessageTime.tsx         # Timestamp display
│   └── MessageContextMenu.tsx  # Right-click menu
│
├── messages/
│   ├── index.ts
│   ├── TextMessage.tsx         # Text only
│   ├── ImageMessage.tsx        # Single image
│   ├── FileMessage.tsx         # File attachment
│   ├── StickerMessage.tsx      # Sticker
│   ├── AlbumMessage.tsx        # Multiple images/videos
│   ├── ReplyMessage.tsx        # Reply to message
│   └── ForwardedMessage.tsx    # Forwarded message
│
├── shared/
│   ├── DateSeparator.tsx       # Date divider
│   ├── ScrollToBottom.tsx      # Scroll button
│   ├── TypingIndicator.tsx     # Typing dots
│   └── EditMessageForm.tsx     # Edit UI
│
└── styles/
    └── telegram.css            # Telegram-style CSS variables
```

---

## Step-by-Step Implementation

### Step 1: Setup Foundation
**สร้าง folder structure + base components**

```
Tasks:
□ สร้าง folder src/components/chat-v2/
□ สร้าง types.ts - กำหนด interfaces ทั้งหมด
□ สร้าง MessageListContext.tsx - shared functions
□ สร้าง telegram.css - CSS variables สำหรับ Telegram style
□ สร้าง index.ts exports
```

**Deliverable:** Folder structure พร้อมใช้งาน

---

### Step 2: MessageBubble (Telegram Style)
**สร้าง bubble component ที่เหมือน Telegram**

#### Telegram Bubble Specs:

```css
/* Telegram-style measurements */
:root {
  /* Bubble */
  --bubble-max-width: 420px;
  --bubble-min-width: 80px;
  --bubble-padding-x: 12px;
  --bubble-padding-y: 6px;
  --bubble-radius: 16px;
  --bubble-radius-tail: 4px;      /* มุมที่มี tail */

  /* Colors - Light */
  --bubble-own-bg: #EFFDDE;        /* เขียวอ่อน */
  --bubble-other-bg: #FFFFFF;      /* ขาว */
  --bubble-own-text: #000000;
  --bubble-other-text: #000000;

  /* Colors - Dark */
  --bubble-own-bg-dark: #2B5278;   /* น้ำเงินเข้ม */
  --bubble-other-bg-dark: #182533; /* เทาเข้ม */

  /* Spacing */
  --message-gap: 2px;              /* ระหว่าง messages ต่อเนื่อง */
  --message-group-gap: 8px;        /* ระหว่าง groups (ต่าง sender) */
  --message-padding-x: 8px;        /* ซ้าย-ขวา container */

  /* Text */
  --text-size: 14px;
  --text-line-height: 1.4;
  --time-size: 11px;
  --time-color: rgba(0,0,0,0.45);

  /* Media */
  --media-max-width: 320px;
  --media-max-height: 320px;
  --media-radius: 12px;
  --media-min-width: 200px;

  /* Sticker */
  --sticker-size: 160px;
}
```

#### Bubble Component:

```tsx
// MessageBubble.tsx - Telegram-style bubble

interface MessageBubbleProps {
  isOwn: boolean;
  isFirst: boolean;      // First in group (show tail)
  isLast: boolean;       // Last in group
  hasMedia: boolean;     // No padding for media
  children: React.ReactNode;
}

// Tail positions:
// - Own message: bottom-right
// - Other message: bottom-left
// - Only show on FIRST message in group
```

**Deliverable:** MessageBubble component ที่เหมือน Telegram

---

### Step 3: Message Types
**สร้าง message components แต่ละประเภท**

#### 3.1 TextMessage
```
Specs:
- Max width: 420px
- Padding: 12px x 6px
- Font: 14px, line-height 1.4
- Time: inline ที่มุมขวาล่าง (ถ้าพอ) หรือบรรทัดใหม่
- Link: สีฟ้า, underline on hover
- Emoji only: ขนาดใหญ่ขึ้น (24px), ไม่มี bubble
```

#### 3.2 ImageMessage
```
Specs:
- Max: 320x320px
- Min width: 200px
- Aspect ratio preserved
- Border radius: 12px (16px ถ้าไม่มี caption)
- Caption: แยก bubble ด้านล่าง
- Skeleton: blur placeholder
- Click: open lightbox
```

#### 3.3 FileMessage
```
Specs:
- Fixed height: ~56px
- Icon: file type icon (left)
- Info: filename + size
- Download button on hover
- Progress bar when downloading
```

#### 3.4 StickerMessage
```
Specs:
- Size: 160x160px
- No bubble background
- No padding
- GIF: pause when out of viewport
```

#### 3.5 AlbumMessage
```
Specs:
- Grid layout (1-10 items)
- Max width: 320px
- Gap: 2px
- Layouts:
  - 1: full width
  - 2: 50-50 horizontal
  - 3: 1 big + 2 small
  - 4: 2x2 grid
  - 5+: complex grid
- Caption: shared, below grid
```

**Deliverable:** Message components ทุกประเภท

---

### Step 4: MessageItem Wrapper
**Component ที่รวม bubble + content + interactions**

```tsx
// MessageItem.tsx

interface MessageItemProps {
  message: MessageDTO;
  prevMessage?: MessageDTO;    // สำหรับ grouping
  nextMessage?: MessageDTO;    // สำหรับ grouping
}

// Responsibilities:
// 1. Determine if first/last in group
// 2. Wrap with MessageBubble
// 3. Add context menu
// 4. Handle selection mode
// 5. Handle long press (mobile)
```

#### Message Grouping Logic:
```typescript
// Group messages from same sender within 1 minute
function shouldGroup(current: Message, prev: Message): boolean {
  if (!prev) return false;
  if (current.sender_id !== prev.sender_id) return false;

  const timeDiff = new Date(current.created_at) - new Date(prev.created_at);
  return timeDiff < 60000; // 1 minute
}
```

**Deliverable:** MessageItem component พร้อม grouping

---

### Step 5: MessageList Core
**Main list component ด้วย Virtuoso**

```tsx
// MessageList.tsx - Clean implementation

interface MessageListProps {
  messages: MessageDTO[];
  onLoadMore?: () => Promise<void>;
  onMessageAction?: (action: string, messageId: string) => void;
}

// Key principles:
// 1. Virtuoso handles virtualization
// 2. No nested component definitions
// 3. Height cache in separate hook
// 4. Scroll anchor in separate hook
// 5. Minimal props (use context)
```

#### Virtuoso Config (Simplified):
```tsx
<Virtuoso
  data={messages}
  firstItemIndex={firstItemIndex}
  itemContent={(index, message) => (
    <MessageItem
      message={message}
      prevMessage={messages[index - 1]}
      nextMessage={messages[index + 1]}
    />
  )}

  // Load more at top
  startReached={handleLoadMore}

  // Auto-scroll for new messages
  followOutput="smooth"

  // Increase buffer
  increaseViewportBy={{ top: 800, bottom: 400 }}
/>
```

**Deliverable:** MessageList component ที่ clean

---

### Step 6: Hooks
**แยก logic ออกเป็น hooks**

#### 6.1 useHeightCache
```typescript
// Simple height cache
function useHeightCache() {
  const cache = useRef<Map<string, number>>(new Map());

  const getHeight = (id: string) => cache.current.get(id);
  const setHeight = (id: string, height: number) => {
    cache.current.set(id, height);
  };

  return { getHeight, setHeight };
}
```

#### 6.2 useScrollAnchor
```typescript
// Maintain scroll position during prepend
function useScrollAnchor(virtuosoRef: RefObject<VirtuosoHandle>) {
  const anchorRef = useRef<{ index: number; offset: number } | null>(null);

  const saveAnchor = () => { /* save current position */ };
  const restoreAnchor = () => { /* restore after prepend */ };

  return { saveAnchor, restoreAnchor };
}
```

#### 6.3 useMessageList
```typescript
// Main list logic
function useMessageList(messages: MessageDTO[]) {
  // Deduplication
  // Sorting
  // Grouping
  // Load more state

  return {
    processedMessages,
    isLoading,
    loadMore,
    scrollToMessage,
    scrollToBottom
  };
}
```

**Deliverable:** Hooks ที่ reusable

---

### Step 7: Context Menu & Selection
**Interactions และ multi-select**

```tsx
// MessageContextMenu.tsx
- Reply
- Edit (own messages only)
- Copy
- Forward
- Delete
- Select

// Selection Mode:
- Long press to enter
- Checkbox on each message
- Toolbar: Forward, Delete, Cancel
```

**Deliverable:** Context menu และ selection mode

---

### Step 8: Integration & Testing
**เชื่อมต่อกับ app หลัก**

```tsx
// ใช้ query param เพื่อ test
// ?chat=v2 → ใช้ MessageList ใหม่
// ไม่มี param → ใช้ของเดิม

// ConversationPageDemo.tsx
const useNewChat = searchParams.get('chat') === 'v2';

{useNewChat ? (
  <MessageListV2 messages={messages} ... />
) : (
  <MessageArea messages={messages} ... />
)}
```

**Testing checklist:**
- [ ] Text messages render correctly
- [ ] Images load with skeleton
- [ ] Stickers display properly
- [ ] Albums show grid layout
- [ ] Files show download button
- [ ] Reply shows quoted message
- [ ] Forwarded shows original sender
- [ ] Date separator between days
- [ ] Scroll to bottom button works
- [ ] Load more at top works
- [ ] New message auto-scroll works
- [ ] Selection mode works
- [ ] Context menu works
- [ ] Edit message works
- [ ] 60fps scroll on 1000+ messages

**Deliverable:** Working integration

---

## Message Type Specifications

### Layout Comparison: Current vs Telegram

| Element | Current | Telegram | Action |
|---------|---------|----------|--------|
| Bubble max-width | 70% | 420px fixed | Change |
| Bubble padding | 12px | 12px x 6px | Adjust |
| Bubble radius | 16px | 16px + tail | Add tail |
| Message gap | 8px | 2px (grouped) | Reduce |
| Time position | Below | Inline/corner | Change |
| Own color | Blue | Green (#EFFDDE) | Change |
| Other color | Gray | White | Change |
| Media max | 320px | 320px | Keep |
| Sticker size | 120px | 160px | Increase |

### Bubble Tail (Telegram Style)
```
Own message (right side):
┌──────────────┐
│  Hello!      │
│         12:34│╲  ← tail bottom-right
└──────────────┘

Other message (left side):
     ┌──────────────┐
  ╱  │  Hi there!   │
     │  12:35       │
     └──────────────┘
     ↑ tail bottom-left
```

---

## Performance Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Scroll FPS | 60fps | Chrome DevTools Performance |
| Initial render | < 100ms | Performance.mark() |
| Load more | < 200ms | Console timing |
| DOM nodes | < 50 visible | React DevTools |
| Memory | < 50MB | Chrome DevTools Memory |
| Bundle size | < 50KB | Build output |

---

## Migration Strategy

### Phase 1: Build (ไม่กระทบ production)
```
Week 1:
- Setup folder structure
- MessageBubble component
- Basic message types (Text, Image)

Week 2:
- Remaining message types
- MessageList with Virtuoso
- Hooks (height cache, scroll anchor)
```

### Phase 2: Test (ใช้ ?chat=v2)
```
Week 3:
- Integration with ConversationPage
- Testing all features
- Performance optimization
- Bug fixes
```

### Phase 3: Replace (เมื่อพร้อม)
```
Week 4:
- Remove old VirtualMessageList
- Update imports
- Clean up
```

---

## Files to Create

### Priority Order:

```
1. src/components/chat-v2/styles/telegram.css
2. src/components/chat-v2/MessageList/types.ts
3. src/components/chat-v2/MessageList/MessageListContext.tsx
4. src/components/chat-v2/MessageItem/MessageBubble.tsx
5. src/components/chat-v2/MessageItem/MessageTime.tsx
6. src/components/chat-v2/MessageItem/MessageStatus.tsx
7. src/components/chat-v2/messages/TextMessage.tsx
8. src/components/chat-v2/messages/ImageMessage.tsx
9. src/components/chat-v2/messages/FileMessage.tsx
10. src/components/chat-v2/messages/StickerMessage.tsx
11. src/components/chat-v2/messages/AlbumMessage.tsx
12. src/components/chat-v2/MessageItem/MessageContent.tsx
13. src/components/chat-v2/MessageItem/MessageItem.tsx
14. src/components/chat-v2/MessageList/useHeightCache.ts
15. src/components/chat-v2/MessageList/useScrollAnchor.ts
16. src/components/chat-v2/MessageList/useMessageList.ts
17. src/components/chat-v2/MessageList/MessageList.tsx
18. src/components/chat-v2/shared/DateSeparator.tsx
19. src/components/chat-v2/shared/ScrollToBottom.tsx
20. src/components/chat-v2/index.ts
```

---

## Summary

### ทำไมต้องเขียนใหม่?
1. Code เดิม 1100+ lines - ใหญ่เกิน maintain
2. Nested components - memo ไม่ทำงาน
3. 16 refs/states - ซับซ้อนเกินไป
4. 50+ console.log - ช้าและรก
5. Technical debt สะสมมาก

### แนวทางใหม่
1. แยก folder ชัดเจน (chat-v2/)
2. Component เล็กๆ แต่ละไฟล์
3. Hooks แยก logic ออก
4. Context ลด prop drilling
5. Telegram-style UI

### เริ่มจากไหน?
**Step 1: Setup folder + CSS variables**

พร้อมเริ่มเลยไหมครับ?

---

*Created: December 2024*
*Version: 1.0*
