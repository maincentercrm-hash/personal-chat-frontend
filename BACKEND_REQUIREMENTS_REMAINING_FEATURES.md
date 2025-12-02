# Backend Requirements - Remaining Features

**สรุปจากไฟล์:** `Problem_today/08_low_feature_requests.md`
**วันที่สร้าง:** 2025-01-29

---

## 📊 สถานะงาน

### ✅ ทำเสร็จแล้ว (Complete)
- #18 - Dark/Light Theme (Frontend only - ไม่ต้อง Backend)
- #12 - Pin Conversations
- #12 - Pin Messages

### 🔧 ยังไม่ได้ทำ (Pending Backend Implementation)

---

## Phase 2: Search & Navigation (สำคัญ - แนะนำทำก่อน)

### #16: ค้นหาข้อความ (Search Messages)

**Priority:** ⭐⭐⭐ สูง (ใช้งานบ่อย)
**Estimated Time:** 3-4 ชั่วโมง
**Backend:** Supabase

#### 📌 แนะนำ: ใช้ Cursor-based Pagination (เหมือน Message List)

**เหตุผล:**
- ✅ **Consistent** กับ message list ปกติ (ที่ใช้ Virtual scroll)
- ✅ **Performance ดีกว่า** offset-based สำหรับ real-time data
- ✅ **ไม่เกิด duplicates** เมื่อมี message ใหม่เข้ามาระหว่างค้นหา
- ✅ **รองรับ infinite scroll** ได้ง่าย

---

### 📌 Cursor-based Pagination (แนะนำ ⭐)

**API Endpoint:**
```typescript
GET /api/v1/messages/search
```

**Query Parameters:**
```typescript
{
  q: string;                    // Search query (required)
  conversationId?: string;      // Optional: ค้นหาในแชทเฉพาะ
  limit?: number;               // Default: 20
  cursor?: string;              // Cursor สำหรับ page ถัดไป (message_id หรือ timestamp)
  direction?: 'before' | 'after'; // Default: 'before'
}
```

**Response:**
```typescript
{
  results: Array<{
    message: {
      id: string;
      content: string;
      sender_id: string;
      conversation_id: string;
      created_at: string;
      // ... message fields อื่นๆ
    };
    conversation: {
      id: string;
      title: string;
      icon_url?: string;
    };
    matchedText: string;        // Highlighted match snippet
  }>;
  nextCursor: string | null;    // Cursor สำหรับหน้าถัดไป (null = หมดแล้ว)
  hasMore: boolean;             // มีอีกไหม
}
```

**Cursor Format Options:**
1. **Message ID** (แนะนำ - ง่าย): `"msg_abc123"`
2. **Timestamp** (แม่นยำกว่า): `"2024-01-29T10:30:00.000Z"`
3. **Combined** (ดีที่สุด): `"2024-01-29T10:30:00.000Z_msg_abc123"`

---

### 📌 Simple Limit (ถ้าไม่อยากทำ Pagination)

**เหมาะกับ:** Quick implementation, ยอมให้ผลลัพธ์จำกัด

**API Endpoint:**
```typescript
GET /api/v1/messages/search
```

**Query Parameters:**
```typescript
{
  q: string;                    // Search query (required)
  conversationId?: string;      // Optional: ค้นหาในแชทเฉพาะ
  limit?: number;               // Default: 50, Max: 100
}
```

**Response:**
```typescript
{
  results: Array<{
    message: Message;
    conversation: Conversation;
    matchedText: string;
  }>;
  count: number;                // จำนวนที่แสดง
  isLimited: boolean;           // true ถ้ามีมากกว่า limit
}
```

**หมายเหตุ:** ถ้าเจอมากกว่า limit จะแสดงแค่ N รายการแรก + แจ้ง user ว่า "เจอมากกว่านี้ กรุณาพิมพ์คำค้นหาให้เฉพาะเจาะจงขึ้น"

---

## 🎯 Cursor-based vs Simple:

