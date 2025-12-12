# Refactor Plan: Clean Architecture for Chat System

## ปัญหาของระบบเก่า

### 1. Mixed Concerns (ผสมกันหมด)

```
ปัญหาปัจจุบัน:
├── useMessage.ts (800+ lines)
│   ├── State management ❌
│   ├── API calls ❌
│   ├── WebSocket handling ❌
│   ├── Optimistic updates ❌
│   └── Business logic ❌
│
├── useConversationPageLogic.ts (500+ lines)
│   ├── UI state ❌
│   ├── Navigation logic ❌
│   ├── Message handlers ❌
│   ├── File upload logic ❌
│   └── Online status ❌
│
├── VirtualMessageList.tsx (1100+ lines)
│   ├── Virtuoso config ❌
│   ├── Height cache ❌
│   ├── Selection mode ❌
│   ├── MessageItem component ❌
│   ├── EditMessageForm component ❌
│   └── Scroll management ❌
│
└── conversationStore.ts (1000+ lines)
    ├── State ❌
    ├── API calls ❌
    ├── WebSocket handlers ❌
    └── Message processing ❌
```

### 2. ผลกระทบ

| ปัญหา | ผลกระทบ |
|-------|---------|
| **Debug ยาก** | ไม่รู้ว่า bug อยู่ตรงไหน |
| **Test ยาก** | ต้อง mock ทุกอย่าง |
| **Reuse ยาก** | ต้อง copy ทั้ง function |
| **Maintain ยาก** | แก้จุดนึงพัง 3 จุด |
| **Onboard ยาก** | ใหม่มาอ่านไม่รู้เรื่อง |

---

## โครงสร้างใหม่ที่เสนอ

