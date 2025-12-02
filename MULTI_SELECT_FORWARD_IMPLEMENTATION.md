# Multi-Select & Batch Forward Implementation

## 🎯 Overview

Implemented multi-select message functionality with batch forward support, allowing users to select multiple messages and forward them all at once.

---

## ✅ Features Implemented

### 1. **Selection Mode**
- Long-press any message (500ms) to enter selection mode
- Tap messages to select/deselect
- Visual feedback: selected messages highlighted with `bg-accent/30`
- Checkbox appears on left side of all messages

### 2. **Selection Toolbar**
- Appears at top when in selection mode
- Shows count: "X selected"
- **Cancel button** (X icon) - exits selection mode
- **Select All button** - selects all non-deleted messages
- **Forward button** - opens forward dialog with selected messages

### 3. **Batch Forward**
- Select multiple messages (1 or more)
- Click Forward → Opens dialog
- Dialog shows: "Forward X message(s)"
- Select target conversations
- Send to multiple conversations at once

### 4. **UX Improvements**
- Removed "Forward" from Context Menu (to avoid conflicts)
- Context menu disabled during selection mode
- Smooth transitions and hover effects
- Auto-exit selection mode after successful forward

---

## 📁 Files Created

### 1. **MessageSelectionContext.tsx**
```typescript
// src/contexts/MessageSelectionContext.tsx
// Global state management for message selection
```

**Features:**
- `isSelectionMode` - Whether in selection mode
- `selectedMessageIds` - Array of selected message IDs
- `enterSelectionMode(messageId)` - Enter selection with initial message
- `exitSelectionMode()` - Exit and clear selection
- `toggleMessageSelection(messageId)` - Toggle message selection
- `selectAllMessages(messageIds[])` - Select all messages
- `isMessageSelected(messageId)` - Check if message is selected

---

### 2. **useLongPress.ts**
```typescript
// src/hooks/useLongPress.ts
// Custom hook for detecting long press gestures
```

**Usage:**
```typescript
const longPressProps = useLongPress({
  onLongPress: () => console.log('Long pressed!'),
  onClick: () => console.log('Clicked!'),
  threshold: 500 // ms
});

return <div {...longPressProps}>Press me</div>
```

**Handles:**
- Mouse events (desktop)
- Touch events (mobile)
- Timer management
- Click vs long-press differentiation

---

### 3. **MessageSelectionToolbar.tsx**
```typescript
// src/components/shared/MessageSelectionToolbar.tsx
// Toolbar that appears when messages are selected
```

**Props:**
- `onForward` - Callback when Forward button clicked
- `onSelectAll` - Callback when Select All clicked
- `totalMessages` - Total messages count (for Select All button)

**UI:**
- Sticky at top with `z-50`
- Primary background color
- Cancel + Count on left
- Actions (Select All, Forward) on right

---

## 📝 Files Modified

### 1. **MessageArea.tsx**
**Changes:**
- Wrapped with `MessageSelectionProvider`
- Created `MessageAreaContent` internal component
- Added `MessageSelectionToolbar`
- Added `ForwardMessageDialog` with batch support
- Handlers: `handleBatchForward`, `handleSelectAll`, `handleForwardSuccess`

---

### 2. **MessageItem.tsx**
**Changes:**
- Import `useMessageSelection` and `useLongPress`
- Added selection state: `isSelected`, `isSelectionMode`
- Added long-press handlers
- Added checkbox UI (conditional on `isSelectionMode`)
- Disabled context menu during selection mode
- Added selection highlight styling

**Behavior:**
- **Long press** (500ms) → Enter selection mode
- **Click** in selection mode → Toggle selection
- **Checkbox** → Visible only in selection mode
- **Background** → Highlighted if selected

---

### 3. **MessageContextMenu.tsx**
**Changes:**
- Removed "Forward Message" option
- Added comment: "REMOVED: Use long-press selection mode instead"
- Fixed Context Menu → Forward Dialog race condition with `setTimeout(100ms)`

---

### 4. **ForwardMessageDialog.tsx**
**No changes needed!**
- Already supports multiple `messageIds[]`
- Backend API already supports batch forward
- Dialog automatically shows "Forward X message(s)"

---

## 🔄 How It Works

### User Flow

```
1. User long-presses a message (500ms)
   ↓
2. Selection mode activated
   - Toolbar appears at top
   - Checkboxes appear on messages
   - First message auto-selected
   ↓
3. User taps other messages to select
   - Each tap toggles selection
   - Count updates in toolbar
   ↓
4. User clicks "Forward" button
   ↓
5. ForwardMessageDialog opens
   - Shows: "Forward X message(s)"
   - Lists all conversations
   ↓
6. User selects target conversations
   ↓
7. User clicks "Forward" → API call
   ↓
8. Success!
   - Dialog closes
   - Selection mode exits
   - Toast: "Forwarded X messages to Y conversations"
```

