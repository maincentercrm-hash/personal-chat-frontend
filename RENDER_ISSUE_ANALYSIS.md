# การวิเคราะห์ปัญหาการ Render ซ้ำและ Focus หลุด

## 🔴 ปัญหาหลัก

หลังจากส่งข้อความ (กด Enter หรือคลิกปุ่มส่ง):
1. **Component render ซ้ำ 10+ ครั้ง** ภายในระยะเวลาสั้นๆ
2. **Focus หลุดจาก textarea** (`activeElement` กลับเป็น `<body>`)
3. **ผู้ใช้ต้องคลิก textarea ใหม่** ทุกครั้งหลังส่งข้อความ

## 📊 ข้อมูลจาก Console Logs

```
[Render] handleKeyDown - Sending message via Enter
[Render] ConversationPageDemo rendered (x10+)
[Render] MessageInputArea rendered (x10+)
[Render] MessageInput rendered (x10+)
[Render] useMessageInput hook called (x10+)
[Render] Focus called (keydown), activeElement: <body>
```

**สังเกต:**
- หลังส่งข้อความ ทุก component ใน chain render ซ้ำหลายครั้ง
- แม้จะเรียก `focus()` แล้ว แต่ `activeElement` ยังเป็น `<body>`

## 🔍 การวิเคราะห์สาเหตุ

### 1. Routes Analysis (`src/routes/index.tsx`)

**Routes ที่ใช้งานจริง:**
```tsx
// ✅ Active Routes
<Route path="/chat" element={<ConversationPageDemo />} />
<Route path="/chat/:conversationId" element={<ConversationPageDemo />} />
<Route path="/chat/contacts" element={<FriendsPage />} />
<Route path="/chat/settings" element={<SettingsPage />} />

// ❌ Unused POC Route (ควรลบ)
<Route path="/poc/virtuoso/:conversationId" element={<MinimalChatVirtuosoEnhanced />} />
```

**ปัญหา:** POC route ยังอยู่ แต่ไม่ได้ใช้งาน

### 2. Component Hierarchy

```
ConversationPageDemo
├─ useConversationPageLogic(conversationId)
│  ├─ useConversation() ← Zustand store
│  ├─ useMessage() ← Zustand store
│  ├─ useAuth() ← Zustand store
│  └─ useOnlineStatus(userIds) ← WebSocket subscription
│
└─ MessageInputArea
   ├─ key={conversationId} ← Force remount when conversation changes
   └─ MessageInput
      └─ useMessageInput
         ├─ useDraftStore() ← Zustand store
         └─ State: message, showPanel, activeTab
```

### 3. State Updates Chain หลังส่งข้อความ

เมื่อกด Enter เพื่อส่งข้อความ:

```
1. handleKeyDown() / handleSubmit()
   ↓
2. onSendMessage(message) ← Call useConversationPageLogic.handleSendMessage
   ↓
3. sendTextMessage(conversationId, message) ← Call useMessage hook
   ↓
4. API call to backend
   ↓
5. WebSocket receives 'message.receive' event
   ↓
6. useConversation: addEventListener('message:message.receive')
   ↓
7. addNewMessage() ← Update conversationStore
   ↓
8. conversationMessages updates ← Trigger re-render
   ↓
9. conversationStore updates ← Trigger re-render
   ↓
10. useConversationPageLogic dependencies change
    ↓
11. ConversationPageDemo re-renders
    ↓
12. MessageInputArea re-renders (key={conversationId} unchanged)
    ↓
13. MessageInput re-renders
    ↓
14. useMessageInput hook called again
    ↓
15. Focus attempt ← BUT DOM is being recreated!
```

### 4. สาเหตุการ Render ซ้ำ

#### 4.1 Zustand Store Updates
```typescript
// useConversation.ts
const conversations = useConversationStore(conversationSelectors.conversations);
const activeConversationId = useConversationStore(conversationSelectors.activeConversationId);
const conversationMessages = useConversationStore(state => state.conversationMessages);
```

**ปัญหา:**
- เมื่อ WebSocket ได้รับข้อความใหม่ → `conversationMessages` update
- ทุก component ที่ subscribe store นี้จะ re-render

#### 4.2 useConversationPageLogic Dependencies

```typescript
// useConversationPageLogic.ts

const allDirectUserIds = useMemo(() => {
  // ... depends on conversations, getActiveConversation
}, [conversations, getActiveConversation]); // ← Re-compute when conversations change

const activeChat = useMemo(() => {
  return activeConversationId ? getActiveConversation() : null;
}, [activeConversationId, getActiveConversation]); // ← getActiveConversation not stable!

const activeConversationMessages = useMemo(() => {
  return activeConversationId ? conversationMessages[activeConversationId] || [] : [];
}, [activeConversationId, conversationMessages]); // ← Re-compute when messages change
```