### Clean Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                        PAGES                                 │
│  (UI composition, routing, layout)                          │
│  - ChatPage.tsx                                             │
│  - ConversationPage.tsx                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     FEATURES                                 │
│  (Feature-specific components & hooks)                      │
│  - features/chat/                                           │
│  - features/message/                                        │
│  - features/conversation/                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     SHARED                                   │
│  (Reusable UI components)                                   │
│  - components/ui/                                           │
│  - components/shared/                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      HOOKS                                   │
│  (Reusable logic hooks)                                     │
│  - hooks/useApi.ts                                          │
│  - hooks/useWebSocket.ts                                    │
│  - hooks/useOptimisticUpdate.ts                             │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     STORES                                   │
│  (State management only)                                    │
│  - stores/messageStore.ts                                   │
│  - stores/conversationStore.ts                              │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    SERVICES                                  │
│  (API calls only)                                           │
│  - services/messageService.ts                               │
│  - services/conversationService.ts                          │
│  - services/fileService.ts                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      TYPES                                   │
│  (TypeScript interfaces)                                    │
│  - types/message.types.ts                                   │
│  - types/conversation.types.ts                              │
└─────────────────────────────────────────────────────────────┘
```

---

## โครงสร้างไฟล์ใหม่

```
src/
├── pages/                          # Page components (routing)
│   ├── chat/
│   │   └── ChatPage.tsx           # Main chat page (composition only)
│   └── test/
│       └── ChatV2TestPage.tsx
│
├── features/                       # Feature modules
│   ├── message/
│   │   ├── components/
│   │   │   ├── MessageList.tsx    # Virtual list wrapper
│   │   │   ├── MessageItem.tsx    # Single message
│   │   │   ├── MessageContent.tsx # Type router
│   │   │   ├── MessageBubble.tsx  # Bubble UI
│   │   │   ├── MessageTime.tsx
│   │   │   ├── MessageStatus.tsx
│   │   │   └── messages/          # Message types
│   │   │       ├── TextMessage.tsx
│   │   │       ├── ImageMessage.tsx
│   │   │       ├── FileMessage.tsx
│   │   │       ├── StickerMessage.tsx
│   │   │       ├── AlbumMessage.tsx
│   │   │       └── VideoMessage.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useMessageList.ts      # List logic (dedup, processing)
│   │   │   ├── useMessageActions.ts   # Send, edit, delete, reply
│   │   │   ├── useMessageScroll.ts    # Scroll, jump, load more
│   │   │   └── useMessageSelection.ts # Selection mode
│   │   │
│   │   ├── context/
│   │   │   └── MessageListContext.tsx # Props distribution
│   │   │
│   │   └── index.ts                   # Public exports
│   │
│   ├── conversation/
│   │   ├── components/
│   │   │   ├── ConversationList.tsx
│   │   │   ├── ConversationItem.tsx
│   │   │   ├── ConversationHeader.tsx
│   │   │   └── ConversationDetails/
│   │   │       ├── DetailsSheet.tsx
│   │   │       ├── PhotoGallery.tsx
│   │   │       ├── VideoGallery.tsx
│   │   │       ├── FileList.tsx
│   │   │       └── LinkList.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useConversationList.ts
│   │   │   ├── useConversationDetails.ts
│   │   │   └── useOnlineStatus.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── input/
│   │   ├── components/
│   │   │   ├── MessageInput.tsx       # Main input
│   │   │   ├── ReplyPreview.tsx       # Reply indicator
│   │   │   ├── EditPreview.tsx        # Edit indicator
│   │   │   ├── EmojiPicker.tsx
│   │   │   ├── StickerPicker.tsx
│   │   │   └── MentionDropdown.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useMessageInput.ts     # Input state
│   │   │   ├── useMention.ts          # @mention logic
│   │   │   └── useTypingIndicator.ts
│   │   │
│   │   └── index.ts
│   │
│   └── upload/
│       ├── components/
│       │   ├── FilePreview.tsx
│       │   ├── MultiFilePreview.tsx
│       │   └── DragDropOverlay.tsx
│       │
│       ├── hooks/
│       │   ├── useDragDrop.ts
│       │   ├── useBulkUpload.ts
│       │   └── useFileValidation.ts
│       │
│       └── index.ts
│
├── stores/                         # State management ONLY
│   ├── messageStore.ts            # Message state
│   │   ├── state: { messages, loading, error }
│   │   ├── actions: { setMessages, addMessage, updateMessage, removeMessage }
│   │   └── selectors: { getMessageById, getMessagesByConversation }
│   │
│   ├── conversationStore.ts       # Conversation state
│   │   ├── state: { conversations, active, loading }
│   │   ├── actions: { setConversations, setActive, updateConversation }
│   │   └── selectors: { getConversationById, getActiveConversation }
│   │
│   └── uiStore.ts                 # UI state
│       ├── state: { replyingTo, editingMessage, selectedMessages }
│       └── actions: { setReplyingTo, setEditingMessage, toggleSelection }
│
├── services/                       # API calls ONLY
│   ├── api/
│   │   └── client.ts              # Axios instance
│   │
│   ├── messageService.ts
│   │   ├── getMessages(conversationId, params)
│   │   ├── sendMessage(conversationId, data)
│   │   ├── editMessage(messageId, content)
│   │   ├── deleteMessage(messageId)
│   │   ├── replyToMessage(messageId, data)
│   │   └── getMessageContext(conversationId, targetId)
│   │
│   ├── conversationService.ts
│   │   ├── getConversations()
│   │   ├── getConversation(id)
│   │   ├── createConversation(data)
│   │   └── updateConversation(id, data)
│   │
│   └── fileService.ts
│       ├── uploadFile(file)
│       ├── uploadImage(file)
│       └── uploadBulk(files)
│
├── hooks/                          # Shared utility hooks
│   ├── useApi.ts                  # Generic API hook with loading/error
│   ├── useWebSocket.ts            # WebSocket connection
│   ├── useOptimisticUpdate.ts     # Optimistic update pattern
│   ├── useInfiniteScroll.ts       # Pagination hook
│   └── useDebounce.ts
│
├── components/                     # Shared UI components
│   ├── ui/                        # Base UI (shadcn)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   │
│   └── shared/                    # App-specific shared
│       ├── Avatar.tsx
│       ├── DateSeparator.tsx
│       ├── ContextMenu.tsx
│       ├── LoadingSpinner.tsx
│       └── ErrorBoundary.tsx
│
├── contexts/                       # React contexts
│   ├── AuthContext.tsx
│   ├── WebSocketContext.tsx
│   └── ThemeContext.tsx
│
├── types/                          # TypeScript types
│   ├── message.types.ts
│   ├── conversation.types.ts
│   ├── user.types.ts
│   └── api.types.ts
│
├── utils/                          # Pure utility functions
│   ├── formatters.ts              # Date, time, file size
│   ├── validators.ts              # Validation functions
│   └── helpers.ts                 # General helpers
│
└── lib/                           # Third-party configs
    ├── axios.ts
    └── socket.ts
