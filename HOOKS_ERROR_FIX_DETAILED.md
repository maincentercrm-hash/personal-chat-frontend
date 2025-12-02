# React Hooks Error - Root Cause Analysis & Fix

**Date**: 2025-12-02
**Error**: "Rendered fewer hooks than expected. This may be caused by an accidental early return statement."
**Status**: ✅ **FIXED**

---

## 🚨 Root Cause Analysis

### **The Problem: Conditional Returns AFTER Calling Hooks**

MessageItem component was violating **Rules of Hooks** by having **different numbers of hooks** called in different render paths.

### **Original Broken Code Flow**

```typescript
export const MessageItem = memo(({ message }) => {
  // ✅ Safety check FIRST
  if (!message || !message.id) return null;

  // ✅ Hook 1-4: Always called
  const context = useMessageListContext();        // Hook 1
  const selection = useMessageSelection();        // Hook 2
  const isSelected = isMessageSelected(msg.id);   // Hook 3
  const longPress = useLongPress({...});          // Hook 4

  // ❌ EARLY RETURN #1: Album with album_files
  if (message.message_type === 'album' && message.album_files) {
    return <AlbumMessageV2 />;  // ❌ Skips hooks 5, 6, 7!
  }

  // ❌ EARLY RETURN #2: Old album format
  if (albumId !== undefined) {
    return renderAlbum(...);  // ❌ Skips hooks 5, 6, 7!
  }

  // ⚠️ Hook 5-7: Only called for REGULAR messages
  const messageRef = useRef(null);                 // Hook 5
  useLayoutEffect(() => {...}, [...]);             // Hook 6
  const messageContent = useMemo(() => {...}, []); // Hook 7

  return <div>{messageContent}</div>;
});
```

### **The Failure Scenario**

```
Render 1 (Text Message):
  ✅ Hook 1: useMessageListContext()
  ✅ Hook 2: useMessageSelection()
  ✅ Hook 3: isMessageSelected()
  ✅ Hook 4: useLongPress()
  ✅ Hook 5: useRef()
  ✅ Hook 6: useLayoutEffect()
  ✅ Hook 7: useMemo()
  → Total: 7 hooks

Render 2 (Album Message):
  ✅ Hook 1: useMessageListContext()
  ✅ Hook 2: useMessageSelection()
  ✅ Hook 3: isMessageSelected()
  ✅ Hook 4: useLongPress()
  ❌ EARLY RETURN HERE! (line 93-173)
  💥 Missing hooks 5, 6, 7
  → Total: 4 hooks

Result: ERROR! "Rendered fewer hooks than expected"
```

---

## ✅ The Fix: Call ALL Hooks Before ANY Conditional Logic

### **Key Principle: Rules of Hooks**

> **Hooks must be called in the SAME ORDER on EVERY render**
> - ✅ Call hooks at the top level
> - ✅ Call hooks in the same order
> - ❌ Don't call hooks inside conditions
> - ❌ Don't call hooks inside loops
> - ❌ Don't return early before calling all hooks

### **Fixed Code Structure**

```typescript
export const MessageItem = memo(({ message }) => {
  // ✅ STEP 1: Safety check FIRST (before any hooks)
  if (!message || !message.id) {
    console.error('[MessageItem] Received undefined message');
    return null;
  }

  // ✅ STEP 2: Call ALL hooks (must be same for every render)
  const context = useMessageListContext();        // Hook 1
  const selection = useMessageSelection();        // Hook 2
  const isSelected = isMessageSelected(msg.id);   // Hook 3
  const longPress = useLongPress({...});          // Hook 4
  const messageRef = useRef(null);                // Hook 5 ← Moved UP!
  useLayoutEffect(() => {...}, [...]);            // Hook 6 ← Moved UP!

  // ✅ STEP 3: Calculate values needed for rendering
  const isUser = isOwnMessage(message);
  const formattedStatus = formatMessageStatus(...);
  const formattedSender = getFormattedSender(...);
  const isNewAlbum = message.message_type === 'album' && message.album_files;
  const isOldAlbum = albumId !== undefined && albumPosition !== undefined;

  // ✅ STEP 4: useMemo for ALL message types (no early returns!)
  const messageContent = useMemo(() => {           // Hook 7 ← Moved UP!
    // Handle NEW album format
    if (isNewAlbum) {
      return <AlbumMessageV2 {...} />;
    }

    // Handle OLD album format
    if (isOldAlbum) {
      return renderAlbum(...);
    }

    // Handle regular messages
    if (message.message_type === 'text') {
      return <TextMessage {...} />;
    }
    // ... other types

    return null;
  }, [/* all dependencies */]);

  // ✅ STEP 5: Single return statement (NO early returns!)
  return (
    <div ref={messageRef} {...longPressHandlers}>
      {isSelectionMode && <Checkbox />}
      {messageContent}
    </div>
  );
});
```

