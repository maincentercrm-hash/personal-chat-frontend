# Notes App - Frontend Implementation Plan

**Date:** 2025-12-01
**Status:** 🎯 Planning Phase
**Backend Status:** ❌ Not Implemented Yet (needs backend first)
**Priority:** 🟡 MEDIUM

---

## 📋 Overview

Notes App คือฟีเจอร์ที่ให้ผู้ใช้สามารถบันทึกข้อความส่วนตัว (คล้าย "Saved Messages" ใน Telegram) โดยสามารถส่งข้อความถึงตัวเองเพื่อเก็บ notes, links, files, images ต่างๆ

### Key Features:
- ✅ Personal conversation with yourself
- ✅ Support all message types (text, image, file, sticker)
- ✅ Pin important notes
- ✅ Search within notes
- ✅ Bookmark/favorite specific notes

---

## 🎯 User Stories

### Story 1: Access Notes
```
As a user
I want to access my personal Notes
So that I can save important information
```

**Acceptance Criteria:**
- [ ] "Notes" menu item appears in sidebar
- [ ] Clicking "Notes" opens dedicated notes conversation
- [ ] Notes has special icon/badge to differentiate from normal chats

### Story 2: Save Messages to Notes
```
As a user
I want to forward messages to my Notes
So that I can save important information from conversations
```

**Acceptance Criteria:**
- [ ] Context menu on any message has "Save to Notes" option
- [ ] Messages are successfully saved to Notes conversation
- [ ] Original message metadata is preserved

### Story 3: Create Personal Notes
```
As a user
I want to type notes directly in the Notes conversation
So that I can quickly save thoughts
```

**Acceptance Criteria:**
- [ ] Can type and send messages in Notes
- [ ] Support all message types (text, image, file)
- [ ] Messages appear chronologically

### Story 4: Search Notes
```
As a user
I want to search within my Notes
So that I can find saved information quickly
```

**Acceptance Criteria:**
- [ ] Search bar in Notes conversation
- [ ] Full-text search works
- [ ] Results highlight matched text

---

## 🗂️ Notes App Concept

### What is "Notes"?
Notes is essentially a **special conversation with yourself**:
- Backend treats it as a regular conversation
- Frontend displays it differently (special UI/icon)
- User cannot leave or delete this conversation
- Always pinned at top of conversation list

### Technical Approach:
```
Notes = Standard Conversation + Special Metadata
```

---

## 🏗️ Architecture

### Backend Requirements (needs implementation first):

#### 1. Database Schema
```sql
-- Add is_notes_conversation flag to conversations table
ALTER TABLE conversations
ADD COLUMN is_notes_conversation BOOLEAN DEFAULT FALSE;

-- Create unique index to ensure only one notes conversation per user
CREATE UNIQUE INDEX idx_user_notes_conversation
ON conversation_members(user_id)
WHERE conversation_id IN (
  SELECT id FROM conversations WHERE is_notes_conversation = TRUE
);
```

#### 2. Backend API Endpoints Needed:
```http
# Get or create Notes conversation
GET /api/v1/users/me/notes
Response: { conversation_id, ... }

# All other operations use existing message/conversation APIs
POST /api/v1/messages (send to notes conversation_id)
GET /api/v1/conversations/:id/messages (get notes)
POST /api/v1/messages/forward (forward to notes)
GET /api/v1/messages/search?conversation_id=<notes_id>
```

---

## 📐 Frontend Implementation Plan

### Phase 1: Basic Notes Integration (2-3 hours)

#### Task 1.1: Create Notes Service
**File:** `src/services/notesService.ts` (NEW)

