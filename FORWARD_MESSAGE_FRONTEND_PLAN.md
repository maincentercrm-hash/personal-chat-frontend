# Forward Messages - Frontend Implementation Plan

**Date:** 2025-12-01
**Status:** 🎯 Ready to Implement
**Backend Status:** ✅ COMPLETE (`POST /messages/forward`)
**Priority:** 🔴 HIGH

---

## 📋 Overview

Forward Messages ให้ผู้ใช้สามารถส่งต่อข้อความไปยัง conversation อื่นได้ (คล้าย WhatsApp/Telegram) โดย backend มี API สำเร็จแล้ว ต้องทำแค่ frontend

### Backend API (Already Complete):
```http
POST /api/v1/messages/forward
Content-Type: application/json

Request Body:
{
  "message_ids": ["uuid1", "uuid2"],
  "target_conversation_ids": ["uuid3", "uuid4"]
}

Response:
{
  "success": true,
  "data": {
    "forwarded_messages": [
      {
        "original_message_id": "uuid1",
        "target_conversation_id": "uuid3",
        "new_message_id": "uuid5"
      }
    ]
  }
}
```

---

## 🎯 User Stories

### Story 1: Forward Single Message
```
As a user
I want to forward a message to another conversation
So that I can share information quickly
```

**Acceptance Criteria:**
- [ ] Context menu has "Forward" option
- [ ] Dialog shows list of conversations to forward to
- [ ] Can select one or multiple conversations
- [ ] Shows success message after forwarding

### Story 2: Forward Multiple Messages
```
As a user
I want to select and forward multiple messages at once
So that I can share related information together
```

**Acceptance Criteria:**
- [ ] Can enter "selection mode" from message long-press
- [ ] Can select multiple messages (checkbox UI)
- [ ] "Forward" button appears in selection toolbar
- [ ] All selected messages are forwarded together

### Story 3: Search Conversations
```
As a user
I want to search for conversations in the forward dialog
So that I can quickly find where to forward
```

**Acceptance Criteria:**
- [ ] Forward dialog has search input
- [ ] Search filters conversation list
- [ ] Shows recent conversations first
- [ ] Can search by name, username, group title

---

## 🎨 UI/UX Design

### Forward Dialog Layout

```
┌─────────────────────────────────────┐
│  Forward Message                 [X]│
├─────────────────────────────────────┤
│  🔍 Search conversations...        │
├─────────────────────────────────────┤
│  ☑ Alice Johnson                   │
│  ☑ Project Team (5 members)       │
│  ☐ Bob Smith                       │
│  ☐ Family Group (12 members)      │
│  ☐ Work Chat                       │
│                                     │
│  ... (scroll for more)             │
├─────────────────────────────────────┤
│           [Cancel]  [Forward (2)]  │
└─────────────────────────────────────┘
```

### Selection Mode (Multiple Messages)

```
┌─────────────────────────────────────┐
│  [X] 3 selected     [Forward] [Cancel]│
├─────────────────────────────────────┤
│  ☑ Hello, how are you?         10:30│
│  ☐ I'm good, thanks!            10:32│
│  ☑ Want to grab lunch?          10:35│
│  ☑ [Image: lunch.jpg]           10:36│
│  ☐ Sure, where?                 10:38│
└─────────────────────────────────────┘
```

---

## 🏗️ Frontend Implementation Plan

### Phase 1: Core Forward Functionality (3-4 hours)

#### Task 1.1: Create Forward Service
**File:** `src/services/forwardService.ts` (NEW)