---

## 📊 Before vs After Comparison

| Aspect | ❌ Before (Broken) | ✅ After (Fixed) |
|--------|-------------------|------------------|
| **Hook count** | Variable (4 or 7 hooks) | Fixed (7 hooks always) |
| **Early returns** | Yes (after 4 hooks) | No (all hooks called first) |
| **Album rendering** | Early return | Inside useMemo |
| **Rules of Hooks** | ❌ Violated | ✅ Compliant |
| **Scroll loading** | ❌ Broken | ✅ Works |
| **Error** | ❌ "Fewer hooks" | ✅ None |

---

## 🔍 Detailed Changes

### **1. Moved `useRef` BEFORE Conditional Logic**

**Before:**
```typescript
// Line 93: Early return for album
if (message.message_type === 'album') {
  return <Album />;
}

// Line 206: useRef called AFTER early return
const messageRef = useRef(null);  // ❌ Not reached for albums!
```

**After:**
```typescript
// Line 94: useRef called for ALL message types
const messageRef = useRef<HTMLDivElement>(null);  // ✅ Always called!

// Line 165: Check album (no early return)
const isNewAlbum = message.message_type === 'album' && ...;
```

**File**: `src/components/shared/VirtualMessageList/MessageItem.tsx:94`

---

### **2. Moved `useLayoutEffect` BEFORE Conditional Logic**

**Before:**
```typescript
// Line 93-173: Early returns for albums

// Line 209: useLayoutEffect called AFTER early returns
useLayoutEffect(() => {
  // Height measurement logic
}, [...]);  // ❌ Not called for albums!
```

**After:**
```typescript
// Line 97-162: useLayoutEffect called for ALL message types
useLayoutEffect(() => {
  const element = messageRef.current;
  if (!element || !message.id) return;  // Guard clause, not early return

  // Measure height for ALL message types
  const measureHeight = () => {...};
  measureHeight();

  // ResizeObserver for dynamic content
  const observer = new ResizeObserver(...);
  observer.observe(element);

  return () => observer.disconnect();
}, [message.id, message.message_type, ...]); // ✅ Always called!
```

**File**: `src/components/shared/VirtualMessageList/MessageItem.tsx:97-162`

---

### **3. Moved Album Logic INSIDE `useMemo`**

**Before:**
```typescript
// Line 93-173: Early return OUTSIDE useMemo
if (message.message_type === 'album' && message.album_files) {
  return <AlbumMessageV2 />;  // ❌ Skips useMemo!
}

// Line 286: useMemo only for regular messages
const messageContent = useMemo(() => {
  // Only text, image, file...
}, [...]); // ❌ Not called for albums!
```

**After:**
```typescript
// Line 164-175: Calculate flags (no early return)
const isUser = isOwnMessage(message);
const formattedStatus = formatMessageStatus(...);
const isNewAlbum = message.message_type === 'album' && message.album_files;
const isOldAlbum = albumId !== undefined && albumPosition !== undefined;

// Line 179-345: useMemo handles ALL message types
const messageContent = useMemo(() => {
  // ✅ Album rendering INSIDE useMemo
  if (isNewAlbum) {
    if (message.album_files!.length === 1 && message.album_files![0].file_type === 'file') {
      return <FileMessage {...} />;
    }
    return <AlbumMessageV2 {...} />;
  }

  // ✅ Old album format
  if (isOldAlbum) {
    if (albumPosition === 0) {
      return renderAlbum(albumId, groupedAlbums[albumId]);
    }
    return <div style={{ height: 0 }} />;  // Placeholder
  }

  // ✅ Regular messages
  if (message.message_type === 'text') {
    return <TextMessage {...} />;
  }
  // ... other types

  return null;
}, [
  message,
  isUser,
  formattedStatus,
  isNewAlbum,
  isOldAlbum,
  albumId,
  albumPosition,
  groupedAlbums,
  renderAlbum,
  // ... other deps
]); // ✅ Always called!
```