```

---

## รายละเอียดการแยก

### 1. Services (API Only)

```typescript
// services/messageService.ts
// ❌ ไม่มี state, ไม่มี hooks, ไม่มี UI logic
// ✅ แค่ API calls เท่านั้น

export const messageService = {
  async getMessages(conversationId: string, params?: GetMessagesParams) {
    const response = await api.get(`/conversations/${conversationId}/messages`, { params });
    return response.data;
  },

  async sendMessage(conversationId: string, data: SendMessageData) {
    const response = await api.post(`/conversations/${conversationId}/messages/text`, data);
    return response.data;
  },

  async editMessage(messageId: string, content: string) {
    const response = await api.patch(`/messages/${messageId}`, { content });
    return response.data;
  },

  async deleteMessage(messageId: string) {
    const response = await api.delete(`/messages/${messageId}`);
    return response.data;
  },

  async replyToMessage(messageId: string, data: ReplyMessageData) {
    const response = await api.post(`/messages/${messageId}/reply`, data);
    return response.data;
  },

  async getMessageContext(conversationId: string, params: MessageContextParams) {
    const response = await api.get(`/conversations/${conversationId}/messages/context`, { params });
    return response.data;
  },
};
```

### 2. Stores (State Only)

```typescript
// stores/messageStore.ts
// ❌ ไม่มี API calls, ไม่มี business logic
// ✅ แค่ state management เท่านั้น

interface MessageState {
  // State
  messagesByConversation: Record<string, MessageDTO[]>;
  loading: boolean;
  error: string | null;

  // Actions (synchronous only)
  setMessages: (conversationId: string, messages: MessageDTO[]) => void;
  addMessage: (conversationId: string, message: MessageDTO) => void;
  updateMessage: (messageId: string, updates: Partial<MessageDTO>) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  prependMessages: (conversationId: string, messages: MessageDTO[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messagesByConversation: {},
  loading: false,
  error: null,

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: messages,
      },
    })),

  addMessage: (conversationId, message) =>
    set((state) => {
      const current = state.messagesByConversation[conversationId] || [];
      // Deduplicate
      if (current.some((m) => m.id === message.id)) return state;
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: [...current, message],
        },
      };
    }),

  updateMessage: (messageId, updates) =>
    set((state) => {
      const newState = { ...state.messagesByConversation };
      for (const convId of Object.keys(newState)) {
        newState[convId] = newState[convId].map((m) =>
          m.id === messageId ? { ...m, ...updates } : m
        );
      }
      return { messagesByConversation: newState };
    }),

  removeMessage: (conversationId, messageId) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: state.messagesByConversation[conversationId]?.filter(
          (m) => m.id !== messageId
        ) || [],
      },
    })),

  prependMessages: (conversationId, messages) =>
    set((state) => {
      const current = state.messagesByConversation[conversationId] || [];
      const newIds = new Set(messages.map((m) => m.id));
      const filtered = current.filter((m) => !newIds.has(m.id));
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: [...messages, ...filtered],
        },
      };
    }),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
```

### 3. UI Store (UI State Only)

```typescript
// stores/uiStore.ts
// สำหรับ UI state ที่ไม่เกี่ยวกับ data

interface UIState {
  // Reply
  replyingTo: { id: string; text: string; sender: string } | null;
  setReplyingTo: (reply: { id: string; text: string; sender: string } | null) => void;

  // Edit
  editingMessage: { id: string; content: string } | null;
  setEditingMessage: (editing: { id: string; content: string } | null) => void;

  // Selection
  selectedMessageIds: Set<string>;
  isSelectionMode: boolean;
  toggleSelection: (messageId: string) => void;
  enterSelectionMode: (messageId?: string) => void;
  exitSelectionMode: () => void;
  clearSelection: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  replyingTo: null,
  setReplyingTo: (reply) => set({ replyingTo: reply }),