```typescript
import api from './api';
import type { ConversationDTO } from '@/types/conversation.types';

class NotesService {
  /**
   * Get or create user's Notes conversation
   * Returns the special Notes conversation
   */
  async getOrCreateNotes(): Promise<ConversationDTO> {
    try {
      const response = await api.get('/users/me/notes');
      return response.data.data;
    } catch (error) {
      console.error('Failed to get/create notes:', error);
      throw error;
    }
  }

  /**
   * Save message to Notes (forward message)
   */
  async saveToNotes(messageId: string): Promise<void> {
    try {
      const notes = await this.getOrCreateNotes();
      await api.post('/messages/forward', {
        message_ids: [messageId],
        target_conversation_ids: [notes.id]
      });
    } catch (error) {
      console.error('Failed to save to notes:', error);
      throw error;
    }
  }

  /**
   * Check if conversation is Notes
   */
  isNotesConversation(conversationId: string, userId: string): boolean {
    // Notes conversation = conversation with only yourself
    // This will be implemented based on backend metadata
    return false; // Placeholder
  }
}

export const notesService = new NotesService();
```

---

#### Task 1.2: Update Sidebar - Add Notes Menu Item
**File:** `src/components/app-sidebar.tsx`

Add Notes item to navigation:

```typescript
const sidebarItems = [
  {
    title: "Notes",
    icon: BookmarkIcon, // or NotepadIcon
    url: "/notes",
    badge: "⭐", // Special badge
  },
  {
    title: "Conversations",
    icon: MessageSquare,
    url: "/standard/conversations",
  },
  // ... rest
];
```

---

#### Task 1.3: Create Notes Page
**File:** `src/pages/standard/notes/NotesPage.tsx` (NEW)

```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notesService } from '@/services/notesService';
import type { ConversationDTO } from '@/types/conversation.types';

export default function NotesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notesConversation, setNotesConversation] = useState<ConversationDTO | null>(null);

  useEffect(() => {
    const initNotes = async () => {
      try {
        setLoading(true);
        const notes = await notesService.getOrCreateNotes();
        setNotesConversation(notes);

        // Redirect to notes conversation
        navigate(`/standard/conversations/${notes.id}`);
      } catch (error) {
        console.error('Failed to load notes:', error);
      } finally {
        setLoading(false);
      }
    };

    initNotes();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading your notes...</p>
      </div>
    );
  }

  return null; // Redirects to conversation page
}
```

---

#### Task 1.4: Update Routes
**File:** `src/routes/index.tsx`

```typescript
// Add Notes route
{
  path: '/notes',
  element: <NotesPage />
}
```

---

### Phase 2: Message Context Menu Integration (1-2 hours)

#### Task 2.1: Add "Save to Notes" to Context Menu
**File:** `src/components/shared/MessageContextMenu.tsx`

Add new menu item:

```typescript
const menuItems = [
  {
    icon: Reply,
    label: 'Reply',
    onClick: () => onReply(message.id),
  },
  // ... existing items ...
  {
    icon: BookmarkIcon,
    label: 'Save to Notes',
    onClick: () => handleSaveToNotes(message.id),
    divider: true, // Add divider before this
  },
];

const handleSaveToNotes = async (messageId: string) => {
  try {
    await notesService.saveToNotes(messageId);
    toast.success('Saved to Notes!');
  } catch (error) {
    toast.error('Failed to save to notes');
  }
};
```

---

### Phase 3: Special Notes UI Indicators (1 hour)

#### Task 3.1: Detect Notes Conversation
**File:** `src/hooks/useNotesDetection.ts` (NEW)

```typescript
import { useMemo } from 'react';
import type { ConversationDTO } from '@/types/conversation.types';

export const useNotesDetection = (
  conversation: ConversationDTO | null,
  currentUserId: string
) => {
  const isNotes = useMemo(() => {
    if (!conversation) return false;

    // Check if conversation is with yourself only
    const members = conversation.members || [];
    return members.length === 1 && members[0].id === currentUserId;
  }, [conversation, currentUserId]);

  return { isNotes };
};
```

---

#### Task 3.2: Update Chat Header for Notes
**File:** `src/components/standard/conversation/ChatHeader.tsx`

Add special UI for Notes:

```typescript
const { isNotes } = useNotesDetection(conversation, currentUserId);

// Render special header for Notes
if (isNotes) {
  return (
    <div className="flex items-center gap-2">
      <BookmarkIcon className="text-yellow-500" />
      <h2 className="text-lg font-semibold">My Notes</h2>
      <Badge variant="secondary">Personal</Badge>
    </div>
  );
}

// ... regular header
```

---

