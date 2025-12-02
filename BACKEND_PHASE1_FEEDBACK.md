# Feedback: Backend Phase 1 Documentation

**Date:** 2025-01-29
**Reviewed File:** `PHASE_1_CHANGES_FOR_FRONTEND.md`
**Overall Score:** 8/10 (ดีมาก แต่ยังขาดข้อมูลบางส่วน)

---

## ✅ สิ่งที่ดีมากและครบถ้วนแล้ว

1. ✅ **API Documentation ชัดเจน**
   - Old vs New comparison
   - Request/Response examples พร้อม JSON
   - Field names ครบถ้วน

2. ✅ **Code Examples เยอะและครอบคลุม**
   - JavaScript examples
   - React Hook examples
   - React Component examples
   - Migration guide (Old → New)

3. ✅ **คำอธิบายดี**
   - Cursor vs Offset comparison
   - Advantages/Disadvantages
   - Use cases ชัดเจน

4. ✅ **Testing Checklist & FAQs**

---

## ⚠️ สิ่งที่ขาดและต้องการเพิ่ม

### 🔴 Priority 1: Critical (ต้องมี)

#### 1. Error Response Formats

**ปัญหา:** ไม่มีตัวอย่าง error responses → Frontend ไม่รู้จะ handle errors ยังไง

**ต้องการ:**

```markdown
## 🚨 Error Responses

### Search Messages API Errors

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized: Invalid or expired token"
}
```

**400 Bad Request - Missing Query:**
```json
{
  "success": false,
  "message": "Search query (q) is required"
}
```

**400 Bad Request - Invalid Cursor:**
```json
{
  "success": false,
  "message": "Invalid cursor format"
}
```

**403 Forbidden - Not a Member:**
```json
{
  "success": false,
  "message": "User is not a member of this conversation"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Database error"
}
```

### Mentions API Errors

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to get mentions: database error"
}
```
```

---

#### 2. TypeScript Type Definitions

**ปัญหา:** Frontend ใช้ TypeScript แต่ไม่มี type definitions → ต้อง guess types เอง

**ต้องการ:**

```typescript
## 📘 TypeScript Definitions

### Search Messages

```typescript
// Request Parameters
interface SearchMessagesParams {
  q: string;
  conversation_id?: string;
  limit?: number;
  cursor?: string;
  direction?: 'before' | 'after';
}

// Response
interface SearchMessagesResponse {
  success: boolean;
  data: {
    messages: Message[];
    cursor: string | null;
    has_more: boolean;
    query: string;
  };
}

// Error Response
interface ErrorResponse {
  success: false;
  message: string;
}
```

### Mentions

```typescript
interface GetMentionsParams {
  limit?: number;
  cursor?: string;
  direction?: 'before' | 'after';
}

interface GetMentionsResponse {
  success: boolean;
  data: {
    mentions: Mention[];
    cursor: string | null;
    has_more: boolean;
  };
}

interface Mention {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  start_index: number | null;
  length: number | null;
  created_at: string;
  message: MentionMessage;
  mentioned_user: User;
}

interface MentionMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender: User;
  conversation: Conversation;
}

interface User {
  id: string;
  username: string;
  display_name: string;
  profile_image_url?: string;
}

interface Conversation {
  id: string;
  title: string;
  type: 'private' | 'group';
  icon_url?: string;
}
```

### Complete Message Object

```typescript
interface Message {
  // Core fields
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  content_type: 'text' | 'image' | 'file' | 'sticker';

  // Timestamps
  created_at: string; // ISO 8601 format
  updated_at: string;

  // Status flags
  is_deleted: boolean;
  is_edited: boolean;

  // Optional fields
  reply_to_message_id?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;

  // Metadata
  metadata?: {
    mentions?: MentionMetadata[];
    [key: string]: any;
  };

  // Preloaded relations (ถ้ามี)
  sender?: User;
  conversation?: Conversation;
  reply_to?: Message;
}

interface MentionMetadata {
  user_id: string;
  username: string;
  start_index: number;
  length: number;
}
```
```

---

#### 3. Sending Messages with Mentions

**ปัญหา:** มีข้อมูล GET /mentions แต่ไม่มีตัวอย่างการ **ส่งข้อความที่มี mentions**

**ต้องการ:**