| Aspect | Cursor-based | Simple Limit |
|--------|-------------|--------------|
| **Consistency** | ✅ เหมือนกับ message list | ⚠️ แตกต่าง |
| **UX** | ✅ Infinite scroll | ⚠️ จำกัด results |
| **Performance** | ✅ ดีกว่า (ไม่มี offset) | ⚠️ พอใช้ |
| **Duplicates** | ✅ ไม่มี | ⚠️ อาจเกิด (ถ้ามี insert ใหม่) |
| **Dev Time** | 🟡 2-3 ชม. | 🟢 1-2 ชม. |

**แนะนำ:** ใช้ **Cursor-based** เพราะ backend ใช้อยู่แล้วสำหรับ message list

---

## 💻 Implementation สำหรับ Supabase

### Cursor-based Pagination (Supabase Code)

```typescript
// Backend API Route (Next.js API / Express)
export async function searchMessages(req, res) {
  const {
    q,
    conversationId,
    limit = 20,
    cursor,              // cursor = message_id or timestamp
    direction = 'before' // 'before' = older, 'after' = newer
  } = req.query;
  const userId = req.user.id; // จาก JWT auth

  // 1. หา conversations ที่ user เป็นสมาชิก
  const { data: memberConversations } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId);

  const conversationIds = memberConversations.map(m => m.conversation_id);

  // 2. Build search query
  let query = supabase
    .from('messages')
    .select(`
      *,
      conversation:conversations(id, title, icon_url),
      sender:users(id, display_name, profile_image_url)
    `)
    .ilike('content', `%${q}%`)
    .in('conversation_id', conversationIds);

  // Filter by conversation ถ้ามี
  if (conversationId) {
    query = query.eq('conversation_id', conversationId);
  }

  // 3. Apply cursor (ถ้ามี)
  if (cursor) {
    // Option A: Cursor = message_id (ง่าย)
    if (direction === 'before') {
      query = query.lt('id', cursor);
    } else {
      query = query.gt('id', cursor);
    }

    // Option B: Cursor = timestamp (แม่นยำกว่า)
    // const cursorDate = new Date(cursor);
    // if (direction === 'before') {
    //   query = query.lt('created_at', cursorDate.toISOString());
    // } else {
    //   query = query.gt('created_at', cursorDate.toISOString());
    // }
  }

  // 4. Execute query with limit + 1 (เพื่อเช็ค hasMore)
  const { data, error } = await query
    .order('created_at', { ascending: direction === 'after' })
    .limit(parseInt(limit) + 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // 5. Check hasMore และสร้าง nextCursor
  const hasMore = data.length > limit;
  const results = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  // หรือถ้าใช้ timestamp:
  // const nextCursor = hasMore ? results[results.length - 1].created_at : null;

  return res.json({
    results: results.map(msg => ({
      message: msg,
      conversation: msg.conversation,
      matchedText: extractMatchedText(msg.content, q),
    })),
    nextCursor,
    hasMore,
  });
}

// Helper: สร้าง highlighted snippet
function extractMatchedText(content: string, query: string): string {
  const index = content.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return content.substring(0, 100);

  const start = Math.max(0, index - 30);
  const end = Math.min(content.length, index + query.length + 30);
  return '...' + content.substring(start, end) + '...';
}
```

**Frontend จะเรียกแบบนี้:**
```typescript
// First page
const response = await fetch('/api/messages/search?q=hello&limit=20');
// { results: [...], nextCursor: "msg_123", hasMore: true }

// Load more (next page)
const response2 = await fetch('/api/messages/search?q=hello&limit=20&cursor=msg_123');
// { results: [...], nextCursor: "msg_456", hasMore: true }
```

---

### Simple Limit (Supabase Code)

