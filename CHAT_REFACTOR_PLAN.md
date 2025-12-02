# Chat System Refactor Plan

## 🎯 เป้าหมาย

แก้ไขปัญหาหลัก 3 ข้อ:
1. ✅ **Send message ผิด conversation** (ร้ายแรงที่สุด)
2. ✅ **Component re-render ซ้ำบ่อยเกินไป**
3. ✅ **Focus หลุดหลังส่งข้อความ**

## 📋 ปัญหาปัจจุบัน

### 1. Send Message ผิด Conversation (Critical!)

**สาเหตุที่เป็นไปได้:**

```tsx
// ConversationPageDemo.tsx
<MessageInputArea
  key={conversationId} // ← Force remount เมื่อเปลี่ยน conversation
  conversationId={conversationId}
  onSendMessage={handleSendMessage} // ← Callback อาจอ้างอิง stale conversationId
  ...
/>
```

**ปัญหา:**
- `key={conversationId}` ทำให้ component remount
- แต่ `handleSendMessage` callback อาจยังอ้างอิง `activeConversationId` เก่า
- Draft system อาจ load/save ผิด conversation

**Timeline ของปัญหา:**
```
T0: User เปิด Conversation A (id: "aaa")
T1: MessageInputArea mount with key="aaa"
T2: handleSendMessage closure captures conversationId="aaa"
T3: User สลับไป Conversation B (id: "bbb")
T4: MessageInputArea unmount (key เปลี่ยน)
T5: MessageInputArea mount ใหม่ with key="bbb"
T6: แต่ handleSendMessage ใน parent อาจยังอ้างอิง "aaa"? ← ต้องตรวจสอบ
```

### 2. Component Re-render Cycle

**จาก logs:**
```
MessageInput rendered (1st render)
useMessageInput hook called
MessageInput rendered (2nd render)
useMessageInput hook called
MessageInput rendered (3rd render)
useMessageInput hook called
```

**สาเหตุ:**
- ConversationPageDemo re-render → MessageInputArea re-render (แม้มี React.memo)
- Props ที่เป็น callback functions (`onSendMessage`, `onSendSticker`, etc.) อาจไม่ stable
- WebSocket events update store → trigger re-renders

### 3. State Management Issues

**ปัญหาใน useConversationPageLogic:**
```typescript
const {
  conversations,
  activeConversationId,
  conversationMessages,
  // ... อีกเยอะ
} = useConversation(); // ← Subscribe store หลายค่าพร้อมกัน

const {
  sendTextMessage,
  sendStickerMessage,
  // ... อีกเยอะ
} = useMessage(); // ← Subscribe อีก store

// มี useMemo, useCallback เยอะมาก แต่ dependencies ไม่ stable
```

**ผลกระทบ:**
- Subscribe store มากเกินไป → re-render บ่อย
- Dependencies ไม่ stable → callbacks recreate ทุกครั้ง
- Props drilling ลึก → MessageInputArea ได้รับ props ใหม่ตลอด

## 🏗️ สถาปัตยกรรมใหม่

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ ConversationPageDemo                                     │
│ - จัดการ layout และ routing เท่านั้น                   │
│ - ไม่มี business logic                                  │
└─────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌──────────────────┐            ┌──────────────────────┐
│ MessageListArea  │            │ MessageInputArea     │
│ - แสดงข้อความ    │            │ - ป้อนข้อความ        │
│ - ใช้ Context    │            │ - ใช้ Context        │
└──────────────────┘            └──────────────────────┘
        │                                 │
        └────────────────┬────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ ActiveConversationContext       │
        │ - conversationId                │
        │ - sendMessage()                 │
        │ - messages[]                    │
        │ - isLoading                     │
        └─────────────────────────────────┘
```

### ข้อดี:
1. ✅ **Isolated State**: MessageInput ไม่ขึ้นกับ parent re-renders
2. ✅ **Stable Context**: Context values เปลี่ยนเฉพาะเมื่อจำเป็น
3. ✅ **No Props Drilling**: ไม่ต้องส่ง props ลึก
4. ✅ **Clear Boundaries**: แต่ละ component มีหน้าที่ชัดเจน

## 📝 Implementation Plan

### Phase 1: สร้าง ActiveConversationContext ✅

**File:** `src/contexts/ActiveConversationContext.tsx`

```typescript
interface ActiveConversationContextValue {
  // Conversation Info
  conversationId: string | null;
  conversation: ConversationDTO | null;

  // Messages
  messages: MessageDTO[];
  hasMoreMessages: boolean;
  isLoadingMessages: boolean;

  // Message Actions (stable references)
  sendMessage: (content: string) => Promise<void>;
  sendSticker: (stickerId: string, url: string, setId: string) => Promise<void>;
  uploadImage: (file: File) => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;

