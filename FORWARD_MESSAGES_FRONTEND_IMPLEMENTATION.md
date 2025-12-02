# Forward Messages - Frontend Implementation Plan

**Date:** 2025-12-02
**Based on:** Backend Q&A Summary
**Priority:** 🔴 High

---

## 📋 Backend Answers Summary

### ❌ What Backend Does NOT Provide:
1. **No `conversation.updated` event** → Frontend must update manually
2. **No `unread_count` in WebSocket** → Frontend must calculate
3. **No WebSocket error events** → Check HTTP response only
4. **No missed message queue** → Frontend must fetch after reconnect

### ✅ What Backend Provides:
1. `message.new` event for each forwarded message
2. Sequential delivery (order guaranteed)
3. Album files now copied (bug fixed)
4. `is_forwarded` and `forwarded_from` metadata

---

## 🎯 Required Changes

### 1. Update Conversation Metadata on `message.new` Event

**Problem:** Backend doesn't send `conversation.updated` event

**Solution:** Update conversation in WebSocket message handler

**Location:** `src/services/websocket/WebSocketEventEmitter.ts` or conversation handler

**Implementation:**
```typescript
socket.on('message.new', (event) => {
  const { conversation_id, data: message } = event;

  // 1. Add message to conversation
  addMessage(conversation_id, message);

  // 2. Update conversation metadata
  updateConversation(conversation_id, {
    last_message: message.content,
    last_message_at: message.created_at,
    last_message_type: message.message_type,
    updated_at: message.created_at,
  });

  // 3. Re-sort conversations (move to top)
  sortConversations();
});
```

---

### 2. Calculate Unread Count Manually

**Problem:** Backend doesn't send `unread_count`

**Solution:** Increment locally when receiving message

**Location:** Message event handler

**Implementation:**
```typescript
socket.on('message.new', (event) => {
  const { conversation_id, data: message } = event;

  // Check if should increment unread
  const shouldIncrementUnread =
    conversation_id !== currentConversationId && // Not current conversation
    message.sender_id !== currentUserId;          // Not from me

  if (shouldIncrementUnread) {
    // Increment unread count
    const conversation = getConversation(conversation_id);
    if (conversation) {
      conversation.unread_count = (conversation.unread_count || 0) + 1;
    }
  }
});
```

---

### 3. Implement Batch Rendering for Performance

**Problem:** Forward 10 messages = 10 separate events → UI jank

**Solution:** Batch messages and render together

**Location:** New utility class or WebSocket handler

**Implementation:**
```typescript
class MessageBatcher {
  private queue: Array<{ conversation_id: string; message: Message }> = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 100; // ms

  add(conversation_id: string, message: Message) {
    this.queue.push({ conversation_id, message });

    // Reset timer
    if (this.timer) clearTimeout(this.timer);

    // Schedule flush
    this.timer = setTimeout(() => {
      this.flush();
    }, this.BATCH_DELAY);
  }

  flush() {
    if (this.queue.length === 0) return;

    // Group by conversation
    const grouped = this.groupByConversation(this.queue);

    // Update each conversation once
    Object.entries(grouped).forEach(([convId, items]) => {
      const messages = items.map((i) => i.message);

      // Add all messages at once
      addMessagesToConversation(convId, messages);

      // Update conversation metadata (use last message)
      const lastMessage = messages[messages.length - 1];
      updateConversation(convId, {
        last_message: lastMessage.content,
        last_message_at: lastMessage.created_at,
        last_message_type: lastMessage.message_type,
        updated_at: lastMessage.created_at,
      });
    });

    // Re-sort once
    sortConversations();

    // Clear queue
    this.queue = [];
    this.timer = null;
  }

  private groupByConversation(
    items: Array<{ conversation_id: string; message: Message }>
  ) {
    return items.reduce((acc, item) => {
      if (!acc[item.conversation_id]) {
        acc[item.conversation_id] = [];
      }
      acc[item.conversation_id].push(item);
      return acc;
    }, {} as Record<string, Array<{ conversation_id: string; message: Message }>>);
  }
}

// Usage
const messageBatcher = new MessageBatcher();

socket.on('message.new', (event) => {
  messageBatcher.add(event.conversation_id, event.data);
});
```

---

### 4. Check HTTP Response for Errors

**Problem:** No WebSocket error events for failed forwards

**Solution:** Parse HTTP response and show partial success

**Location:** Forward message action/service

**Implementation:**
```typescript
const forwardMessages = async (
  messageIds: string[],
  conversationIds: string[]
) => {
  try {
    const response = await axios.post('/api/v1/messages/forward', {
      message_ids: messageIds,
      target_conversation_ids: conversationIds,
    });

    const { total_forwarded, failed_forwards } = response.data.data;

    // Calculate expected
    const expected = messageIds.length * conversationIds.length;

    // Check for partial success
    if (total_forwarded < expected) {
      toast.warning(
        `${total_forwarded}/${expected} messages forwarded. Some failed.`
      );

      // Log failures
      if (failed_forwards && failed_forwards.length > 0) {
        console.error('Failed forwards:', failed_forwards);
      }
    } else {
      toast.success(`Successfully forwarded ${total_forwarded} messages`);
    }

    return response.data;
  } catch (error) {
    toast.error('Failed to forward messages');
    throw error;
  }
};
```