  editingMessage: null,
  setEditingMessage: (editing) => set({ editingMessage: editing }),

  selectedMessageIds: new Set(),
  isSelectionMode: false,

  toggleSelection: (messageId) =>
    set((state) => {
      const newSet = new Set(state.selectedMessageIds);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return { selectedMessageIds: newSet };
    }),

  enterSelectionMode: (messageId) =>
    set((state) => ({
      isSelectionMode: true,
      selectedMessageIds: messageId
        ? new Set([messageId])
        : state.selectedMessageIds,
    })),

  exitSelectionMode: () =>
    set({ isSelectionMode: false, selectedMessageIds: new Set() }),

  clearSelection: () => set({ selectedMessageIds: new Set() }),
}));
```

### 4. Feature Hooks (Business Logic)

```typescript
// features/message/hooks/useMessageActions.ts
// ✅ Combines service + store + optimistic updates

export function useMessageActions(conversationId: string) {
  const { addMessage, updateMessage, removeMessage } = useMessageStore();
  const { setReplyingTo, setEditingMessage } = useUIStore();
  const currentUserId = useAuth().user?.id;

  const sendMessage = useCallback(async (content: string) => {
    // 1. Create optimistic message
    const tempId = `temp-${Date.now()}`;
    const tempMessage: MessageDTO = {
      id: tempId,
      temp_id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      message_type: 'text',
      status: 'sending',
      created_at: new Date().toISOString(),
    };

    // 2. Add to store (optimistic)
    addMessage(conversationId, tempMessage);

    try {
      // 3. Call API
      const response = await messageService.sendMessage(conversationId, { content });

      // 4. Replace temp with real
      removeMessage(conversationId, tempId);
      addMessage(conversationId, response);

      return response;
    } catch (error) {
      // 5. Mark as failed
      updateMessage(tempId, { status: 'failed' });
      throw error;
    }
  }, [conversationId, currentUserId, addMessage, updateMessage, removeMessage]);

  const replyToMessage = useCallback(async (messageId: string, content: string) => {
    // Similar pattern...
  }, [conversationId, currentUserId]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    // 1. Store old content
    const messages = useMessageStore.getState().messagesByConversation[conversationId];
    const oldMessage = messages?.find((m) => m.id === messageId);

    // 2. Optimistic update
    updateMessage(messageId, { content, updated_at: new Date().toISOString() });

    try {
      // 3. Call API
      await messageService.editMessage(messageId, content);
      setEditingMessage(null);
    } catch (error) {
      // 4. Rollback
      if (oldMessage) {
        updateMessage(messageId, { content: oldMessage.content });
      }
      throw error;
    }
  }, [conversationId, updateMessage, setEditingMessage]);

  const deleteMessage = useCallback(async (messageId: string) => {
    // Soft delete pattern...
  }, [conversationId]);

  return {
    sendMessage,
    replyToMessage,
    editMessage,
    deleteMessage,
  };
}
```

### 5. Feature Hooks (Scroll & Load)

```typescript
// features/message/hooks/useMessageScroll.ts

export function useMessageScroll(
  conversationId: string,
  virtuosoRef: RefObject<VirtuosoHandle>,
  messages: MessageDTO[]
) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { prependMessages } = useMessageStore();

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !messages.length) return;

    setIsLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const response = await messageService.getMessages(conversationId, {
        before: oldestMessage.id,
        limit: 50,
      });
      prependMessages(conversationId, response.messages);
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, messages, isLoadingMore, prependMessages]);

  const scrollToBottom = useCallback((smooth = true) => {
    virtuosoRef.current?.scrollTo({
      top: Number.MAX_SAFE_INTEGER,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, [virtuosoRef]);

  const scrollToMessage = useCallback((messageId: string) => {
    const index = messages.findIndex((m) => m.id === messageId);
    if (index === -1) return;

    // Two-phase scroll for accuracy
    virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'auto' });

    setTimeout(() => {
      virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'smooth' });

      // Highlight
      setTimeout(() => {
        const el = document.querySelector(`[data-message-id="${messageId}"]`);
        el?.classList.add('ring-4', 'ring-yellow-400');
        setTimeout(() => el?.classList.remove('ring-4', 'ring-yellow-400'), 2000);
      }, 300);
    }, 100);
  }, [messages, virtuosoRef]);

  const jumpToMessage = useCallback(async (messageId: string) => {
    // Check if in memory
    const exists = messages.some((m) => m.id === messageId);

    if (exists) {
      scrollToMessage(messageId);
    } else {
      // Fetch context from API
      const response = await messageService.getMessageContext(conversationId, {
        targetId: messageId,
        before: 50,
        after: 50,
      });

      // Replace messages in store
      useMessageStore.getState().setMessages(conversationId, response.messages);

      // Wait for render then scroll
      setTimeout(() => scrollToMessage(messageId), 300);
    }
  }, [conversationId, messages, scrollToMessage]);

  return {
    isAtBottom,
    setIsAtBottom,
    isLoadingMore,
    loadMore,
    scrollToBottom,
    scrollToMessage,
    jumpToMessage,
  };
}
```

### 6. Components (UI Only)

```typescript
// features/message/components/MessageList.tsx
// ✅ UI only - uses hooks for logic