  // Reply State
  replyingTo: { id: string; text: string; sender: string } | null;
  setReplyingTo: (message: { id: string; text: string; sender: string } | null) => void;

  // Loading States
  isSending: boolean;
}

export function ActiveConversationProvider({ children }: { children: ReactNode }) {
  const { conversationId } = useParams<{ conversationId: string }>();

  // Subscribe to conversation store (optimized)
  const conversation = useConversationStore(
    useCallback(
      (state) => state.conversations.find(c => c.id === conversationId),
      [conversationId]
    )
  );

  const messages = useConversationStore(
    useCallback(
      (state) => conversationId ? state.conversationMessages[conversationId] || [] : [],
      [conversationId]
    )
  );

  // Stable callback references with useCallback
  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) return;

    // Implementation
    await messageService.sendTextMessage(conversationId, content);
  }, [conversationId]); // ← conversationId จาก useParams (stable)

  // ... other stable callbacks

  const value = useMemo(() => ({
    conversationId,
    conversation,
    messages,
    sendMessage,
    // ... other values
  }), [conversationId, conversation, messages, sendMessage, /* ... */]);

  return (
    <ActiveConversationContext.Provider value={value}>
      {children}
    </ActiveConversationContext.Provider>
  );
}

export function useActiveConversation() {
  const context = useContext(ActiveConversationContext);
  if (!context) {
    throw new Error('useActiveConversation must be used within ActiveConversationProvider');
  }
  return context;
}
```

**ข้อดี:**
- ✅ `conversationId` มาจาก `useParams` → stable, เปลี่ยนเฉพาะเมื่อ URL เปลี่ยน
- ✅ Callbacks ใช้ `useCallback` กับ `conversationId` → stable references
- ✅ Components subscribe เฉพาะ context → ไม่ re-render ตาม parent

### Phase 2: Refactor MessageInput เพื่อใช้ Context ✅

**File:** `src/components/shared/MessageInput.tsx`

```typescript
/**
 * MessageInput - Pure component
 * ไม่รับ props ที่เกี่ยวกับ conversation logic
 * ใช้ context เพื่อแยกออกจาก parent
 */
const MessageInput: React.FC = () => {
  // ✅ ใช้ context แทน props
  const {
    conversationId,
    sendMessage,
    sendSticker,
    uploadImage,
    uploadFile,
    isSending,
    replyingTo,
    setReplyingTo
  } = useActiveConversation();

  // ✅ Draft system - stable
  const { getDraft, setDraft, clearDraft } = useDraftStore();

  // Local state
  const [message, setMessage] = useState(() => {
    return conversationId ? getDraft(conversationId) : '';
  });

  const [focusLocked, setFocusLocked] = useState(false);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // ✅ Load draft เมื่อ conversationId เปลี่ยน (จาก context)
  useEffect(() => {
    if (conversationId) {
      const draft = getDraft(conversationId);
      setMessage(draft);
    }
  }, [conversationId, getDraft]);

  // ✅ Save draft
  useEffect(() => {
    if (conversationId) {
      setDraft(conversationId, message);
    }
  }, [conversationId, message, setDraft]);

  // ✅ Handle send - ใช้ sendMessage จาก context (stable)
  const handleSend = useCallback(async () => {
    if (!message.trim() || isSending) return;

    // Lock focus
    setFocusLocked(true);

    try {
      await sendMessage(message.trim());
      setMessage('');

      if (conversationId) {
        clearDraft(conversationId);
      }
    } finally {
      // Unlock after 500ms
      setTimeout(() => {
        setFocusLocked(false);
        messageInputRef.current?.focus();
      }, 500);
    }
  }, [message, isSending, sendMessage, conversationId, clearDraft]);

  // ✅ Focus lock mechanism
  useEffect(() => {
    if (focusLocked && document.activeElement !== messageInputRef.current) {
      messageInputRef.current?.focus();
    }
  }, [focusLocked]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (focusLocked) {
      e.preventDefault();
      messageInputRef.current?.focus();
    }
  }, [focusLocked]);

  return (
    <div className="p-3 bg-card border-t border-border">
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
        <textarea
          ref={messageInputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="พิมพ์ข้อความ..."
          disabled={isSending}
        />
        <button type="submit" disabled={!message.trim() || isSending}>
          ส่ง
        </button>
      </form>
    </div>
  );
};