---

## 🎨 Visual Design

### Selection Mode OFF (Normal)
```
[ Message bubble         ]
[ Message bubble         ]
[ Message bubble         ]
```

### Selection Mode ON (Long press activated)
```
╔════════════════════════════════════╗
║ ✕  3 selected    [Select All] [→] ║  ← Toolbar
╚════════════════════════════════════╝

☑ [ Message bubble         ]  ← Selected
☐ [ Message bubble         ]  ← Not selected
☑ [ Message bubble         ]  ← Selected
```

---

## 🔧 Technical Details

### Context Hierarchy
```
<MessageSelectionProvider>
  <MessageArea>
    <MessageAreaContent>
      <MessageSelectionToolbar />
      <VirtualMessageList>
        <MessageItem /> ← Uses useMessageSelection()
        <MessageItem />
      </VirtualMessageList>
      <ForwardMessageDialog />
    </MessageAreaContent>
  </MessageArea>
</MessageSelectionProvider>
```

### State Flow
```
MessageSelectionContext
  ├─ isSelectionMode: boolean
  ├─ selectedMessageIds: string[]
  └─ Actions:
      ├─ enterSelectionMode(id)
      ├─ exitSelectionMode()
      ├─ toggleMessageSelection(id)
      └─ selectAllMessages(ids[])
```

---

## 🧪 Testing Checklist

### Selection Mode
- [ ] Long-press message enters selection mode
- [ ] Toolbar appears at top
- [ ] Checkboxes appear on all messages
- [ ] First message auto-selected

### Selection Actions
- [ ] Click message toggles selection
- [ ] Checkbox click toggles selection
- [ ] "Select All" selects all messages
- [ ] Cancel exits selection mode

### Forward
- [ ] Forward button opens dialog
- [ ] Dialog shows correct count
- [ ] Can select multiple conversations
- [ ] Forward succeeds
- [ ] Selection mode exits after success

### Edge Cases
- [ ] Can't select deleted messages
- [ ] Deselecting last message exits selection mode
- [ ] Context menu disabled during selection
- [ ] Toolbar count updates correctly

---

## 🚀 Backend API (Already Supported!)

**Endpoint:** `POST /api/v1/messages/forward`

**Request:**
```json
{
  "message_ids": ["msg-1", "msg-2", "msg-3"],
  "target_conversation_ids": ["conv-1", "conv-2"]
}
```

**Response:**
```json
{
  "data": {
    "forwarded_messages": {
      "conv-1": [
        { "original_message_id": "msg-1", "new_message_id": "new-1" },
        { "original_message_id": "msg-2", "new_message_id": "new-2" }
      ],
      "conv-2": [...]
    },
    "total_forwarded": 6
  }
}
```

✅ **No backend changes needed!**

---

## 📊 Performance Considerations

### Optimizations
- `memo()` used on all message components
- Selection state in React Context (not prop drilling)
- Long-press with debouncing (500ms threshold)
- Efficient checkbox rendering (conditional)

### No Impact on Non-Selection Mode
- Zero overhead when not in selection mode
- Checkboxes only render when needed
- No extra API calls

---

## 🎯 Next Steps (Optional Enhancements)

### Phase 2 Features
- [ ] Delete multiple messages
- [ ] Copy multiple messages
- [ ] Keyboard shortcuts (Ctrl+A for Select All)
- [ ] Swipe gestures for selection
- [ ] Animation on checkbox slide-in

### Phase 3 Features
- [ ] Selection persistence across conversation changes
- [ ] Max selection limit (e.g., 100 messages)
- [ ] Bulk actions menu (Forward, Delete, Copy)
- [ ] Selection count badge on navbar

---

## 📝 Notes

1. **No Backend Changes Required** - API already supports batch operations
2. **Context Menu Conflict Resolved** - Removed Forward from context menu
3. **Race Condition Fixed** - Added 100ms delay when opening dialog from context menu
4. **Mobile-Friendly** - Touch events fully supported via `useLongPress`
5. **Accessible** - Checkboxes support keyboard navigation

---

## 🐛 Known Issues

None! 🎉

---

**Implementation Date:** 2025-12-02
**Status:** ✅ Complete
**Backend Support:** ✅ Ready
**Frontend Support:** ✅ Ready
**Testing:** ⏳ Pending user testing
