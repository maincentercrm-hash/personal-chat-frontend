# 🎯 Jump to Message & Scroll Behavior - Complete Analysis

## 🎯 Overview

This document analyzes the jump to message functionality, auto-scroll behavior, and all scroll-related interactions in the virtual message list.

---

## 🏗️ System Architecture

### Components Involved

```
useScrollHandlers (Hook)
├── jumpToMessage()           - Jump to specific message
├── scrollToBottom()          - Scroll to latest message
├── handleJumpRequest()       - Process jump requests
└── highlightMessage()        - Visual feedback

VirtualMessageList (Component)
├── virtuosoRef               - Imperative API access
├── followOutput              - Auto-scroll to bottom
├── initialTopMostItemIndex   - Starting scroll position
└── scrollToIndex()           - Virtuoso method

MessageItem (Component)
└── Highlight animation       - Yellow ring effect
```

---

## 🎯 Jump to Message Functionality

### Two-Phase Scroll Strategy

**File:** `src/hooks/useScrollHandlers.ts` lines 86-127

**Why two phases?**
1. **Phase 1 (Instant):** Pre-render items in viewport so images can start loading
2. **Phase 2 (Smooth):** Smooth scroll after images loaded for better UX

### Implementation

```typescript
const jumpToMessage = useCallback((messageId: string, smooth = true) => {
  if (!virtuosoRef?.current) {
    console.error('[Jump] Virtuoso ref not available');
    return;
  }

  // Find target message index
  const targetIndex = deduplicatedMessages.findIndex(msg => msg.id === messageId);

  if (targetIndex === -1) {
    console.error(`[Jump] Message ${messageId} not found in list`);
    return;
  }

  const totalMessages = deduplicatedMessages.length;
  const percentPosition = (targetIndex / totalMessages) * 100;

  console.log(
    `[Jump] Scrolling to index ${targetIndex}/${totalMessages} ` +
    `(${percentPosition.toFixed(1)}% through conversation)`
  );

  // ====== PHASE 1: Instant scroll to pre-render ======
  virtuosoRef.current.scrollToIndex({
    index: targetIndex,
    align: percentPosition < 10 ? 'start' : 'center',
    behavior: 'auto'  // Instant, no animation
  });

  // ====== Wait 400ms for images to load ======
  setTimeout(() => {
    // ====== PHASE 2: Smooth scroll after pre-render ======
    console.log('[Jump] Retry scroll after images loaded');

    virtuosoRef.current?.scrollToIndex({
      index: targetIndex,
      align: percentPosition < 10 ? 'start' : 'center',
      behavior: smooth ? 'smooth' : 'auto'
    });

    // ====== PHASE 3: Highlight message ======
    setTimeout(() => {
      const element = document.getElementById(`message-${messageId}`);
      if (element) {
        // Add highlight classes
        element.classList.add(
          'ring-4',
          'ring-yellow-400',
          'ring-offset-2',
          'transition-all',
          'duration-300'
        );

        console.log('[Jump] ✨ Highlighting message for 2s');

        // Remove highlight after 2 seconds
        setTimeout(() => {
          element.classList.remove(
            'ring-4',
            'ring-yellow-400',
            'ring-offset-2',
            'transition-all',
            'duration-300'
          );
        }, 2000);
      }
    }, 500); // Wait for smooth scroll to finish

  }, 400); // Image pre-load delay

}, [deduplicatedMessages]);
```

### Scroll Alignment Logic

**Alignment based on position in conversation:**

```typescript
const percentPosition = (targetIndex / totalMessages) * 100;

if (percentPosition < 10) {
  align = 'start';  // Near beginning → Align to top
} else {
  align = 'center'; // Middle/end → Align to center
}
```

**Why this logic?**
- **Start alignment (top 10%):** Messages at beginning usually read first → top alignment natural
- **Center alignment (rest):** Middle messages → center alignment keeps context visible above/below

**Visual:**
```
Messages 0-50 (top 10%):
┌────────────────┐
│ Target message │ ← Aligned to top
│ Next message   │
│ ...            │
└────────────────┘

Messages 51-500:
┌────────────────┐
│ Previous msg   │
│ Target message │ ← Aligned to center
│ Next message   │
└────────────────┘
```