export function MessageList({ conversationId }: { conversationId: string }) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Get data from store
  const messages = useMessageStore(
    (state) => state.messagesByConversation[conversationId] || []
  );

  // Get actions from hooks
  const { loadMore, isLoadingMore, scrollToBottom, isAtBottom, setIsAtBottom } =
    useMessageScroll(conversationId, virtuosoRef, messages);

  const { sendMessage, editMessage, deleteMessage, replyToMessage } =
    useMessageActions(conversationId);

  // Build list items
  const listItems = useMemo(() => buildListItems(messages), [messages]);

  return (
    <MessageListProvider
      conversationId={conversationId}
      onReply={replyToMessage}
      onEdit={editMessage}
      onDelete={deleteMessage}
    >
      <Virtuoso
        ref={virtuosoRef}
        data={listItems}
        itemContent={(index, item) => <MessageItem item={item} />}
        startReached={loadMore}
        atBottomStateChange={setIsAtBottom}
        // ... other props
      />

      {!isAtBottom && (
        <ScrollToBottomButton onClick={() => scrollToBottom(true)} />
      )}
    </MessageListProvider>
  );
}
```

---

## Migration Steps

### Phase 1: Services (1-2 days)

```
1. สร้าง services/ folder
2. แยก API calls จาก hooks/stores
3. Test services independently

Files to create:
├── services/messageService.ts
├── services/conversationService.ts
└── services/fileService.ts
```

### Phase 2: Stores (2-3 days)

```
1. Refactor stores to state-only
2. ลบ API calls ออกจาก stores
3. ลบ business logic ออก
4. Keep only: state + actions + selectors

Files to modify:
├── stores/messageStore.ts (simplify)
├── stores/conversationStore.ts (simplify)
└── stores/uiStore.ts (new)
```

### Phase 3: Feature Hooks (3-4 days)

```
1. สร้าง feature hooks
2. Combine service + store + logic
3. Handle optimistic updates
4. Handle errors

Files to create:
├── features/message/hooks/useMessageActions.ts
├── features/message/hooks/useMessageScroll.ts
├── features/message/hooks/useMessageList.ts
└── features/message/hooks/useMessageSelection.ts
```

### Phase 4: Components (2-3 days)

```
1. Refactor components to use new hooks
2. Remove business logic from components
3. Components = UI only