export default React.memo(MessageInput);
```

**ข้อดี:**
- ✅ ไม่มี props drilling
- ✅ `sendMessage` จาก context (stable) → ไม่ send ผิด conversation
- ✅ `conversationId` จาก context (stable) → draft ถูก conversation
- ✅ React.memo ทำงานได้ดี เพราะไม่มี props

### Phase 3: Refactor ConversationPageDemo ✅

**File:** `src/pages/chat/ConversationPageDemo.tsx`

```typescript
export default function ConversationPageDemo() {
  const { conversationId } = useParams<{ conversationId: string }>();

  // ✅ แสดง empty state ถ้าไม่มี conversationId
  if (!conversationId) {
    return <EmptyConversationView />;
  }

  return (
    <ActiveConversationProvider>
      <div className="flex flex-col h-full">
        {/* ChatHeader - ใช้ context */}
        <ChatHeader />

        {/* MessageArea - ใช้ context */}
        <MessageArea />

        {/* MessageInput - ใช้ context (ไม่มี props!) */}
        <MessageInput />
      </div>
    </ActiveConversationProvider>
  );
}
```

**ข้อดี:**
- ✅ Component ง่ายมาก ไม่มี logic
- ✅ ไม่มี props drilling
- ✅ แต่ละ child component subscribe context ตามต้องการ
- ✅ Parent re-render ไม่ส่งผลกับ MessageInput

### Phase 4: Optimize Store Subscriptions ✅

**ปัญหาเดิม:**
```typescript
// ❌ Subscribe ทั้ง object → re-render ทุกครั้งที่ object เปลี่ยน
const conversationMessages = useConversationStore(state => state.conversationMessages);
const messages = conversationMessages[conversationId] || [];
```

**แก้ไขใหม่:**
```typescript
// ✅ Subscribe เฉพาะ messages ของ conversation นี้
const messages = useConversationStore(
  useCallback(
    (state) => conversationId
      ? state.conversationMessages[conversationId] || []
      : [],
    [conversationId]
  )
);
```

**File:** `src/stores/conversationStore.ts`

```typescript
// ✅ เพิ่ม memoized selectors
export const conversationSelectors = {
  conversations: (state: ConversationState) => state.conversations,
  activeConversationId: (state: ConversationState) => state.activeConversationId,

  // ✅ Selector สำหรับ messages ของ conversation เฉพาะ
  getConversationMessages: (conversationId: string) => (state: ConversationState) => {
    return state.conversationMessages[conversationId] || [];
  },

  // ✅ Selector สำหรับ conversation เฉพาะ
  getConversation: (conversationId: string) => (state: ConversationState) => {
    return state.conversations.find(c => c.id === conversationId) || null;
  },

  // ✅ Memoized selector
  getActiveConversation: (state: ConversationState) => {
    if (!state.activeConversationId) return null;
    return state.conversations.find(c => c.id === state.activeConversationId) || null;
  }
};

// ใช้งาน:
const messages = useConversationStore(conversationSelectors.getConversationMessages(conversationId));
const conversation = useConversationStore(conversationSelectors.getConversation(conversationId));
```

### Phase 5: Optimize WebSocket Event Handling ✅

**ปัญหาเดิม:**
```typescript
// ❌ แต่ละ event update store ทันที → re-render แยกกัน
addEventListener('message.receive', (data) => {
  addNewMessage(data.data); // ← Trigger re-render
});

addEventListener('conversation.update', (data) => {
  updateConversation(data.data); // ← Trigger re-render อีก
});
```

**แก้ไขใหม่:**
```typescript
// ✅ Batch updates within animation frame
let pendingUpdates: Array<() => void> = [];
let updateScheduled = false;

function scheduleUpdate(update: () => void) {
  pendingUpdates.push(update);

  if (!updateScheduled) {
    updateScheduled = true;
    requestAnimationFrame(() => {
      // Batch all updates
      pendingUpdates.forEach(fn => fn());
      pendingUpdates = [];
      updateScheduled = false;
    });
  }
}

addEventListener('message.receive', (data) => {
  scheduleUpdate(() => addNewMessage(data.data));
});