### Timing Breakdown

```
t=0ms:     jumpToMessage() called
             ↓
t=0ms:     Phase 1 - Instant scroll (behavior: 'auto')
             ↓ Virtuoso renders target message immediately
             ↓ Images start loading
             ↓
t=400ms:   Phase 2 - Smooth scroll (behavior: 'smooth')
             ↓ Smooth animation to final position
             ↓ Animation duration: ~300-500ms
             ↓
t=500ms:   Phase 3 - Highlight starts
             ↓ Yellow ring animation
             ↓ CSS transition: 300ms
             ↓
t=2500ms:  Highlight removed
             ↓ Fade out transition: 300ms
             ↓
t=2800ms:  ✅ Complete
```

### Edge Cases Handled

**Case 1: Message not in loaded messages**
```typescript
const targetIndex = deduplicatedMessages.findIndex(msg => msg.id === messageId);

if (targetIndex === -1) {
  console.error(`[Jump] Message ${messageId} not found`);

  // Option A: Load messages around target (not implemented)
  // Option B: Show error to user (not implemented)
  // Current: Just logs error and does nothing
  return;
}
```

**Case 2: Virtuoso ref not available**
```typescript
if (!virtuosoRef?.current) {
  console.error('[Jump] Virtuoso ref not available');
  return;
}
```

**Case 3: Jump during ongoing scroll**
```typescript
// No protection currently!
// If user jumps while already jumping, both animations conflict
// Should add: if (isJumping) return;
```

---

## ⬇️ Scroll to Bottom Functionality

### Implementation

**File:** `src/hooks/useScrollHandlers.ts` lines 129-142

```typescript
const scrollToBottom = useCallback((smooth = true) => {
  if (!virtuosoRef?.current) {
    console.error('[ScrollToBottom] Virtuoso ref not available');
    return;
  }

  const lastIndex = deduplicatedMessages.length - 1;

  console.log(`[ScrollToBottom] Scrolling to index ${lastIndex} (${smooth ? 'smooth' : 'instant'})`);

  virtuosoRef.current.scrollToIndex({
    index: lastIndex,
    align: 'end',     // Align to bottom of viewport
    behavior: smooth ? 'smooth' : 'auto'
  });
}, [deduplicatedMessages]);
```

### Use Cases

**1. New Message Received (Auto-scroll)**
```typescript
// When new message arrives
useEffect(() => {
  if (shouldAutoScroll) {
    scrollToBottom(true); // Smooth scroll
  }
}, [messages]);
```

**2. User Clicks "Scroll to Bottom" Button**
```tsx
<Button onClick={() => scrollToBottom(true)}>
  ↓ Jump to latest
</Button>
```

**3. After Sending Message**
```typescript
const sendMessage = async () => {
  await api.sendMessage(content);
  scrollToBottom(true); // Scroll to see sent message
};
```

### Auto-Scroll Logic

**Follow Output Configuration:**

```tsx
<Virtuoso
  followOutput={(isAtBottom) => {
    // If user is already at bottom, auto-scroll to new messages
    if (isAtBottom) {
      return 'smooth'; // Smooth scroll to bottom
    }

    // If user scrolled up, don't auto-scroll
    return false;
  }}
/>
```

**Behavior:**
```
Scenario 1: User at bottom
  New message arrives → Auto-scroll (smooth) ✅

Scenario 2: User scrolled up (reading old messages)
  New message arrives → Don't auto-scroll ✅
  Show "New messages ↓" badge instead
```

---

## 📜 Initial Scroll Position

### Configuration

**File:** `src/components/shared/VirtualMessageList.tsx` lines 436-437

```typescript
<Virtuoso
  initialTopMostItemIndex={Math.max(0, deduplicatedMessages.length - 1)}
  // Starts at last message (bottom of conversation)
/>
```

### Calculation Logic

```typescript
const totalMessages = deduplicatedMessages.length;
const initialIndex = Math.max(0, totalMessages - 1);

// Examples:
// 0 messages:   Math.max(0, -1) = 0
// 1 message:    Math.max(0, 0) = 0
// 100 messages: Math.max(0, 99) = 99 ← Starts at bottom
```