```typescript
// Backend API Route (ง่ายกว่า)
export async function searchMessages(req, res) {
  const { q, conversationId, limit = 50 } = req.query;
  const userId = req.user.id;

  // 1. หา conversations ที่ user เป็นสมาชิก
  const { data: memberConversations } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId);

  const conversationIds = memberConversations.map(m => m.conversation_id);

  // 2. Search messages (max limit + 1 เพื่อเช็คว่ามีเกิน)
  let query = supabase
    .from('messages')
    .select(`
      *,
      conversation:conversations(id, title, icon_url)
    `)
    .ilike('content', `%${q}%`)
    .in('conversation_id', conversationIds);

  if (conversationId) {
    query = query.eq('conversation_id', conversationId);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(parseInt(limit) + 1); // เอา +1 เพื่อเช็คว่ามีเกิน

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const isLimited = data.length > limit;
  const results = data.slice(0, limit); // เอาแค่ limit จริงๆ

  return res.json({
    results: results.map(msg => ({
      message: msg,
      conversation: msg.conversation,
      matchedText: extractMatchedText(msg.content, q),
    })),
    count: results.length,
    isLimited,
  });
}
```

---

### 🔍 Full-Text Search ใน Supabase (Advanced)

ถ้าต้องการ performance ดีกว่า ใช้ PostgreSQL Full-Text Search:

```typescript
// ใช้ textSearch แทน ilike
const { data } = await supabase
  .from('messages')
  .select('*')
  .textSearch('content', query, {
    type: 'websearch', // หรือ 'plain', 'phrase'
    config: 'english'  // หรือ 'thai' ถ้า Supabase รองรับ
  });
```

**หมายเหตุ:** ต้องสร้าง Full-Text Search index ก่อน:
```sql
-- Run ใน Supabase SQL Editor
CREATE INDEX messages_content_search_idx
ON messages
USING GIN (to_tsvector('english', content));
```

---

### 🔒 Security (สำคัญมาก!)

```typescript
// ✅ ถูกต้อง: Filter เฉพาะ conversations ที่ user เป็นสมาชิก
const { data: memberConversations } = await supabase
  .from('conversation_members')
  .select('conversation_id')
  .eq('user_id', userId);

// ❌ ผิด: Search ทุก conversation (ไม่ปลอดภัย)
const { data } = await supabase
  .from('messages')
  .select('*')
  .ilike('content', `%${q}%`); // ❌ เห็นข้อความของคนอื่นด้วย!
```

---

### ⚡ Performance Tips

1. **Index บน content:**
   ```sql
   -- Run ใน Supabase SQL Editor
   CREATE INDEX idx_messages_content ON messages(content);
   ```

2. **Limit max results:**
   - ไม่ควรให้ค้นหาเกิน 100 รายการต่อครั้ง
   - บังคับ max limit

3. **Cache popular queries** (ถ้าต้องการ):
   - ใช้ Redis cache ผลลัพธ์ที่ค้นบ่อย
   - TTL 5-10 นาที

---

### #20: เลือกวันที่ได้ (Jump to Date)

**Priority:** ⭐⭐ ปานกลาง (Nice to have)
**Estimated Time:** 1 ชั่วโมง

#### Backend ต้องทำ:

**1. API Endpoint:**
```typescript
GET /api/v1/conversations/:conversationId/messages/by-date
```

**Query Parameters:**
```typescript
{
  date: string;        // YYYY-MM-DD format
  limit?: number;      // Default: 50
}
```

**Response:**
```typescript
{
  messages: Message[];
  hasMore: boolean;
  date: string;
  firstMessageId: string;  // ID ของข้อความแรกในวันนั้น
}
```

**Implementation:**
```sql
SELECT *
FROM messages
WHERE conversation_id = $conversationId
  AND DATE(created_at) = $date
ORDER BY created_at ASC
LIMIT $limit;
```

**Security:**
- ✅ Verify user เป็นสมาชิกของ conversation

---

## Phase 3: Advanced Features

### #17: ส่งต่อข้อความ (Forward Messages)

**Priority:** ⭐⭐⭐ สูง (มีประโยชน์)
**Estimated Time:** 2-3 ชั่วโมง

#### Backend ต้องทำ:

**1. API Endpoint:**
```typescript
POST /api/v1/messages/forward
```