Files to modify:
├── features/message/components/MessageList.tsx
├── features/message/components/MessageItem.tsx
└── features/input/components/MessageInput.tsx
```

### Phase 5: Integration & Testing (2-3 days)

```
1. Update pages to use new structure
2. Test all features
3. Remove old files
4. Update imports
```

---

## ตัวอย่าง Before/After

### Before (useMessage.ts - 800+ lines)

```typescript
// ❌ Mixed: state + API + WebSocket + logic + everything
export function useMessage() {
  // 50 lines of imports...

  // State from multiple stores
  const { messages, addMessage, ... } = useMessageStore();
  const { activeConversationId, ... } = useConversationStore();

  // WebSocket handling (100+ lines)
  useEffect(() => {
    socket.on('message', handleNewMessage);
    socket.on('message_updated', handleMessageUpdate);
    // ...
  }, []);

  // API calls mixed with state updates (200+ lines)
  const sendTextMessage = useCallback(async (...) => {
    // Optimistic update
    // API call
    // Error handling
    // State update
  }, [...20 dependencies]);

  const replyToMessage = useCallback(async (...) => {
    // Same pattern, 100+ lines
  }, [...]);

  // ... 10 more functions

  return { /* 20+ items */ };
}
```

### After (Separated)

```typescript
// ✅ Service: API only (30 lines)
// services/messageService.ts
export const messageService = {
  sendMessage: (convId, data) => api.post(`/conversations/${convId}/messages`, data),
  editMessage: (msgId, content) => api.patch(`/messages/${msgId}`, { content }),
  // ...
};

// ✅ Store: State only (50 lines)
// stores/messageStore.ts
export const useMessageStore = create((set) => ({
  messages: {},
  addMessage: (convId, msg) => set(...),
  updateMessage: (msgId, updates) => set(...),
}));

// ✅ Hook: Business logic (80 lines)
// features/message/hooks/useMessageActions.ts
export function useMessageActions(conversationId: string) {
  const { addMessage, updateMessage } = useMessageStore();

  const sendMessage = useCallback(async (content: string) => {
    const tempMsg = createTempMessage(content);
    addMessage(conversationId, tempMsg);

    try {
      const response = await messageService.sendMessage(conversationId, { content });
      updateMessage(tempMsg.id, response);
    } catch {
      updateMessage(tempMsg.id, { status: 'failed' });
    }
  }, [conversationId]);

  return { sendMessage, editMessage, deleteMessage };
}

// ✅ Component: UI only (40 lines)
// features/message/components/SendButton.tsx
export function SendButton({ conversationId }) {
  const { sendMessage } = useMessageActions(conversationId);
  const [text, setText] = useState('');

  return (
    <button onClick={() => sendMessage(text)}>Send</button>
  );
}
```

---

## ประโยชน์หลังจาก Refactor

| ด้าน | Before | After |
|------|--------|-------|
| **Lines per file** | 500-1100 | 30-100 |
| **Dependencies** | 15-20 | 3-5 |
| **Testability** | Mock everything | Test in isolation |
| **Reusability** | Copy whole file | Import function |
| **Debug** | Search 1100 lines | Go to specific file |
| **Onboarding** | 1 week to understand | 1 day |
| **Bug fix** | Risky, affects many | Isolated change |

---

## Estimated Timeline

| Phase | Duration | Effort |
|-------|----------|--------|
| Phase 1: Services | 1-2 days | Low |
| Phase 2: Stores | 2-3 days | Medium |
| Phase 3: Hooks | 3-4 days | High |
| Phase 4: Components | 2-3 days | Medium |
| Phase 5: Integration | 2-3 days | Medium |
| **Total** | **10-15 days** | |

---

## Recommendation

### ทำแบบ Incremental

1. **อย่าทำทีเดียวทั้งหมด** - เสี่ยง
2. **เริ่มจาก feature ใหม่** - ใช้โครงสร้างใหม่
3. **ค่อยๆ migrate ของเก่า** - ทีละส่วน
4. **chat-v2 เป็น pilot** - ทดสอบโครงสร้างใหม่

### ลำดับที่แนะนำ

```
1. ใช้ chat-v2 เป็น pilot project
2. Refactor services ก่อน (กระทบน้อย)
3. แยก UI store
4. สร้าง feature hooks ใหม่
5. ค่อยๆ replace ของเก่า
```

---

## Summary

**คำตอบ: ใช่ครับ ควร refactor**

เหตุผล:
1. **โค้ดอ่านง่ายขึ้นมาก** - 100 บรรทัด vs 1100 บรรทัด
2. **Debug ง่ายขึ้น** - รู้ว่า bug อยู่ไหน
3. **Test ได้** - แยก unit test แต่ละส่วน
4. **Reuse ได้** - ใช้ซ้ำใน project อื่น
5. **Team ทำงานด้วยกันได้** - แยกกันทำ feature

**แต่ต้องทำแบบ incremental** - ไม่งั้นเสี่ยงพัง production