```markdown
## 📤 Sending Messages with Mentions

### API Endpoint
```http
POST /api/v1/conversations/{conversationId}/messages/text
```

### Request Headers
```
Content-Type: application/json
Authorization: Bearer {access_token}
```

### Request Body
```json
{
  "content": "Hey @john, check this out!",
  "metadata": {
    "mentions": [
      {
        "user_id": "user-uuid-here",
        "username": "john",
        "start_index": 4,
        "length": 5
      }
    ]
  }
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | Message text content |
| `metadata.mentions` | array | No | Array of user mentions |
| `metadata.mentions[].user_id` | string (UUID) | Yes | ID of mentioned user |
| `metadata.mentions[].username` | string | Yes | Username of mentioned user |
| `metadata.mentions[].start_index` | number | Yes | Character position where mention starts |
| `metadata.mentions[].length` | number | Yes | Length of mention text (including @) |

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "message-uuid",
    "conversation_id": "conv-uuid",
    "sender_id": "your-user-id",
    "content": "Hey @john, check this out!",
    "metadata": {
      "mentions": [
        {
          "user_id": "user-uuid-here",
          "username": "john",
          "start_index": 4,
          "length": 5
        }
      ]
    },
    "created_at": "2025-01-29T10:00:00Z"
  }
}
```

### What Happens Automatically?

1. ✅ Backend saves message to `messages` table
2. ✅ Backend saves each mention to `message_mentions` table
3. ✅ Backend sends notification to mentioned users
4. ✅ Mentioned users receive WebSocket event (if online)

### Frontend Example

```javascript
const sendMessageWithMentions = async (conversationId, content, mentions) => {
  const response = await fetch(
    `/api/v1/conversations/${conversationId}/messages/text`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        content,
        metadata: {
          mentions: mentions.map(m => ({
            user_id: m.userId,
            username: m.username,
            start_index: m.startIndex,
            length: m.length
          }))
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json();
};

// Usage Example
await sendMessageWithMentions(
  'conversation-uuid',
  'Hey @john, check this out!',
  [
    {
      userId: 'user-uuid',
      username: 'john',
      startIndex: 4,
      length: 5
    }
  ]
);
```

### Validation Rules

- ✅ Mentioned user must be a member of the conversation
- ✅ `start_index` must be within content length
- ✅ `length` must be positive
- ✅ User cannot mention themselves (optional - clarify?)
- ✅ Maximum mentions per message? (clarify if there's a limit)
```

---

### 🟡 Priority 2: Recommended (ควรมี)

#### 4. WebSocket Events

**ปัญหา:** ไม่รู้ว่ามี real-time notifications หรือไม่ และ format ยังไง

**ต้องการ:**

```markdown
## 🔔 Real-time Updates (WebSocket)

### Does Backend Send Real-time Mention Notifications?

**Answer:** [Yes/No - please confirm]

### If Yes, what's the event format?

#### Event: New Mention Notification

**Event Name:** `message:mention` (or what?)

**When Triggered:**
- When someone mentions you in a message

**Payload:**
```json
{
  "event": "message:mention",
  "data": {
    "mention_id": "mention-uuid",
    "message_id": "message-uuid",
    "conversation_id": "conv-uuid",
    "sender": {
      "id": "sender-uuid",
      "username": "alice",
      "display_name": "Alice"
    },
    "message_preview": "Hey @john, check this out!",
    "created_at": "2025-01-29T10:00:00Z"
  }
}
```

### Frontend Handler Example

```javascript
// Subscribe to mention events
websocket.on('message:mention', (payload) => {
  const data = payload.data;

  // Show browser notification
  showNotification({
    title: `${data.sender.display_name} mentioned you`,
    body: data.message_preview,
    onClick: () => {
      navigateTo(`/conversations/${data.conversation_id}?target=${data.message_id}`);
    }
  });

  // Update mentions count badge
  updateMentionsCount();

  // Refresh mentions list (if on mentions page)
  if (currentPage === '/mentions') {
    queryClient.invalidateQueries(['mentions']);
  }
});
```

### Questions:
1. What's the exact event name?
2. Is the payload format correct?
3. Do we receive this even if we're in the conversation?
4. Is there a separate event for "unread mentions count"?
```

---

#### 5. Search Result Highlighting

**ปัญหา:** ไม่รู้ว่า Backend ส่ง highlighted/matched text มาหรือไม่

**ต้องการ:**

```markdown
## 🎨 Search Result Text Highlighting

### Question: Does Backend Send Highlighted/Matched Text?

**Option A:** Backend sends highlighted snippet
```json
{
  "messages": [
    {
      "id": "uuid",
      "content": "Hello world, this is a test message about world peace",
      "matched_snippet": "...Hello <mark>world</mark>... about <mark>world</mark> peace...",
      "match_count": 2
    }
  ]
}
```

**Option B:** Frontend highlights manually
```javascript
// If backend doesn't provide highlighting, frontend does it
function highlightSearchQuery(text, query) {
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Usage
const highlighted = highlightSearchQuery(message.content, searchQuery);
```

### Current Answer: [Please specify which option]

### If Option A, what's the exact field name?
- `matched_snippet`?
- `highlighted_content`?
- `matched_text`?

### If Option B, we'll implement highlighting on frontend ✅
```

---

#### 6. Pagination Direction Examples

**ปัญหา:** มีอธิบาย `direction` แต่ไม่มีตัวอย่างชัดเจนว่าใช้เมื่อไหร่

**ต้องการ:**

```markdown
## 🔄 Pagination Direction - Detailed Use Cases

### Scenario 1: Initial Load (No Cursor)
**Goal:** Get latest/recent search results

```javascript
const results = await searchMessages('hello');
// Returns: 20 most recent matching messages
// cursor = ID of oldest message in results
// has_more = true if there are older messages
```

**UI:** Display results, show "Load More" if `has_more === true`

---

### Scenario 2: Load Older Results (direction="before")
**Goal:** User clicks "Load More" or scrolls to bottom

```javascript
// User wants to see older messages
const moreResults = await searchMessages(
  'hello',
  null,
  previousResults.cursor, // Use cursor from previous response
  'before'
);

// Append to existing results
setMessages([...messages, ...moreResults.messages]);
```

**UI:** Infinite scroll down, "Load More" button at bottom

---

### Scenario 3: Load Newer Results (direction="after")
**Goal:** User scrolled to top and wants newer messages (rare)

```javascript
// User wants to see newer messages
const newerResults = await searchMessages(
  'hello',
  null,
  firstMessageCursor, // Cursor of first/newest message
  'after'
);

// Prepend to existing results
setMessages([...newerResults.messages, ...messages]);
```

**UI:** Bidirectional scroll, "Load Newer" button at top

---

### Most Common Pattern: Scroll Down Only

```javascript
import { useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';

function SearchResults({ query }) {
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // Initial load
  useEffect(() => {
    loadInitial();
  }, [query]);

  const loadInitial = async () => {
    const result = await searchMessages(query);
    setMessages(result.messages);
    setCursor(result.nextCursor);
    setHasMore(result.hasMore);
  };

  const loadMore = async () => {
    if (!hasMore) return;

    const result = await searchMessages(query, null, cursor, 'before');
    setMessages([...messages, ...result.messages]);
    setCursor(result.nextCursor);
    setHasMore(result.hasMore);
  };

  return (
    <InfiniteScroll
      dataLength={messages.length}
      next={loadMore}
      hasMore={hasMore}
      loader={<Spinner />}
    >
      {messages.map(msg => <MessageItem key={msg.id} message={msg} />)}
    </InfiniteScroll>
  );
}
```

---

### When to Use Each Direction?

| Direction | Use Case | Common? | Example |
|-----------|----------|---------|---------|
| **No direction (initial)** | First load | ✅ Very common | User starts search |
| **`before`** | Load older | ✅ Very common | Scroll down, "Load More" |
| **`after`** | Load newer | ⚠️ Rare | Bidirectional scroll |

**Recommendation:** Most apps only need initial + `before` (scroll down)
```

---

### 🟢 Priority 3: Nice to Have (ไม่จำเป็น แต่ดีถ้ามี)

#### 7. Rate Limiting

**ต้องการ:**
```markdown
## ⚡ Rate Limiting

### Search Messages
- Limit: X requests per minute per user
- Response if exceeded: 429 Too Many Requests

### Mentions
- Limit: X requests per minute per user
```

---

#### 8. Performance Metrics

**ต้องการ:**
```markdown
## 📊 Expected Performance

### Search Messages
- Average response time: < 100ms
- Max response time: < 500ms
- Works well up to: 1M+ messages

### Mentions
- Average response time: < 50ms
- Max response time: < 200ms
```

---

#### 9. Troubleshooting Section

**ต้องการ:**
```markdown
## 🔧 Troubleshooting

### Search returns no results but I know the message exists
- Check: Is the user a member of that conversation?
- Check: Is the message deleted?
- Check: Is full-text search index up to date?

### Cursor pagination shows duplicate messages
- This shouldn't happen with cursor-based! If it does, it's a bug.
- Report to backend team with cursor value and query.

### Mentions not showing up
- Check: Was message sent with correct metadata format?
- Check: Is mentioned user a member of the conversation?
- Check: Check browser console for errors
```

---

## 📋 Summary Checklist for Backend Team

### 🔴 Must Add (Critical)
- [ ] Error response formats for all endpoints
- [ ] TypeScript type definitions
- [ ] Complete "Send message with mentions" documentation
- [ ] Complete Message object field list

### 🟡 Should Add (Recommended)
- [ ] WebSocket event formats (if applicable)
- [ ] Search result highlighting approach
- [ ] Detailed pagination direction examples

### 🟢 Nice to Have
- [ ] Rate limiting info
- [ ] Performance metrics
- [ ] Troubleshooting guide

---

## 🎯 Questions for Backend Team

1. **Error Responses:**
   - What are all possible error status codes?
   - What's the error response format?

2. **Sending Mentions:**
   - Is the `metadata.mentions` format correct?
   - Are there validation rules? (max mentions, self-mention allowed?)
   - What fields are required?

3. **WebSocket Events:**
   - Do you send real-time mention notifications?
   - What's the event name and payload format?

4. **Search Highlighting:**
   - Does backend send highlighted/matched text?
   - Or should frontend implement highlighting?

5. **Message Fields:**
   - What's the complete list of Message fields?
   - Which fields are always present vs optional?
   - Which relations are preloaded?

6. **Pagination:**
   - Is there a maximum `limit` value?
   - What happens if cursor is invalid/expired?

---

## ✅ What's Already Great

- ✅ Clear API documentation
- ✅ Excellent code examples
- ✅ Good migration guide (Old → New)
- ✅ Useful FAQs
- ✅ Testing checklist

**Keep up the good work!** Just need these additional details to make it 100% complete. 🚀

---

**Created:** 2025-01-29
**Frontend Team**
**Status:** Waiting for backend team to add missing info