### Phase 4: Enhanced Features (Optional - 2-3 hours)

#### Task 4.1: Pin Notes
- Add "Pin" action to messages in Notes
- Pinned notes appear at top

#### Task 4.2: Notes Categories/Tags
- Add tags to notes (work, personal, ideas, etc.)
- Filter notes by tags

#### Task 4.3: Quick Add Note
- Floating action button to quickly add note
- Opens input modal directly

---

## 🧪 Testing Plan

### Unit Tests
- [ ] `notesService.getOrCreateNotes()` returns conversation
- [ ] `notesService.saveToNotes()` forwards message
- [ ] `useNotesDetection` correctly identifies Notes conversation

### Integration Tests
- [ ] Clicking "Notes" in sidebar navigates to Notes page
- [ ] "Save to Notes" context menu item appears
- [ ] Saving message to Notes shows success toast
- [ ] Notes conversation displays special header

### E2E Tests
```typescript
describe('Notes App', () => {
  it('should access notes from sidebar', async () => {
    // Click Notes in sidebar
    // Verify redirected to notes conversation
  });

  it('should save message to notes', async () => {
    // Right-click message
    // Click "Save to Notes"
    // Verify message appears in Notes
  });

  it('should display special UI for notes', async () => {
    // Open Notes
    // Verify special icon/badge appears
    // Verify "My Notes" title
  });
});
```

---

## 📊 Implementation Timeline

| Phase | Tasks | Time | Priority |
|-------|-------|------|----------|
| **Phase 1** | Basic integration | 2-3 hours | 🔴 HIGH |
| **Phase 2** | Context menu | 1-2 hours | 🔴 HIGH |
| **Phase 3** | Special UI | 1 hour | 🟡 MEDIUM |
| **Phase 4** | Enhanced features | 2-3 hours | 🟢 LOW |
| **Total** | All phases | 6-9 hours | - |

---

## 🚀 Rollout Strategy

### Step 1: Backend Implementation
1. Add `is_notes_conversation` flag to database
2. Create `GET /users/me/notes` endpoint
3. Auto-create Notes conversation on first access
4. Test API endpoints

### Step 2: Frontend Basic Implementation
1. Create notes service
2. Add Notes menu item
3. Create Notes page (redirect to conversation)
4. Test navigation

### Step 3: Context Menu Integration
1. Add "Save to Notes" to message context menu
2. Implement forward to notes
3. Test saving messages

### Step 4: Polish & Enhanced Features
1. Add special UI indicators
2. Implement optional features (pin, tags)
3. Full testing

---

## 🎨 UI/UX Considerations

### Notes Icon
- Use bookmark icon (⭐) or notebook icon (📓)
- Yellow color to stand out
- Always visible in sidebar

### Notes Conversation
- Show "My Notes" as title
- Display "Personal" badge
- Cannot leave or delete
- Pin to top of conversation list

### Save to Notes Action
- Context menu: "Save to Notes"
- Keyboard shortcut: `Ctrl+B` (bookmark)
- Show toast notification on success
- Visual feedback (animation/highlight)

---

## 📝 Notes

### Important Considerations:

1. **Backend Dependency:**
   - Frontend depends on backend implementation
   - Backend must implement `GET /users/me/notes` first
   - Use existing message/conversation APIs for all operations

2. **Conversation Type:**
   - Notes is a regular conversation (not a new entity)
   - Simplifies implementation
   - Reuses existing message components

3. **Data Privacy:**
   - Notes are private by default (only visible to user)
   - No sharing functionality needed
   - Deleted notes cannot be recovered

4. **Performance:**
   - Notes conversation can grow large over time
   - Use cursor-based pagination (already implemented)
   - Search should be fast (use backend search API)

---

## ✅ Definition of Done

- [ ] Backend API implemented and tested
- [ ] Notes menu item in sidebar
- [ ] Can access Notes from sidebar
- [ ] Can save messages to Notes
- [ ] Notes displays special UI indicators
- [ ] Search works within Notes
- [ ] All tests passing
- [ ] Documentation updated

---

**Created:** 2025-12-01
**Next Review:** After backend implementation complete