**Why `Math.max(0, ...)`?**
- Prevents negative index if message array is empty
- Ensures valid starting position

### Initial Load Sequence

```
1. Component mounts
   ↓
2. Fetch initial messages (e.g., last 50)
   ↓
3. deduplicatedMessages = [msg1, msg2, ..., msg50]
   ↓
4. Virtuoso renders with initialTopMostItemIndex = 49
   ↓
5. Scrolls to message 49 (bottom)
   ↓
6. User sees latest messages ✅
```

---

## 🔄 Scroll Event Handling

### Scroll State Tracking

```typescript
const [isAtTop, setIsAtTop] = useState(false);
const [isAtBottom, setIsAtBottom] = useState(true); // Default: true (starts at bottom)

<Virtuoso
  atTopStateChange={(atTop) => {
    setIsAtTop(atTop);
    console.log('[Scroll] At top:', atTop);

    if (atTop && !isLoadingMore) {
      handleLoadMore(); // Load older messages
    }
  }}

  atBottomStateChange={(atBottom) => {
    setIsAtBottom(atBottom);
    console.log('[Scroll] At bottom:', atBottom);

    if (!atBottom) {
      setShowScrollToBottom(true); // Show "Jump to bottom" button
    } else {
      setShowScrollToBottom(false);
    }
  }}
/>
```

### Scroll to Bottom Button

**Conditional Rendering:**

```tsx
{!isAtBottom && (
  <div className="scroll-to-bottom-button">
    <Button
      onClick={() => scrollToBottom(true)}
      className="fixed bottom-20 right-4 rounded-full shadow-lg"
    >
      <ChevronDown />
      {unreadCount > 0 && (
        <Badge>{unreadCount} new</Badge>
      )}
    </Button>
  </div>
)}
```

**UX Pattern:**
```
User scrolls up to read old messages
  ↓
isAtBottom = false
  ↓
"Jump to bottom" button appears
  ↓
User clicks button OR
  ↓              ↓ New message arrives
Scroll smooth    Don't auto-scroll (user reading)
  ↓              ↓
isAtBottom = true   Badge shows "3 new messages"
  ↓              ↓
Button hides       User clicks badge → Scroll to bottom
```

---

## 🎨 Highlight Animation

### CSS Implementation

**Applied Classes:**
```typescript
element.classList.add(
  'ring-4',           // 4px ring
  'ring-yellow-400',  // Yellow color
  'ring-offset-2',    // 2px offset from element
  'transition-all',   // Smooth transition
  'duration-300'      // 300ms animation
);
```

**Generated CSS:**
```css
.ring-4 {
  box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.5);
}

.ring-yellow-400 {
  --tw-ring-color: rgb(250 204 21);
}

.ring-offset-2 {
  --tw-ring-offset-width: 2px;
}

.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.duration-300 {
  transition-duration: 300ms;
}
```

### Animation Timeline

```
t=0ms:    Classes added
            ↓ CSS transition starts
            ↓
t=300ms:  Ring fully visible (yellow, 4px)
            ↓ Ring stays visible
            ↓
t=2000ms: Remove classes triggered
            ↓ CSS transition starts (fade out)
            ↓
t=2300ms: Ring fully invisible ✅
```

### Visual Effect

```
Before highlight:
┌─────────────────────────┐
│ This is a message       │
└─────────────────────────┘

During highlight (t=300ms - t=2000ms):
┌─────────────────────────┐
│ This is a message       │ ← Yellow ring around message
└─────────────────────────┘
  ╔═══════════════════════╗
  ║ (Yellow ring 4px)     ║
  ╚═══════════════════════╝

After highlight (t=2300ms):
┌─────────────────────────┐
│ This is a message       │
└─────────────────────────┘
```

---

## 🐛 Known Issues

### Issue #1: Jump During Load More

**Problem:** If user jumps to old message that triggers load more, scroll position unstable.

**Example:**
```
1. User jumps to message #20 (near top)
2. Virtuoso scrolls to index 20
3. Index 20 is within 400px of top
4. atTopStateChange(true) fires
5. Load more triggered
6. 20 new messages prepended
7. Target message now at index 40 (20 + 20)
8. Scroll position shifts ❌
```