---

### 5. Handle WebSocket Reconnection

**Problem:** Missed messages during disconnect

**Solution:** Fetch missed messages after reconnect

**Location:** WebSocket reconnect handler

**Implementation:**
```typescript
socket.on('reconnect', async () => {
  console.log('WebSocket reconnected - fetching missed messages');

  // Get active conversations
  const conversations = getActiveConversations();

  for (const conv of conversations) {
    try {
      const lastTime = conv.last_message_at || conv.updated_at;

      // Fetch messages since disconnect
      const response = await axios.get(
        `/api/v1/conversations/${conv.id}/messages`,
        {
          params: {
            after: lastTime,
            limit: 50,
          },
        }
      );

      const { messages } = response.data.data;

      if (messages.length > 0) {
        // Add missed messages
        addMessagesToConversation(conv.id, messages);

        // Update conversation metadata
        const latestMessage = messages[0]; // Assuming sorted by newest first
        updateConversation(conv.id, {
          last_message: latestMessage.content,
          last_message_at: latestMessage.created_at,
          last_message_type: latestMessage.message_type,
          updated_at: latestMessage.created_at,
        });

        // Calculate unread for missed messages
        const unreadCount = messages.filter(
          (msg) => msg.sender_id !== currentUserId
        ).length;
        if (unreadCount > 0) {
          conv.unread_count = (conv.unread_count || 0) + unreadCount;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch missed messages for ${conv.id}:`, error);
    }
  }

  // Re-sort conversations
  sortConversations();
});
```

---

## 📁 Files to Modify

### 1. WebSocket Event Emitter
**File:** `src/services/websocket/WebSocketEventEmitter.ts`

**Changes:**
- ✅ Add conversation metadata update in `message.new` handler
- ✅ Add unread count calculation
- ✅ Integrate MessageBatcher
- ✅ Add reconnection handler

---

### 2. Conversation Store
**File:** `src/stores/conversationStore.ts` (or equivalent)

**Changes:**
- ✅ Add `updateConversation()` action
- ✅ Add `sortConversations()` action (by updated_at desc)
- ✅ Ensure unread_count is tracked

---

### 3. Message Service
**File:** `src/services/messageService.ts` or forward action

**Changes:**
- ✅ Update `forwardMessages()` to check response
- ✅ Add partial success handling
- ✅ Add error toast notifications

---

### 4. Utilities
**New File:** `src/utils/MessageBatcher.ts`

**Create:**
- ✅ MessageBatcher class
- ✅ Queue management
- ✅ Flush with grouping
- ✅ Export singleton instance

---

## 🧪 Testing Checklist

### Message Forwarding
- [ ] Forward 1 message → Received via WebSocket
- [ ] Forward 10 messages → All received, no UI jank
- [ ] Forward to 3 conversations → All updated
- [ ] Check conversation moves to top
- [ ] Check last_message updated

### Unread Count
- [ ] Receive forwarded message in background conv → Unread +1
- [ ] Receive message in current conv → Unread unchanged
- [ ] Receive own message → Unread unchanged

### Batch Rendering
- [ ] Forward 20 messages → Smooth UI
- [ ] Check messages appear in order
- [ ] Check conversation sorted once (not 20 times)

### Error Handling
- [ ] Forward to unauthorized conv → Partial success shown
- [ ] Network error → Error toast displayed
- [ ] Check HTTP response for failures

### Reconnection
- [ ] Disconnect WebSocket
- [ ] Send messages from other device
- [ ] Reconnect → Missed messages fetched
- [ ] Check no duplicates

### Album Messages
- [ ] Forward album message → All files included
- [ ] Check thumbnails work
- [ ] Check lightbox navigation works

---

## 📊 Implementation Priority

### Phase 1: Critical (Now)
1. ✅ Add conversation metadata update
2. ✅ Add unread count calculation
3. ✅ Update HTTP response checking

### Phase 2: Performance (Next)
4. ✅ Implement MessageBatcher
5. ✅ Test with 10+ message forwards

### Phase 3: Reliability (After)
6. ✅ Add reconnection handler
7. ✅ Test missed message recovery

---

## 🚨 Important Notes

### Do's ✅
- Update conversation metadata on EVERY `message.new` event
- Calculate unread count yourself
- Check HTTP response for partial failures
- Batch render for 10+ messages
- Fetch missed messages after reconnect
- Test album forwards thoroughly

### Don'ts ❌
- Don't wait for `conversation.updated` event (doesn't exist)
- Don't expect `unread_count` in WebSocket event
- Don't expect WebSocket error events
- Don't skip batch rendering (UI will jank)
- Don't rely on WebSocket for missed messages

---

## 🔗 Related Documents

1. **FORWARD_MESSAGES_QA_SUMMARY.md** - Backend answers
2. **FORWARD_MESSAGE_GUIDE.md** - User workflow
3. **FORWARDED_MESSAGE_COMPONENT.md** - Component implementation

---

**Status:** 📝 Plan Complete - Ready for Implementation
**Next:** Start with Phase 1 (Critical changes)
**Created:** 2025-12-02