**Request Body:**
```typescript
{
  messageIds: string[];              // ข้อความที่จะ forward (1 หรือหลายข้อความ)
  targetConversationIds: string[];   // Conversations ที่จะส่งไป
}
```

**Response:**
```typescript
{
  success: boolean;
  forwardedCount: number;
  failed: Array<{
    conversationId: string;
    reason: string;
  }>;
  newMessageIds: string[];  // IDs ของข้อความใหม่ที่ถูกสร้าง
}
```

**2. Database Schema Update:**

เพิ่มฟิลด์ใน `messages` table:
```sql
ALTER TABLE messages ADD COLUMN is_forwarded BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN forwarded_from_message_id VARCHAR(36);
ALTER TABLE messages ADD COLUMN forwarded_from_user_id VARCHAR(36);
```

หรือสร้าง JSON field:
```typescript
{
  isForwarded: boolean;
  forwardedFrom?: {
    messageId: string;
    senderId: string;
    senderName: string;
    conversationId: string;
  }
}
```

**3. Business Logic:**

```typescript
async function forwardMessages(
  userId: string,
  messageIds: string[],
  targetConversationIds: string[]
) {
  // 1. ตรวจสอบ permissions
  for (const msgId of messageIds) {
    const message = await getMessageById(msgId);
    const canView = await userCanAccessConversation(userId, message.conversationId);
    if (!canView) throw new Error('Unauthorized');
  }

  // 2. ตรวจสอบว่า user เป็นสมาชิกของ target conversations
  for (const convId of targetConversationIds) {
    const isMember = await isConversationMember(userId, convId);
    if (!isMember) throw new Error('Not a member');
  }

  // 3. สร้างข้อความใหม่ในแต่ละ target conversation
  const newMessages = [];
  for (const msgId of messageIds) {
    const originalMessage = await getMessageById(msgId);

    for (const targetConvId of targetConversationIds) {
      const newMessage = await createMessage({
        conversationId: targetConvId,
        senderId: userId,  // คนที่ forward เป็นผู้ส่ง
        content: originalMessage.content,
        contentType: originalMessage.contentType,
        file_url: originalMessage.file_url,
        isForwarded: true,
        forwardedFrom: {
          messageId: originalMessage.id,
          senderId: originalMessage.sender_id,
          conversationId: originalMessage.conversation_id,
        }
      });

      newMessages.push(newMessage);
    }
  }

  // 4. ส่ง WebSocket events
  for (const msg of newMessages) {
    broadcastToConversation(msg.conversationId, 'message:new', msg);
  }

  return newMessages;
}
```

**4. WebSocket Event:**
```typescript
// ส่ง event เหมือน message ปกติ แต่มี flag isForwarded
{
  event: 'message:new',
  data: {
    id: 'new_msg_id',
    content: 'Original content',
    isForwarded: true,
    forwardedFrom: {
      messageId: 'original_msg_id',
      senderId: 'original_sender_id',
      senderName: 'John Doe'
    }
  }
}
```

**Security Checks:**
- ✅ User ต้องมีสิทธิ์อ่านข้อความต้นฉบับ
- ✅ User ต้องเป็นสมาชิกของ target conversations
- ✅ ไม่อนุญาตให้ forward ข้อความที่ถูกลบแล้ว
- ⚠️ พิจารณา: จำกัดจำนวน forward ต่อครั้ง (เช่น max 10 messages, max 5 conversations)

---

### #8: แท็ค @ (Mention/Tag Users)

**Priority:** ⭐⭐⭐ สูง (มีประโยชน์มาก)
**Estimated Time:** 3-4 ชั่วโมง

#### Backend ต้องทำ:

**1. Database Schema Update:**

เพิ่มฟิลด์ใน `messages` table หรือสร้าง table แยก:

**Option 1: JSON field (แนะนำ - ง่ายกว่า)**
```sql
ALTER TABLE messages ADD COLUMN mentions JSONB;
```