**Solution:** Disable load more during jump animation
```typescript
const isJumping = useRef(false);

const jumpToMessage = () => {
  isJumping.current = true;
  // ... jump logic ...
  setTimeout(() => {
    isJumping.current = false;
  }, 1000);
};

const handleLoadMore = () => {
  if (isJumping.current) {
    console.log('[LoadMore] Blocked during jump');
    return;
  }
  // ... load logic ...
};
```

---

### Issue #2: Highlight Element Not Found

**Problem:** If target message not yet rendered (outside viewport), highlight fails silently.

```typescript
setTimeout(() => {
  const element = document.getElementById(`message-${messageId}`);
  if (element) {
    element.classList.add(...); // Highlight
  } else {
    // ❌ No feedback that highlight failed
    console.warn('[Jump] Element not found for highlight');
  }
}, 500);
```

**Why element might not exist:**
- Message far from viewport (Virtuoso only renders visible + buffer)
- Slow rendering (500ms not enough)
- DOM ID mismatch

**Solution:** Retry logic
```typescript
const tryHighlight = (attempts = 0) => {
  const element = document.getElementById(`message-${messageId}`);

  if (element) {
    element.classList.add(...);
  } else if (attempts < 5) {
    setTimeout(() => tryHighlight(attempts + 1), 200);
  } else {
    console.error('[Jump] Failed to highlight after 5 attempts');
  }
};

setTimeout(() => tryHighlight(), 500);
```

---

### Issue #3: Multiple Simultaneous Jumps

**Problem:** If user clicks jump twice rapidly, both animations conflict.

```
t=0ms:    First jump starts (to msg-100)
t=100ms:  Second jump starts (to msg-200)
t=400ms:  First jump Phase 2 → Scrolls to msg-100
t=500ms:  Second jump Phase 2 → Scrolls to msg-200
Result: Jerky animation, confusing UX ❌
```

**Solution:** Debounce or queue jumps
```typescript
const jumpQueue = useRef<string[]>([]);
const isJumping = useRef(false);

const jumpToMessage = (messageId: string) => {
  if (isJumping.current) {
    // Queue this jump
    jumpQueue.current.push(messageId);
    return;
  }

  isJumping.current = true;

  // ... jump logic ...

  setTimeout(() => {
    isJumping.current = false;

    // Process next jump in queue
    const nextJump = jumpQueue.current.shift();
    if (nextJump) {
      jumpToMessage(nextJump);
    }
  }, 1000);
};
```

---

### Issue #4: Image Load Delay Insufficient

**Problem:** 400ms might not be enough for slow connections.

```typescript
// Current
setTimeout(() => {
  /* Phase 2 smooth scroll */
}, 400); // Images might still loading on slow 3G
```

**Better approach:** Wait for actual image load
```typescript
const waitForImages = async () => {
  const images = element.querySelectorAll('img');
  const promises = Array.from(images).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve; // Don't block on error
      setTimeout(resolve, 2000); // Timeout after 2s
    });
  });
  await Promise.all(promises);
};

// Phase 1: Instant scroll
virtuosoRef.current.scrollToIndex({ ... });

// Wait for images
await waitForImages();

// Phase 2: Smooth scroll
virtuosoRef.current.scrollToIndex({ ... });
```

---

## 📊 Scroll Performance Analysis

### Smooth Scroll Performance

**Browser Implementation:**
- Uses `requestAnimationFrame` for smooth 60fps
- Duration: ~300-500ms (browser-dependent)
- Easing: Typically `ease-in-out`

**Performance Impact:**
```
Scroll distance: 5000px
Animation frames: 30-50 frames @ 60fps
Per-frame work:
- Virtuoso recalculates visible items: ~2-5ms
- React re-renders: ~5-10ms
- Browser layout/paint: ~5-10ms

Total per frame: ~12-25ms
Frame budget: 16.67ms (60fps)

Result: May drop to 40-50fps during long smooth scrolls ⚠️
```

**Optimization:**
```typescript
// Use 'auto' (instant) for very long distances
const distance = Math.abs(targetIndex - currentIndex);

const behavior = distance > 100 ? 'auto' : 'smooth';
// Jump >100 messages instantly, otherwise smooth
```

---

### Auto-Scroll Performance