**ปัญหา:**
- `getActiveConversation` ไม่ได้ memoize → ทำให้ dependencies เปลี่ยนทุกครั้ง
- `conversationMessages` object reference เปลี่ยน → trigger re-render

#### 4.3 WebSocket Event Handlers

```typescript
// useConversation.ts
useEffect(() => {
  if (!isConnected) return;

  const unsubConversationList = addEventListener('message:conversation.list', ...);
  const unsubNewMessage = addEventListener('message:message.receive', ...);
  // ... more event listeners
}, [isConnected, addEventListener, ...]);
```

**ปัญหา:**
- WebSocket events trigger หลาย events พร้อมกัน:
  - `message.receive` - ข้อความใหม่
  - `conversation.list` - update conversation list
  - `message.read` - status update
- แต่ละ event update store → trigger re-render แยกกัน

#### 4.4 Draft Store Updates

```typescript
// useMessageInput.ts
useEffect(() => {
  if (conversationId) {
    setDraft(conversationId, message); // ← Update every keystroke!
  }
}, [message, conversationId, setDraft]);
```

**ปัผลกระทบ:**
- เมื่อ `setMessage('')` หลังส่งข้อความ → trigger useEffect
- Draft store update → re-render (แต่น่าจะน้อย เพราะ persist middleware)

### 5. ปัญหา key={conversationId}

```tsx
// ConversationPageDemo.tsx
<MessageInputArea
  key={conversationId} // ← Force remount when conversationId changes
  conversationId={conversationId}
  ...
/>
```

**เจตนา:** Force remount เพื่อแยก draft state ระหว่าง conversation

**ปัญหา:**
- ถ้า `conversationId` **ไม่เปลี่ยน** (ส่งข้อความใน conversation เดิม) → ไม่ควร remount
- แต่ถ้า parent (ConversationPageDemo) re-render บ่อย → MessageInputArea ก็ re-render ตาม
- **key ไม่ได้ป้องกันการ re-render จาก parent**

### 6. สาเหตุ Focus หลุด

```typescript
// useMessageInput.ts
const handleKeyDown = useCallback((e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    onSendMessage(message.trim());
    setMessage('');

    // Focus attempt - แต่ component กำลัง re-render!
    shouldFocusAfterSendRef.current = true;
  }
}, [...]);

useEffect(() => {
  if (shouldFocusAfterSendRef.current) {
    messageInputRef.current?.focus(); // ← เรียกหลัง render
    shouldFocusAfterSendRef.current = false;
  }
});
```

**Timeline:**
```
T0: User กด Enter
T1: onSendMessage() ← API call
T2: shouldFocusAfterSendRef = true
T3: ConversationPageDemo re-render #1
T4: MessageInputArea re-render #1
T5: MessageInput re-render #1
T6: useEffect runs → focus() ← Focus ติด!
T7: WebSocket 'message.receive' event
T8: conversationStore update
T9: ConversationPageDemo re-render #2 ← Parent re-render!
T10: MessageInputArea re-render #2 ← Child re-render ตาม!
T11: MessageInput re-render #2 ← textarea recreated!
T12: Focus หลุด! ← DOM node ใหม่
... (ซ้ำไปเรื่อยๆ 10+ ครั้ง)
```

**สาเหตุหลัก:**
- Component re-render บ่อยเกินไป **หลังจาก focus แล้ว**
- Re-render → textarea DOM node recreated → focus หลุด

## 🎯 แนวทางแก้ไข

### ✅ Solution 1: ลด Re-renders (แนะนำ)

#### 1.1 Memoize getActiveConversation
```typescript
// conversationStore.ts
export const conversationSelectors = {
  // ... existing selectors
  getActiveConversation: (state: ConversationState) => {
    if (!state.activeConversationId) return null;
    return state.conversations.find(c => c.id === state.activeConversationId) || null;
  }
};

// useConversationPageLogic.ts
const getActiveConversation = useConversationStore(conversationSelectors.getActiveConversation);
const activeChat = useMemo(() => getActiveConversation, [getActiveConversation]);
```

#### 1.2 Optimize WebSocket Event Batching
```typescript
// useConversation.ts - Batch multiple updates
let updateTimer: NodeJS.Timeout | null = null;
let pendingUpdates: MessageDTO[] = [];

const unsubNewMessage = addEventListener('message:message.receive', (data) => {
  pendingUpdates.push(data.data);

  if (updateTimer) clearTimeout(updateTimer);

  updateTimer = setTimeout(() => {
    // Batch update all messages at once
    pendingUpdates.forEach(msg => addNewMessage(msg));
    pendingUpdates = [];
  }, 50); // Batch updates within 50ms
});
```