```typescript
{
  mentions: Array<{
    userId: string;
    username: string;
    startIndex: number;
    length: number;
  }>
}
```

**Option 2: Separate table (ดีกว่าถ้าต้อง query ซับซ้อน)**
```sql
CREATE TABLE message_mentions (
  id VARCHAR(36) PRIMARY KEY,
  message_id VARCHAR(36) NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  start_index INT NOT NULL,
  length INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_mentions (user_id, created_at)
);
```

**2. API Endpoints:**

**ส่งข้อความพร้อม mentions:**
```typescript
POST /api/v1/conversations/:conversationId/messages/text

Body: {
  content: "Hey @john, check this out!",
  mentions: [
    {
      userId: "user_123",
      username: "john",
      startIndex: 4,
      length: 5
    }
  ]
}
```

**ดึงข้อความที่ mention user:**
```typescript
GET /api/v1/users/me/mentions

Query: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

Response: {
  mentions: Array<{
    message: Message;
    conversation: Conversation;
    mentionedAt: Date;
    isRead: boolean;
  }>;
  total: number;
  unreadCount: number;
}
```

**3. Notification System:**

เมื่อมีคนถูก mention:

```typescript
async function handleMention(messageId: string, mentions: Mention[]) {
  const message = await getMessageById(messageId);

  for (const mention of mentions) {
    // 1. สร้าง notification
    await createNotification({
      userId: mention.userId,
      type: 'mention',
      messageId: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
    });

    // 2. ส่ง WebSocket event
    sendToUser(mention.userId, {
      event: 'notification:mention',
      data: {
        message,
        mentionedBy: await getUserById(message.senderId),
      }
    });

    // 3. ส่ง Push Notification (ถ้ามี)
    await sendPushNotification(mention.userId, {
      title: `${senderName} mentioned you`,
      body: message.content,
      conversationId: message.conversationId,
      messageId: message.id,
    });
  }
}
```

**4. Validation:**

```typescript
async function validateMentions(
  conversationId: string,
  mentions: Mention[]
): Promise<boolean> {
  // 1. ตรวจสอบว่าทุกคนที่ถูก mention เป็นสมาชิกของกลุ่ม
  const memberIds = await getConversationMemberIds(conversationId);

  for (const mention of mentions) {
    if (!memberIds.includes(mention.userId)) {
      throw new Error(`User ${mention.userId} is not a member`);
    }
  }

  // 2. ตรวจสอบว่า startIndex และ length ถูกต้อง
  // (อยู่ในขอบเขตของ content)

  return true;
}
```

**Security Checks:**
- ✅ User ที่ถูก mention ต้องเป็นสมาชิกของ conversation
- ✅ Validate startIndex และ length
- ✅ จำกัดจำนวน mentions ต่อข้อความ (เช่น max 20 คน)

---

## Phase 4: Nice to Have (ลำดับความสำคัญต่ำ)

### #19: ตั้งเวลาส่งข้อความ (Scheduled Messages)

**Priority:** ⭐ ต่ำ (Nice to have)
**Estimated Time:** 4-5 ชั่วโมง

#### Backend ต้องทำ:

**1. Database Schema:**

```sql
CREATE TABLE scheduled_messages (
  id VARCHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(36) NOT NULL REFERENCES conversations(id),
  sender_id VARCHAR(36) NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'text',
  file_url TEXT,
  scheduled_at TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, sent, cancelled, failed
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scheduled_time (scheduled_at, status),
  INDEX idx_sender (sender_id, status)
);
```

**2. API Endpoints:**

**สร้างข้อความตั้งเวลา:**
```typescript
POST /api/v1/messages/schedule

Body: {
  conversationId: string;
  content: string;
  contentType?: 'text' | 'image' | 'file';
  fileUrl?: string;
  scheduledAt: string;  // ISO 8601 format
}

Response: {
  id: string;
  scheduledAt: string;
  status: 'pending';
}
```

