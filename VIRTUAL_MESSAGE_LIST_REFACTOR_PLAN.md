# VirtualMessageList Refactoring Plan

## Current Status
- **Current file size**: 873 lines
- **Target**: Reduce to ~300-400 lines
- **Approach**: Extract components and hooks while minimizing props drilling

## Problem Analysis

### 1. Large Sections (by line count)
- **MessageItem Component**: ~236 lines (27% of file!) ⚠️ BIGGEST
- **Effects**: ~100 lines
- **Scroll Handlers**: ~70 lines
- **CUSTOM HOOKS**: ~70 lines
- **Computed Values**: ~60 lines
- **Load More Handlers**: ~50 lines
- **Height Estimation**: ~30 lines

### 2. Props Drilling Issues
MessageItem currently needs **20+ props**:
- message (data)
- Display helpers: isOwnMessage, getMessageStatus, renderMessageStatus, formatMessageStatus, getFormattedSender, formatTime
- Callbacks: onImageClick, onJumpToMessage, onReplyMessage, onEditMessage, onDeleteMessage, onResendMessage, handleCopyMessage
- Album: groupedAlbums, renderAlbum
- Height cache: updateHeightCache, estimateMessageHeight, USE_HEIGHT_CACHE, USE_RESIZE_OBSERVER
- Flags: isBusinessView, isGroupChat, currentUserId

## Refactoring Strategy

### Phase 1: Create Context to Reduce Props Drilling
**File**: `src/contexts/MessageListContext.tsx`

**Purpose**: Provide common props to all message components without passing through VirtualMessageList

**Context will include**:
```typescript
interface MessageListContextValue {
  // Display helpers
  formatTime: (timestamp: string) => string;
  isOwnMessage: (message: MessageDTO) => boolean;
  getMessageStatus: (message: MessageDTO, isUser: boolean) => string | undefined;
  renderMessageStatus: (status: string | null) => string | null;
  formatMessageStatus: (status: string | null) => string | undefined;
  getFormattedSender: (message: MessageDTO, defaultName?: string) => string;

  // Callbacks
  onImageClick?: (imageUrl: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  onReplyMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onResendMessage?: (messageId: string) => void;
  handleCopyMessage: (content: string) => void;

  // Album
  groupedAlbums: Record<string, MessageDTO[]>;
  renderAlbum: (albumId: string, messages: MessageDTO[]) => JSX.Element | null;

  // Height cache
  updateHeightCache: (messageId: string, height: number) => void;
  estimateMessageHeight: (message: MessageDTO) => number;
  USE_HEIGHT_CACHE: React.MutableRefObject<boolean>;
  USE_RESIZE_OBSERVER: React.MutableRefObject<boolean>;

  // Flags
  isBusinessView?: boolean;
  isGroupChat?: boolean;
  currentUserId: string;
}
```

**Benefits**:
- MessageItem only needs: `message` prop (+ context)
- Reduce from 20+ props to 1 prop!
- Easier to maintain and test

---

### Phase 2: Extract MessageItem Component
**File**: `src/components/shared/VirtualMessageList/MessageItem.tsx`

**Size**: ~236 lines → Reduces VirtualMessageList by 27%!

**Props** (AFTER using context):
```typescript
interface MessageItemProps {
  message: MessageDTO;
}
```

**Implementation**:
```typescript
// MessageItem.tsx
import { memo, useMemo, useRef, useLayoutEffect } from 'react';
import { useMessageListContext } from '@/contexts/MessageListContext';
import type { MessageDTO } from '@/types/message.types';
// ... other imports

export const MessageItem = memo(({ message }: MessageItemProps) => {
  // Get everything from context
  const {
    isOwnMessage,
    getMessageStatus,
    renderMessageStatus,
    formatMessageStatus,
    getFormattedSender,
    formatTime,
    onImageClick,
    onJumpToMessage,
    onReplyMessage,
    onEditMessage,
    onDeleteMessage,
    onResendMessage,
    handleCopyMessage,
    groupedAlbums,
    renderAlbum,
    updateHeightCache,
    estimateMessageHeight,
    USE_HEIGHT_CACHE,
    USE_RESIZE_OBSERVER,
    isBusinessView,
    isGroupChat,
    currentUserId
  } = useMessageListContext();

  // ... rest of component logic (same as before)
}, customComparison);
```

---

### Phase 3: Extract Scroll Handlers Hook
**File**: `src/hooks/useScrollHandlers.ts`

**Size**: ~70 lines

**Purpose**: Manage all scroll-related logic

**Exports**:
```typescript
interface UseScrollHandlersProps {
  virtuosoRef: React.RefObject<VirtuosoHandle>;
  deduplicatedMessages: MessageDTO[];
  onLoadMore?: () => void;
  onLoadMoreAtBottom?: () => void;
  setAtBottom: (atBottom: boolean) => void;
  isJumpingRef: React.MutableRefObject<boolean>;
}

interface UseScrollHandlersReturn {
  jumpToMessage: (messageId: string) => void;
  scrollToBottom: (smooth?: boolean) => void;
  handleLoadMore: () => Promise<void>;
  handleLoadMoreAtBottom: () => Promise<void>;
  isLoadingMore: boolean;
  isLoadingMoreBottom: boolean;
}
```

---

### Phase 4: Extract Effects Hook
**File**: `src/hooks/useVirtuosoEffects.ts`

**Size**: ~100 lines

**Purpose**: Handle all side effects (initialization, cache metrics, prepending detection)