#### 1.3 Separate Message List and Input Stores
```typescript
// Create separate store for message input to avoid re-renders
// messageInputStore.ts
import { create } from 'zustand';

interface MessageInputState {
  isSending: boolean;
  setIsSending: (value: boolean) => void;
}

export const useMessageInputStore = create<MessageInputState>((set) => ({
  isSending: false,
  setIsSending: (value) => set({ isSending: value }),
}));
```

#### 1.4 Use React.memo for MessageInputArea
```tsx
// MessageInputArea.tsx
const MessageInputArea = React.memo<MessageInputAreaProps>(({
  conversationId,
  onSendMessage,
  // ... other props
}) => {
  console.log('[Render] MessageInputArea rendered, conversationId:', conversationId);

  return (
    <MessageInput
      conversationId={conversationId}
      onSendMessage={onSendMessage}
      // ... other props
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.conversationId === nextProps.conversationId &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.replyingTo?.id === nextProps.replyingTo?.id
  );
});
```

### ✅ Solution 2: Prevent Focus Loss (เสริม)

#### 2.1 Lock Focus หลังส่งข้อความ
```typescript
// useMessageInput.ts
const [focusLocked, setFocusLocked] = useState(false);

// Prevent blur when sending
const handleKeyDown = useCallback((e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();

    if (message.trim() && !isLoading) {
      // Lock focus
      setFocusLocked(true);

      onSendMessage(message.trim());
      setMessage('');

      if (conversationId) {
        clearDraft(conversationId);
      }

      // Unlock after 500ms
      setTimeout(() => setFocusLocked(false), 500);
    }
  }
}, [message, isLoading, onSendMessage, conversationId, clearDraft]);

// Keep focus locked
useEffect(() => {
  if (focusLocked && document.activeElement !== messageInputRef.current) {
    messageInputRef.current?.focus();
  }
}, [focusLocked]);

// Also prevent blur event when locked
const handleBlur = useCallback((e: React.FocusEvent) => {
  if (focusLocked) {
    e.preventDefault();
    messageInputRef.current?.focus();
  }
}, [focusLocked]);
```

### ✅ Solution 3: ลบ Routes ที่ไม่ใช้

```diff
// src/routes/index.tsx

- // POC Pages (Development only - เก็บไว้สำหรับทดสอบ)
- import MinimalChatVirtuosoEnhanced from '@/pages/poc/MinimalChatVirtuosoEnhanced'

  export default function AppRoutes() {
    return (
      <Routes>
        {/* ... auth routes */}

        {isAuthenticated ? (
          <>
            <Route element={<ChatLayout />}>
              <Route path="/chat/contacts" element={<FriendsPage />} />
              <Route path="/chat/settings" element={<SettingsPage />} />
              <Route path="/chat" element={<ConversationPageDemo />} />
              <Route path="/chat/:conversationId" element={<ConversationPageDemo />} />
            </Route>

-           {/* POC Route (Development/Testing only) */}
-           <Route path="/poc/virtuoso/:conversationId" element={<MinimalChatVirtuosoEnhanced />} />

            <Route path="/" element={<Navigate to="/chat" replace />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        )}

        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    );
  }
```

## 📝 สรุป

### ปัญหาหลัก
1. **ConversationPageDemo re-render บ่อยมาก** เพราะ:
   - WebSocket events update store หลายครั้ง
   - Dependencies ไม่ stable (getActiveConversation)
   - conversationMessages reference เปลี่ยนทุกครั้ง

2. **MessageInputArea re-render ตาม parent** แม้จะมี key={conversationId}

3. **Focus หลุด** เพราะ textarea DOM ถูก recreate ระหว่างที่ focus กำลังจะกลับมา

### แนวทางแก้ไขแนะนำ (เรียงตามความสำคัญ)

1. **ลด re-renders ที่ไม่จำเป็น:**
   - ✅ Memoize selectors และ callbacks
   - ✅ Batch WebSocket updates
   - ✅ ใช้ React.memo กับ MessageInputArea

2. **ป้องกัน focus loss:**
   - ✅ Lock focus ระหว่างส่งข้อความ
   - ✅ Prevent blur events

3. **Clean up routes:**
   - ✅ ลบ POC route ที่ไม่ใช้

### ไฟล์ที่ต้องแก้ไข

1. `src/routes/index.tsx` - ลบ POC route
2. `src/stores/conversationStore.ts` - เพิ่ม memoized selectors
3. `src/hooks/useConversation.ts` - Batch WebSocket updates
4. `src/components/shared/MessageInputArea.tsx` - เพิ่ม React.memo
5. `src/components/shared/hooks/useMessageInput.ts` - เพิ่ม focus lock mechanism