**ดูรายการข้อความตั้งเวลา:**
```typescript
GET /api/v1/messages/scheduled

Query: {
  status?: 'pending' | 'sent' | 'cancelled';
  limit?: number;
}

Response: {
  scheduledMessages: Array<{
    id: string;
    conversationId: string;
    content: string;
    scheduledAt: string;
    status: string;
  }>;
}
```

**ยกเลิกข้อความตั้งเวลา:**
```typescript
DELETE /api/v1/messages/scheduled/:id
```

**3. Background Job / Cron:**

**Option 1: Node-cron (Simple)**
```typescript
import cron from 'node-cron';

// ทำงานทุก 1 นาที
cron.schedule('* * * * *', async () => {
  const now = new Date();

  const pendingMessages = await db.query(`
    SELECT * FROM scheduled_messages
    WHERE status = 'pending'
      AND scheduled_at <= $1
    LIMIT 100
  `, [now]);

  for (const scheduled of pendingMessages) {
    try {
      // สร้างข้อความจริง
      const message = await createMessage({
        conversationId: scheduled.conversation_id,
        senderId: scheduled.sender_id,
        content: scheduled.content,
        contentType: scheduled.content_type,
        fileUrl: scheduled.file_url,
      });

      // อัปเดตสถานะ
      await db.query(`
        UPDATE scheduled_messages
        SET status = 'sent', sent_at = NOW()
        WHERE id = $1
      `, [scheduled.id]);

      // ส่ง WebSocket
      broadcastToConversation(scheduled.conversation_id, 'message:new', message);

    } catch (error) {
      await db.query(`
        UPDATE scheduled_messages
        SET status = 'failed', error_message = $1
        WHERE id = $2
      `, [error.message, scheduled.id]);
    }
  }
});
```

**Option 2: Bull Queue (Production - แนะนำ)**
```typescript
import Bull from 'bull';

const scheduledMessageQueue = new Bull('scheduled-messages', {
  redis: process.env.REDIS_URL
});

// เมื่อสร้าง scheduled message
async function scheduleMessage(data) {
  const delay = new Date(data.scheduledAt).getTime() - Date.now();

  await scheduledMessageQueue.add(
    { scheduledMessageId: data.id },
    { delay }
  );
}

// Worker
scheduledMessageQueue.process(async (job) => {
  const { scheduledMessageId } = job.data;
  const scheduled = await getScheduledMessage(scheduledMessageId);

  if (scheduled.status !== 'pending') {
    return; // Already sent or cancelled
  }

  // สร้างข้อความ
  const message = await createMessage({ ... });

  // อัปเดตสถานะ
  await updateScheduledMessage(scheduledMessageId, {
    status: 'sent',
    sentAt: new Date()
  });
});
```

**4. Validation:**
- ✅ scheduledAt ต้องเป็นอนาคต (ไม่ใช่อดีต)
- ✅ User ต้องเป็นสมาชิกของ conversation
- ✅ จำกัดระยะเวลาล่วงหน้า (เช่น max 30 วัน)

**Security:**
- ✅ เฉพาะ sender เท่านั้นที่ยกเลิก scheduled message ของตัวเองได้

---

### #21: สมุดบันทึกส่วนตัว (Notes App)

**Priority:** ⭐ ต่ำ (Feature แยก - ไม่เกี่ยวกับ chat)
**Estimated Time:** 5-6 ชั่วโมง

#### Backend ต้องทำ:

**1. Database Schema:**

```sql
CREATE TABLE notes (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT,
  tags JSONB,  -- ['work', 'personal', 'ideas']
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_notes (user_id, created_at DESC),
  INDEX idx_user_pinned (user_id, is_pinned, created_at DESC)
);
```

**2. API Endpoints:**

```typescript
// สร้าง note
POST /api/v1/notes
Body: {
  title?: string;
  content: string;
  tags?: string[];
}

// ดึง notes ทั้งหมด
GET /api/v1/notes
Query: {
  limit?: number;
  offset?: number;
  tag?: string;  // Filter by tag
}

// อัปเดต note
PUT /api/v1/notes/:id
Body: {
  title?: string;
  content?: string;
  tags?: string[];
}

// ลบ note
DELETE /api/v1/notes/:id

// Pin/Unpin note
PUT /api/v1/notes/:id/pin
DELETE /api/v1/notes/:id/pin
```