addEventListener('conversation.update', (data) => {
  scheduleUpdate(() => updateConversation(data.data));
});
```

### Phase 6: Simplify Draft System ✅

**ปัญหาเดิม:**
- Draft save/load ทุกครั้งที่ component render
- อาจ save/load ผิด conversation

**แก้ไขใหม่:**
```typescript
// ✅ Draft system ที่ปลอดภัย
export function useMessageDraft(conversationId: string | null) {
  const { getDraft, setDraft, clearDraft } = useDraftStore();

  const [message, setMessage] = useState(() => {
    return conversationId ? getDraft(conversationId) : '';
  });

  // Load draft เมื่อ conversationId เปลี่ยน
  useEffect(() => {
    if (conversationId) {
      const draft = getDraft(conversationId);
      setMessage(draft);
    } else {
      setMessage('');
    }
  }, [conversationId, getDraft]);

  // Save draft (debounced)
  const debouncedSave = useMemo(
    () => debounce((convId: string, msg: string) => {
      setDraft(convId, msg);
    }, 300),
    [setDraft]
  );

  useEffect(() => {
    if (conversationId && message) {
      debouncedSave(conversationId, message);
    }

    return () => {
      debouncedSave.cancel();
    };
  }, [conversationId, message, debouncedSave]);

  return {
    message,
    setMessage,
    clearDraft: useCallback(() => {
      if (conversationId) {
        clearDraft(conversationId);
      }
    }, [conversationId, clearDraft])
  };
}
```

## 📊 Migration Steps

### Step 1: สร้าง ActiveConversationContext
- [ ] สร้างไฟล์ `src/contexts/ActiveConversationContext.tsx`
- [ ] Implement context provider
- [ ] Implement useActiveConversation hook
- [ ] Test context ใน isolation

### Step 2: Refactor MessageInput
- [ ] แก้ไข MessageInput ให้ใช้ context
- [ ] ลบ props ที่ไม่จำเป็น
- [ ] Test MessageInput แยกต่างหาก
- [ ] Verify draft system ทำงานถูกต้อง

### Step 3: Refactor ConversationPageDemo
- [ ] Wrap children ด้วย ActiveConversationProvider
- [ ] ลบ logic ที่ย้ายไป context แล้ว
- [ ] ลด props drilling
- [ ] Test integration

### Step 4: Optimize Store
- [ ] เพิ่ม memoized selectors
- [ ] แก้ไข subscriptions ให้เฉพาะเจาะจง
- [ ] Test performance

### Step 5: Optimize WebSocket
- [ ] Implement batch updates
- [ ] Test real-time updates
- [ ] Measure re-render count

### Step 6: Cleanup
- [ ] ลบ code ที่ไม่ใช้
- [ ] ลบ console.logs
- [ ] Update tests
- [ ] Update documentation

## 🎯 Expected Results

### Before Refactor
```
[Send Message]
ConversationPageDemo re-render (1x)
MessageInputArea re-render (1x)
MessageInput re-render (3x) ← บ่อยเกินไป
useMessageInput hook called (3x)

Total: 8 re-renders
Focus: หลุด
Message: อาจส่งผิด conversation
```

### After Refactor
```
[Send Message]
MessageInput re-render (1x only) ← Context stable!
useMessageInput hook called (1x)

Total: 1 re-render ← ลด 87.5%!
Focus: ไม่หลุด (focus lock mechanism)
Message: ส่งถูก conversation 100% (conversationId จาก context)
```

## 📈 Performance Metrics

### Target Improvements
- ✅ Re-renders: ลด 80-90%
- ✅ Message send accuracy: 100%
- ✅ Focus retention: 100%
- ✅ Draft save/load accuracy: 100%

## 🚨 Risks & Mitigations

### Risk 1: Breaking Changes
**Mitigation:** ทำทีละ phase, test ทุก phase

### Risk 2: WebSocket Integration
**Mitigation:** Test real-time updates ทุกครั้งที่แก้ไข

### Risk 3: Draft System
**Mitigation:** เพิ่ม tests สำหรับ draft load/save

## 📝 Testing Checklist

### Unit Tests
- [ ] ActiveConversationContext provider
- [ ] useActiveConversation hook
- [ ] MessageInput component
- [ ] Draft system

### Integration Tests
- [ ] Send message ถูก conversation
- [ ] Switch conversation → draft ถูก conversation
- [ ] WebSocket updates → UI update ถูกต้อง
- [ ] Focus retention หลังส่งข้อความ

### E2E Tests
- [ ] ส่งข้อความใน conversation A
- [ ] สลับไป conversation B
- [ ] ส่งข้อความใน conversation B
- [ ] Verify ข้อความอยู่ใน conversation ถูกต้อง
- [ ] Verify draft แยกกันแต่ละ conversation

## 🎓 Key Principles

1. **Single Source of Truth**: conversationId จาก useParams เท่านั้น
2. **Stable References**: ใช้ useCallback, useMemo อย่างถูกต้อง
3. **Context over Props**: ลด props drilling
4. **Memoization**: React.memo + memoized selectors
5. **Batching**: Batch WebSocket updates
6. **Isolation**: แยก concerns ให้ชัดเจน

---

## 🚀 Next Actions

1. Review plan นี้
2. เริ่มทำ Phase 1: สร้าง ActiveConversationContext
3. Test แต่ละ phase ก่อนไป phase ถัดไป
4. Monitor performance improvements
5. Iterate และปรับปรุง

**ถ้า approve plan นี้ ให้เริ่มทำได้เลย!** 🎯