**File**: `src/components/shared/VirtualMessageList/MessageItem.tsx:179-345`

---

### **4. Single Return Statement (No Early Returns)**

**Before:**
```typescript
// Multiple returns scattered throughout component
if (album) return <Album />;
if (oldAlbum && pos === 0) return renderAlbum();
if (oldAlbum && pos !== 0) return <div />;
return <div>{messageContent}</div>;  // 4 different return statements!
```

**After:**
```typescript
// Single return statement at the end
return (
  <div
    ref={messageRef}
    data-message-id={message.id}
    className={`flex ${isUser ? 'justify-end' : 'justify-start'} ...`}
    {...longPressHandlers}
  >
    {isSelectionMode && (
      <div className="flex items-center mr-3">
        <Checkbox checked={isSelected} ... />
      </div>
    )}

    {!isSelectionMode ? (
      <MessageContextMenu {...}>
        <div className="max-w-[70%]">
          {messageContent}  {/* All rendering logic in messageContent */}
        </div>
      </MessageContextMenu>
    ) : (
      <div className="max-w-[70%]">
        {messageContent}
      </div>
    )}
  </div>
);  // ✅ Only ONE return statement!
```

**File**: `src/components/shared/VirtualMessageList/MessageItem.tsx:347-378`

---

## 🧪 Verification

### **Hook Call Order (All Message Types)**

```
✅ Text Message:
  Hook 1: useMessageListContext()
  Hook 2: useMessageSelection()
  Hook 3: isMessageSelected()
  Hook 4: useLongPress()
  Hook 5: useRef()
  Hook 6: useLayoutEffect()
  Hook 7: useMemo()
  → Total: 7 hooks ✅

✅ Album Message (New Format):
  Hook 1: useMessageListContext()
  Hook 2: useMessageSelection()
  Hook 3: isMessageSelected()
  Hook 4: useLongPress()
  Hook 5: useRef()
  Hook 6: useLayoutEffect()
  Hook 7: useMemo()
  → Total: 7 hooks ✅

✅ Album Message (Old Format):
  Hook 1: useMessageListContext()
  Hook 2: useMessageSelection()
  Hook 3: isMessageSelected()
  Hook 4: useLongPress()
  Hook 5: useRef()
  Hook 6: useLayoutEffect()
  Hook 7: useMemo()
  → Total: 7 hooks ✅

Result: ✅ All message types call exactly 7 hooks!
```

---

## 📝 Key Takeaways

### **Rules of Hooks (Review)**

1. ✅ **Call hooks at the top level** - Not inside conditions or loops
2. ✅ **Call hooks in the same order** - Every render must call the same hooks
3. ✅ **Safety checks BEFORE hooks** - `if (!data) return null` goes first
4. ✅ **Conditional rendering AFTER hooks** - Use flags and conditional JSX

### **Common Mistakes to Avoid**

❌ **DON'T:**
```typescript
if (condition) {
  const value = useSomething();  // ❌ Conditional hook
  return <Component />;
}
```

✅ **DO:**
```typescript
const value = useSomething();  // ✅ Always called

if (condition) {
  return <Component value={value} />;  // ✅ Conditional return after hooks
}
```

---

## 🚀 Testing Results

### **Before Fix**
- ❌ Scroll to top: No API call, no messages loaded
- ❌ Scroll to bottom: React error "Rendered fewer hooks than expected"
- ❌ Console: Multiple hook warnings
- ❌ Forward dialog: Submit not working (separate issue)

### **After Fix**
- ✅ Scroll to top: API called, messages loaded correctly
- ✅ Scroll to bottom: No errors, smooth scrolling
- ✅ Console: No hook errors
- ✅ All message types render correctly
- ✅ Height caching works for all types
- ✅ Selection mode works
- ✅ Album rendering works (both formats)

---

## 📚 References

- [React Docs: Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [React Docs: Conditional Rendering](https://react.dev/learn/conditional-rendering)
- [ESLint Plugin: react-hooks/rules-of-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)

---

**Implementation Complete**: 2025-12-02
**Status**: ✅ All hooks errors resolved
**Scroll Loading**: ✅ Working correctly
**Forward Dialog**: ✅ Fixed (separate issue)
**Ready for Production**: ✅ Yes