**3. Features (Optional):**
- Search notes
- Rich text editor support
- Attachments
- Sharing notes

**Security:**
- ✅ User เห็นเฉพาะ notes ของตัวเอง
- ✅ Validate ownership ก่อนทุกการแก้ไข/ลบ

---

## 📊 สรุปลำดับความสำคัญ

| Feature | Priority | Backend Work | Estimated Time |
|---------|----------|--------------|----------------|
| **#16 - Search Messages** | ⭐⭐⭐ สูง | Full-text search, API | 3-4 ชม. |
| **#17 - Forward Messages** | ⭐⭐⭐ สูง | API, Schema update | 2-3 ชม. |
| **#8 - Mentions** | ⭐⭐⭐ สูง | Schema, API, Notifications | 3-4 ชม. |
| **#20 - Jump to Date** | ⭐⭐ ปานกลาง | Simple API | 1 ชม. |
| **#19 - Scheduled Messages** | ⭐ ต่ำ | Schema, API, Cron/Queue | 4-5 ชม. |
| **#21 - Notes App** | ⭐ ต่ำ | Full CRUD, แยก feature | 5-6 ชม. |

---

## 🎯 แนะนำลำดับการทำ

### Round 1: Core Features (ควรทำก่อน)
1. **#16 - Search Messages** (3-4 ชม.)
2. **#20 - Jump to Date** (1 ชม.)

**รวม:** ~4-5 ชั่วโมง

---

### Round 2: Advanced Collaboration
3. **#17 - Forward Messages** (2-3 ชม.)
4. **#8 - Mentions** (3-4 ชม.)

**รวม:** ~5-7 ชั่วโมง

---

### Round 3: Nice to Have (ถ้ามีเวลา)
5. **#19 - Scheduled Messages** (4-5 ชม.)
6. **#21 - Notes App** (5-6 ชม.)

**รวม:** ~9-11 ชั่วโมง

---

## ⚠️ สิ่งที่ Backend ต้องตรวจสอบทุกครั้ง

### Security Checklist:
- [ ] User authentication (JWT token valid)
- [ ] User เป็นสมาชิกของ conversation ที่เกี่ยวข้อง
- [ ] Validate input (XSS, SQL injection)
- [ ] Rate limiting (ป้องกัน spam)
- [ ] Proper error messages (ไม่ leak sensitive info)

### Performance Checklist:
- [ ] Database indexes ครบ
- [ ] Pagination สำหรับ list endpoints
- [ ] Caching (ถ้าเหมาะสม)
- [ ] Query optimization (ไม่ N+1)
- [ ] WebSocket events ส่งแค่คนที่เกี่ยวข้อง

---

## 📝 หมายเหตุสำหรับ Backend Team

1. **Full-text Search (#16):**
   - ถ้าใช้ PostgreSQL: สร้าง GIN index บน ts_vector
   - ถ้า messages เยอะมาก (>1M): พิจารณา Elasticsearch

2. **Mentions (#8):**
   - ต้องมี notification system พร้อมก่อน
   - WebSocket events ต้องทำงาน
   - Push notifications (optional แต่แนะนำ)

3. **Scheduled Messages (#19):**
   - ต้องมี Redis สำหรับ Bull Queue (production)
   - หรือใช้ node-cron (simple, dev)
   - Monitoring: ต้องเช็คว่า cron ทำงานปกติ

4. **Forward Messages (#17):**
   - คิดเรื่อง rate limiting (ป้องกัน spam)
   - คิดเรื่อง file attachments (ต้อง copy file หรือไม่?)

---

**เอกสารนี้สร้างโดย:** Claude Code
**อัปเดตล่าสุด:** 2025-01-29
**สถานะ:** รอ Backend implementation