**Exports**:
```typescript
interface UseVirtuosoEffectsProps {
  activeConversationId: string;
  deduplicatedMessages: MessageDTO[];
  heightCache: React.MutableRefObject<Map<string, number>>;
  cacheHits: React.MutableRefObject<number>;
  cacheMisses: React.MutableRefObject<number>;
  estimateMessageHeight: (message: MessageDTO) => number;
  setFirstItemIndex: React.Dispatch<React.SetStateAction<number>>;
  prevMessageCountRef: React.MutableRefObject<number>;
  prevFirstMessageIdRef: React.MutableRefObject<string | null>;
  isJumpingRef: React.MutableRefObject<boolean>;
  isMountedRef: React.MutableRefObject<boolean>;
  setAtBottom: (atBottom: boolean) => void;
  INITIAL_INDEX: number;
  USE_RESIZE_OBSERVER: React.MutableRefObject<boolean>;
}
```

---

### Phase 5: Move Height Estimation to Hook
**File**: Update `src/hooks/useMessageHeightCache.ts`

**Change**: Move the accurate `estimateMessageHeight` function from VirtualMessageList into the hook

**Current hook logic** (inaccurate):
- text: BASE_HEIGHT (64) + lines * LINE_HEIGHT (24)
- image/sticker: 300
- file: 100

**VirtualMessageList logic** (accurate - based on browser measurements):
- text: 74 (single line), reply: 130
- image: 216, sticker: 156, file: 106

**Action**: Replace hook's estimateMessageHeight with VirtualMessageList's version

---

## Step-by-Step Implementation Plan

### ✅ Step 1: Create MessageListContext
1. Create `src/contexts/MessageListContext.tsx`
2. Define context interface
3. Create provider component
4. Export useMessageListContext hook
5. Test context in isolation

### ✅ Step 2: Wrap VirtualMessageList with Context Provider
1. Import MessageListContext
2. Wrap return JSX with provider
3. Pass all necessary values
4. Verify no errors

### ✅ Step 3: Extract MessageItem Component
1. Create `src/components/shared/VirtualMessageList/MessageItem.tsx`
2. Copy MessageItem code from VirtualMessageList
3. Replace prop access with context access
4. Import and use in VirtualMessageList
5. Remove old MessageItem definition
6. Test message rendering

### ✅ Step 4: Create useScrollHandlers Hook
1. Create `src/hooks/useScrollHandlers.ts`
2. Extract scroll handler functions
3. Extract loading states
4. Import and use in VirtualMessageList
5. Remove old scroll handler code
6. Test scrolling and load more

### ✅ Step 5: Create useVirtuosoEffects Hook
1. Create `src/hooks/useVirtuosoEffects.ts`
2. Extract all useEffect and useLayoutEffect
3. Import and use in VirtualMessageList
4. Remove old effect code
5. Test initialization and prepending

### ✅ Step 6: Update useMessageHeightCache Hook
1. Update `src/hooks/useMessageHeightCache.ts`
2. Replace estimateMessageHeight with accurate version
3. Remove local estimateMessageHeight from VirtualMessageList
4. Test height estimation

### ✅ Step 7: Final Cleanup
1. Remove unused imports
2. Remove unused state
3. Add final comment sections
4. Verify file size reduction
5. Test all features

---

## Expected Results

### File Size Comparison
| File | Before | After | Change |
|------|--------|-------|--------|
| VirtualMessageList.tsx | 873 lines | ~350 lines | -523 lines (-60%) |
| MessageItem.tsx | - | ~240 lines | +240 lines (new) |
| MessageListContext.tsx | - | ~80 lines | +80 lines (new) |
| useScrollHandlers.ts | - | ~80 lines | +80 lines (new) |
| useVirtuosoEffects.ts | - | ~110 lines | +110 lines (new) |
| useMessageHeightCache.ts | 77 lines | ~90 lines | +13 lines |
| **Total** | **950 lines** | **950 lines** | **0 lines (redistributed)** |

### Maintainability Improvements
- ✅ VirtualMessageList: 873 → 350 lines (60% reduction!)
- ✅ Separation of concerns (rendering, scrolling, effects, caching)
- ✅ Reduced props drilling (20+ props → 1 prop for MessageItem)
- ✅ Easier testing (each hook/component can be tested independently)
- ✅ Better code organization
- ✅ Clearer responsibilities

---

## Testing Checklist

After each step, verify:
- [ ] No TypeScript errors
- [ ] Dev server compiles successfully
- [ ] Messages render correctly
- [ ] Album messages display in grid
- [ ] Album lightbox works
- [ ] Edit message updates immediately
- [ ] Reply message works
- [ ] Context menu (copy, delete, resend)
- [ ] Scroll to bottom
- [ ] Load more at top
- [ ] Load more at bottom (after jump)
- [ ] Jump to message with highlight
- [ ] Height caching works
- [ ] No console errors

---

## Risk Mitigation

### Backup Strategy
- Keep `VirtualMessageList.backup.tsx` (already exists)
- Create new backup before each major step
- Can rollback if issues occur

### Incremental Approach
- Do ONE step at a time
- Test thoroughly after each step
- Don't proceed if current step has issues

### Props Drilling Solution
- Context solves most props drilling
- For hooks, pass only necessary data
- Use refs for values that don't trigger re-renders

---

## Notes

### Why Context is Better Here
1. **Many consumers**: MessageItem, TextMessage, ImageMessage, etc. all need same props
2. **Stable values**: Most props don't change during component lifetime
3. **Cleaner API**: Components become simpler and more focused
4. **Performance**: React.memo with context is efficient (only re-renders when context changes)

### Alternative Considered
- **Compound Components**: Too complex for this use case
- **Render Props**: Would make code harder to read
- **Redux/Zustand**: Overkill for component-local state
- **Props Drilling**: Current problem - too many props!

**Conclusion**: Context is the right choice for this refactoring.