```typescript
import api from './api';

export interface ForwardMessageRequest {
  message_ids: string[];
  target_conversation_ids: string[];
}

export interface ForwardedMessage {
  original_message_id: string;
  target_conversation_id: string;
  new_message_id: string;
}

export interface ForwardMessageResponse {
  forwarded_messages: ForwardedMessage[];
}

class ForwardService {
  /**
   * Forward messages to one or more conversations
   */
  async forwardMessages(
    messageIds: string[],
    targetConversationIds: string[]
  ): Promise<ForwardMessageResponse> {
    try {
      const response = await api.post<{ data: ForwardMessageResponse }>(
        '/messages/forward',
        {
          message_ids: messageIds,
          target_conversation_ids: targetConversationIds
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Failed to forward messages:', error);
      throw error;
    }
  }

  /**
   * Validate that messages can be forwarded
   * (e.g., check permissions, deleted messages, etc.)
   */
  canForwardMessage(messageId: string): boolean {
    // Add validation logic if needed
    return true;
  }
}

export const forwardService = new ForwardService();
```

---

#### Task 1.2: Create Forward Dialog Component
**File:** `src/components/shared/ForwardMessageDialog.tsx` (NEW)

```typescript
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { forwardService } from '@/services/forwardService';
import { useConversationStore } from '@/stores/conversationStore';
import { toast } from 'sonner';
import type { ConversationDTO } from '@/types/conversation.types';

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageIds: string[]; // Messages to forward
  onSuccess?: () => void;
}

export default function ForwardMessageDialog({
  open,
  onOpenChange,
  messageIds,
  onSuccess
}: ForwardMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { conversations } = useConversationStore();

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;

    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      const title = conv.title?.toLowerCase() || '';
      const username = conv.other_user?.username?.toLowerCase() || '';
      const displayName = conv.other_user?.display_name?.toLowerCase() || '';

      return (
        title.includes(query) ||
        username.includes(query) ||
        displayName.includes(query)
      );
    });
  }, [conversations, searchQuery]);

  const handleToggleConversation = (conversationId: string) => {
    setSelectedConversations((prev) =>
      prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  const handleForward = async () => {
    if (selectedConversations.length === 0) {
      toast.error('Please select at least one conversation');
      return;
    }

    try {
      setLoading(true);

      await forwardService.forwardMessages(
        messageIds,
        selectedConversations
      );

      toast.success(
        `Forwarded to ${selectedConversations.length} conversation(s)`
      );

      onSuccess?.();
      onOpenChange(false);

      // Reset state
      setSelectedConversations([]);
      setSearchQuery('');
    } catch (error) {
      toast.error('Failed to forward messages');
      console.error('Forward error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedConversations([]);
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Forward {messageIds.length} message{messageIds.length > 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="py-4">
          <Input
            placeholder="🔍 Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Conversation List */}
        <ScrollArea className="h-[300px] border rounded-md p-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No conversations found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex items-center gap-3 p-2 hover:bg-accent rounded-md cursor-pointer"
                  onClick={() => handleToggleConversation(conversation.id)}
                >
                  <Checkbox
                    checked={selectedConversations.includes(conversation.id)}
                    onCheckedChange={() => handleToggleConversation(conversation.id)}
                  />

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {conversation.type === 'group' ? '👥' : '👤'}
                  </div>

                  {/* Conversation Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {conversation.title || conversation.other_user?.display_name}
                    </div>
                    {conversation.type === 'group' && (
                      <div className="text-xs text-muted-foreground">
                        {conversation.members?.length || 0} members
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            disabled={selectedConversations.length === 0 || loading}
          >
            {loading
              ? 'Forwarding...'
              : `Forward${selectedConversations.length > 0 ? ` (${selectedConversations.length})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

#### Task 1.3: Add Forward to Message Context Menu
**File:** `src/components/shared/MessageContextMenu.tsx`

Add forward option:

```typescript
import { useState } from 'react';
import ForwardMessageDialog from './ForwardMessageDialog';

export default function MessageContextMenu({ message, ... }) {
  const [showForwardDialog, setShowForwardDialog] = useState(false);

  const menuItems = [
    {
      icon: Reply,
      label: 'Reply',
      onClick: () => onReply(message.id),
    },
    {
      icon: Forward, // Add Forward icon
      label: 'Forward',
      onClick: () => setShowForwardDialog(true),
    },
    // ... other items
  ];

  return (
    <>
      {/* Existing context menu */}
      <ContextMenu>
        {/* ... menu items ... */}
      </ContextMenu>

      {/* Forward Dialog */}
      <ForwardMessageDialog
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
        messageIds={[message.id]}
        onSuccess={() => {
          console.log('Message forwarded successfully');
        }}
      />
    </>
  );
}
```

---

### Phase 2: Multiple Message Selection (2-3 hours)

#### Task 2.1: Create Selection Mode Hook
**File:** `src/hooks/useMessageSelection.ts` (NEW)

```typescript
import { useState, useCallback } from 'react';

export const useMessageSelection = () => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => !prev);
    if (selectionMode) {
      // Exiting selection mode - clear selections
      setSelectedMessageIds([]);
    }
  }, [selectionMode]);

  const toggleMessageSelection = useCallback((messageId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  }, []);

  const selectAll = useCallback((messageIds: string[]) => {
    setSelectedMessageIds(messageIds);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMessageIds([]);
    setSelectionMode(false);
  }, []);

  return {
    selectionMode,
    selectedMessageIds,
    toggleSelectionMode,
    toggleMessageSelection,
    selectAll,
    clearSelection,
  };
};
```

---

#### Task 2.2: Create Selection Toolbar Component
**File:** `src/components/shared/SelectionToolbar.tsx` (NEW)

```typescript
import { Button } from '@/components/ui/button';
import { X, Forward, Trash2, CheckSquare } from 'lucide-react';