**Follow Output Mode:**
```tsx
<Virtuoso
  followOutput="smooth"
  // Alternative: followOutput="auto" (instant, no animation)
/>
```

**Performance Comparison:**

| Mode | Animation | CPU Usage | UX |
|------|-----------|-----------|-----|
| `'smooth'` | ✅ Yes | Medium (60fps animation) | Best |
| `'auto'` | ❌ No | Low (instant) | Jarring |
| `false` | ❌ Disabled | Lowest | Requires manual scroll |

**Recommendation:** Use `'smooth'` for better UX, trade-off in CPU acceptable.

---

## 🎯 Improvement Recommendations

### Priority 1: Fix Jump During Load More

```typescript
const isJumping = useRef(false);
const jumpCooldown = useRef(0);

const jumpToMessage = () => {
  isJumping.current = true;
  jumpCooldown.current = Date.now() + 1000;
  // ... jump logic ...
};

const handleLoadMore = () => {
  if (Date.now() < jumpCooldown.current) {
    console.log('[LoadMore] Blocked: Recent jump');
    return;
  }
  // ... load logic ...
};
```

### Priority 2: Retry Highlight Logic

```typescript
const highlightWithRetry = (messageId: string, maxAttempts = 5) => {
  let attempts = 0;

  const tryHighlight = () => {
    const element = document.getElementById(`message-${messageId}`);

    if (element) {
      element.classList.add(...);
      setTimeout(() => element.classList.remove(...), 2000);
    } else if (attempts < maxAttempts) {
      attempts++;
      setTimeout(tryHighlight, 200);
    } else {
      console.error('[Highlight] Failed after', maxAttempts, 'attempts');
    }
  };

  setTimeout(tryHighlight, 500);
};
```

### Priority 3: Wait for Actual Image Load

```typescript
const jumpToMessage = async (messageId: string) => {
  // Phase 1: Instant scroll
  virtuosoRef.current.scrollToIndex({ index: targetIndex, behavior: 'auto' });

  // Wait for images with timeout
  const element = document.getElementById(`message-${messageId}`);
  if (element) {
    await Promise.race([
      waitForImages(element),
      new Promise(resolve => setTimeout(resolve, 1000)) // Max 1s wait
    ]);
  }

  // Phase 2: Smooth scroll
  virtuosoRef.current.scrollToIndex({ index: targetIndex, behavior: 'smooth' });

  // Phase 3: Highlight
  highlightWithRetry(messageId);
};
```

### Priority 4: Debounce Jumps

```typescript
import { debounce } from 'lodash';

const jumpToMessageDebounced = debounce(
  (messageId: string) => {
    jumpToMessage(messageId);
  },
  300, // 300ms debounce
  { leading: true, trailing: false } // Execute first click, ignore rapid subsequent
);
```

---

## 📈 Jump/Scroll Flow Diagram

### Complete Jump to Message Flow

```
User clicks "Jump to Message"
    ↓
jumpToMessage(messageId) called
    ↓
Find target index in array
    ↓
Target found?
    ├─ NO → Log error, abort ❌
    └─ YES ↓
Calculate position percentage
    ↓
Determine alignment (start vs center)
    ↓
=== PHASE 1: Instant Scroll ===
    ↓
scrollToIndex({ behavior: 'auto' })
    ↓
Virtuoso jumps to position instantly
    ↓
Target message rendered
    ↓
Images start loading
    ↓
Wait 400ms...
    ↓
=== PHASE 2: Smooth Scroll ===
    ↓
scrollToIndex({ behavior: 'smooth' })
    ↓
Smooth animation to final position
    ↓
Animation completes (~300-500ms)
    ↓
Wait 500ms...
    ↓
=== PHASE 3: Highlight ===
    ↓
Find element by ID
    ↓
Element found?
    ├─ NO → Log warning ⚠️
    └─ YES ↓
Add yellow ring classes
    ↓
CSS transition (300ms)
    ↓
Ring visible for 2000ms
    ↓
Remove ring classes
    ↓
CSS transition out (300ms)
    ↓
✅ Jump complete
```

---

**Summary:** The jump/scroll system is well-designed with two-phase scrolling and visual feedback, but needs fixes for edge cases like jumping during load more and ensuring highlight reliability.