interface SelectionToolbarProps {
  selectedCount: number;
  onForward: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onCancel: () => void;
}

export default function SelectionToolbar({
  selectedCount,
  onForward,
  onDelete,
  onSelectAll,
  onCancel
}: SelectionToolbarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Cancel & Count */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-5 w-5" />
          </Button>
          <span className="text-lg font-medium">
            {selectedCount} selected
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {onSelectAll && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSelectAll}
              className="text-primary-foreground hover:bg-primary-foreground/20"
              title="Select All"
            >
              <CheckSquare className="h-5 w-5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onForward}
            disabled={selectedCount === 0}
            className="text-primary-foreground hover:bg-primary-foreground/20"
            title="Forward"
          >
            <Forward className="h-5 w-5" />
          </Button>

          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              disabled={selectedCount === 0}
              className="text-primary-foreground hover:bg-primary-foreground/20"
              title="Delete"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

#### Task 2.3: Integrate Selection Mode into Message List
**File:** `src/components/shared/VirtualMessageList.tsx`

Add selection mode support:

```typescript
import { useMessageSelection } from '@/hooks/useMessageSelection';
import SelectionToolbar from './SelectionToolbar';
import ForwardMessageDialog from './ForwardMessageDialog';

export default function VirtualMessageList({ ... }) {
  const {
    selectionMode,
    selectedMessageIds,
    toggleSelectionMode,
    toggleMessageSelection,
    selectAll,
    clearSelection
  } = useMessageSelection();

  const [showForwardDialog, setShowForwardDialog] = useState(false);

  const handleLongPress = (messageId: string) => {
    // Enter selection mode on long press
    if (!selectionMode) {
      toggleSelectionMode();
    }
    toggleMessageSelection(messageId);
  };

  const handleForwardSelected = () => {
    setShowForwardDialog(true);
  };

  return (
    <>
      {/* Selection Toolbar (shown when selection mode is active) */}
      {selectionMode && (
        <SelectionToolbar
          selectedCount={selectedMessageIds.length}
          onForward={handleForwardSelected}
          onSelectAll={() => selectAll(messages.map(m => m.id))}
          onCancel={clearSelection}
        />
      )}

      {/* Message List */}
      <Virtuoso
        data={messages}
        itemContent={(index, message) => (
          <MessageItem
            message={message}
            selectionMode={selectionMode}
            isSelected={selectedMessageIds.includes(message.id)}
            onToggleSelect={() => toggleMessageSelection(message.id)}
            onLongPress={() => handleLongPress(message.id)}
            // ... other props
          />
        )}
      />

      {/* Forward Dialog */}
      <ForwardMessageDialog
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
        messageIds={selectedMessageIds}
        onSuccess={() => {
          clearSelection();
          toast.success('Messages forwarded');
        }}
      />
    </>
  );
}
```

---

#### Task 2.4: Update Message Item for Selection Mode
**File:** `src/components/shared/VirtualMessageList/MessageItem.tsx`

Add checkbox UI:

```typescript
import { Checkbox } from '@/components/ui/checkbox';

interface MessageItemProps {
  message: MessageDTO;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
  // ... other props
}

export function MessageItem({
  message,
  selectionMode,
  isSelected,
  onToggleSelect,
  onLongPress,
  ...
}: MessageItemProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 px-4 py-2',
        selectionMode && 'cursor-pointer hover:bg-accent',
        isSelected && 'bg-accent'
      )}
      onClick={selectionMode ? onToggleSelect : undefined}
      onContextMenu={onLongPress}
    >
      {/* Checkbox (shown in selection mode) */}
      {selectionMode && (
        <div className="flex items-center pt-2">
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
        </div>
      )}

      {/* Message Content */}
      <div className="flex-1">
        {/* ... existing message rendering ... */}
      </div>
    </div>
  );
}
```

---

### Phase 3: Enhanced Features (1-2 hours)

#### Task 3.1: Forward with Caption
Allow adding caption when forwarding:

```typescript
// In ForwardMessageDialog
const [caption, setCaption] = useState('');

<Textarea
  placeholder="Add a caption (optional)..."
  value={caption}
  onChange={(e) => setCaption(e.target.value)}
/>
```

#### Task 3.2: Recent Conversations Priority
Show recently chatted conversations at top:

```typescript
const sortedConversations = useMemo(() => {
  return [...conversations].sort((a, b) => {
    const aTime = new Date(a.last_message?.created_at || 0).getTime();
    const bTime = new Date(b.last_message?.created_at || 0).getTime();
    return bTime - aTime; // Most recent first
  });
}, [conversations]);
```

#### Task 3.3: Forward History/Badge
Show "Forwarded" badge on forwarded messages:

```typescript
// Check if message has forward metadata
const isForwarded = message.metadata?.forwarded_from !== undefined;

{isForwarded && (
  <Badge variant="outline" className="text-xs">
    Forwarded
  </Badge>
)}
```

---

## 🧪 Testing Plan

### Unit Tests

**File:** `src/services/forwardService.test.ts`
```typescript
describe('ForwardService', () => {
  it('should forward single message', async () => {
    const result = await forwardService.forwardMessages(
      ['msg-1'],
      ['conv-1']
    );
    expect(result.forwarded_messages).toHaveLength(1);
  });

  it('should forward multiple messages to multiple conversations', async () => {
    const result = await forwardService.forwardMessages(
      ['msg-1', 'msg-2'],
      ['conv-1', 'conv-2']
    );
    expect(result.forwarded_messages).toHaveLength(4); // 2 messages × 2 convs
  });
});
```

**File:** `src/hooks/useMessageSelection.test.ts`
```typescript
describe('useMessageSelection', () => {
  it('should toggle selection mode', () => {
    const { result } = renderHook(() => useMessageSelection());

    act(() => result.current.toggleSelectionMode());
    expect(result.current.selectionMode).toBe(true);

    act(() => result.current.toggleSelectionMode());
    expect(result.current.selectionMode).toBe(false);
  });

  it('should select and deselect messages', () => {
    const { result } = renderHook(() => useMessageSelection());

    act(() => result.current.toggleMessageSelection('msg-1'));
    expect(result.current.selectedMessageIds).toEqual(['msg-1']);

    act(() => result.current.toggleMessageSelection('msg-1'));
    expect(result.current.selectedMessageIds).toEqual([]);
  });
});
```

### Integration Tests

```typescript
describe('Forward Messages Integration', () => {
  it('should open forward dialog from context menu', () => {
    render(<MessageContextMenu message={mockMessage} />);

    // Open context menu
    // Click "Forward"
    // Verify dialog is open
  });

  it('should forward message successfully', async () => {
    render(<ForwardMessageDialog messageIds={['msg-1']} open={true} />);

    // Select conversation
    // Click Forward button
    // Verify API call made
    // Verify success toast
  });

  it('should enter selection mode on long press', () => {
    render(<VirtualMessageList messages={mockMessages} />);

    // Long press on message
    // Verify selection mode activated
    // Verify checkbox appears
  });
});
```

### E2E Tests

```typescript
describe('Forward Messages E2E', () => {
  it('should forward single message', async () => {
    // Open conversation
    // Right-click message
    // Click "Forward"
    // Select target conversation
    // Click "Forward (1)"
    // Verify success toast
    // Verify message appears in target conversation
  });

  it('should forward multiple messages', async () => {
    // Long-press message to enter selection mode
    // Select 3 messages
    // Click Forward button in toolbar
    // Select 2 target conversations
    // Click "Forward (2)"
    // Verify success toast
    // Verify messages appear in both conversations
  });
});
```

---

## 📊 Implementation Timeline

| Phase | Tasks | Time | Priority |
|-------|-------|------|----------|
| **Phase 1** | Core forward functionality | 3-4 hours | 🔴 HIGH |
| **Phase 2** | Multiple message selection | 2-3 hours | 🔴 HIGH |
| **Phase 3** | Enhanced features | 1-2 hours | 🟡 MEDIUM |
| **Testing** | Unit + Integration + E2E | 2 hours | 🔴 HIGH |
| **Total** | All phases | 8-11 hours | - |

---

## 🚀 Rollout Strategy

### Step 1: Core Forward (Week 1)
1. Implement forward service
2. Create forward dialog
3. Add to context menu
4. Test basic forwarding

### Step 2: Selection Mode (Week 1)
1. Implement selection hook
2. Create selection toolbar
3. Add checkbox UI to messages
4. Test multiple message forwarding

### Step 3: Polish & Testing (Week 2)
1. Add enhanced features (caption, sorting)
2. Write comprehensive tests
3. User acceptance testing
4. Bug fixes

---

## 🎨 UI/UX Considerations

### Forward Dialog:
- **Fast Search:** Real-time filtering as user types
- **Recent First:** Show recently chatted conversations at top
- **Visual Feedback:** Checkboxes for selected conversations
- **Count Badge:** Show "Forward (2)" when 2 conversations selected

### Selection Mode:
- **Entry:** Long-press any message OR select from menu
- **Exit:** Tap X button OR tap outside OR press Back
- **Visual:** Checkboxes appear, selected messages highlighted
- **Toolbar:** Fixed at top with actions (Forward, Delete, Cancel)

### Keyboard Shortcuts:
- `Ctrl+Shift+F` - Forward selected message
- `Escape` - Exit selection mode
- `Ctrl+A` - Select all messages

---

## 📝 Notes

### Important Considerations:

1. **Backend Complete:**
   - API endpoint exists: `POST /messages/forward`
   - Can forward multiple messages to multiple conversations
   - Returns list of new message IDs

2. **Message Types:**
   - All message types can be forwarded (text, image, file, sticker)
   - Forwarded messages keep original content
   - Metadata may include "forwarded_from" info

3. **Permissions:**
   - User must be member of target conversation
   - Backend validates permissions automatically
   - Show error if forward fails

4. **Performance:**
   - Forward dialog loads conversations lazily
   - Search is client-side (fast enough for most users)
   - Bulk forward may take time (show loading state)

---

## ✅ Definition of Done

- [ ] Can forward single message via context menu
- [ ] Can forward to multiple conversations at once
- [ ] Can select multiple messages (long-press)
- [ ] Selection toolbar works correctly
- [ ] Forward dialog has search functionality
- [ ] Shows success/error toast notifications
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Documentation updated

---

**Created:** 2025-12-01
**Backend API:** ✅ Available (`POST /messages/forward`)
**Ready to implement:** YES 🚀
