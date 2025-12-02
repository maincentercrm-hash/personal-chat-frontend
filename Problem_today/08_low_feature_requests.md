# 08 - LOW PRIORITY: Feature Requests (ฟีเจอร์ใหม่ที่ต้องการ)

**ลำดับความสำคัญ: 🟢 LOW PRIORITY (ทำหลังจากแก้ปัญหาหลักเสร็จ)**
**ระดับความยาก: ⭐⭐⭐ ปานกลาง-ยาก**

---

## 📋 รายการฟีเจอร์

### #8: แท็ค @ ไม่ได้ (Mention/Tag Users)

**ฟีเจอร์:**
- พิมพ์ @ แล้วตามด้วยชื่อ → mention คนในกลุ่ม
- คนที่ถูก mention ได้รับ notification

**Implementation:**

#### Frontend:
```typescript
// 1. Mention Input with Autocomplete
import { useMention } from '@draft-js-plugins/mention';

const MessageInput = () => {
  const [mentions, setMentions] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = (text: string) => {
    // Detect @ symbol
    const match = text.match(/@(\w*)$/);
    if (match) {
      const query = match[1];
      // Filter group members by query
      const suggestions = groupMembers.filter(member =>
        member.displayName.toLowerCase().includes(query.toLowerCase())
      );
      setMentions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  return (
    <>
      <textarea onChange={e => handleInputChange(e.target.value)} />
      {showSuggestions && (
        <MentionSuggestions
          users={mentions}
          onSelect={user => insertMention(user)}
        />
      )}
    </>
  );
};

// 2. Message Format with Mentions
{
  "content": "Hey @john, check this out!",
  "mentions": [
    {
      "userId": "user_123",
      "username": "john",
      "startIndex": 4,
      "length": 5
    }
  ]
}

// 3. Render Mentions
const MessageContent = ({ message }) => {
  const renderContent = () => {
    let content = message.content;
    message.mentions?.forEach(mention => {
      const mentionText = content.substring(
        mention.startIndex,
        mention.startIndex + mention.length
      );
      content = content.replace(
        mentionText,
        `<span class="mention">@${mention.username}</span>`
      );
    });
    return content;
  };

  return <div dangerouslySetInnerHTML={{ __html: renderContent() }} />;
};
```

**Backend ต้องทำ:**
✅ **ต้องทำ:**
1. **Message Schema:**
   ```typescript
   {
     content: string;
     mentions: Array<{
       userId: string;
       startIndex: number;
       length: number;
     }>;
   }
   ```

2. **Notification:**
   - ส่ง notification ให้คนที่ถูก mention
   - Push notification, WebSocket event

3. **API:**
   ```typescript
   POST /api/messages
   Body: {
     conversationId: string;
     content: string;
     mentions: MentionData[];
   }
   ```

---

### #12: ปัก pin แชทไม่ได้ (ถ้าไม่ได้ทำโน้ตได้ไหม)

**ฟีเจอร์แบ่งเป็น 2 ส่วน:**

#### ส่วนที่ 1: Pin Conversations (แนะนำ)
**ปักหมุดแชทให้อยู่ด้านบนเสมอ**

```typescript
// Frontend
const ConversationList = ({ conversations }) => {
  const pinnedConvs = conversations.filter(c => c.isPinned);
  const unpinnedConvs = conversations.filter(c => !c.isPinned);

  return (
    <>
      {pinnedConvs.length > 0 && (
        <div className="pinned-section">
          <h4>📌 Pinned</h4>
          {pinnedConvs.map(conv => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))}
        </div>
      )}

      <div className="conversations-section">
        {unpinnedConvs.map(conv => (
          <ConversationItem key={conv.id} conversation={conv} />
        ))}
      </div>
    </>
  );
};

// Pin/Unpin action
const togglePin = async (conversationId: string) => {
  await api.togglePinConversation(conversationId);
};
```

**Backend ต้องทำ:**
```typescript
PUT /api/conversations/{id}/pin
DELETE /api/conversations/{id}/pin

// Add field to conversation:
{
  isPinned: boolean;
  pinnedAt?: Date;
}
```

#### ส่วนที่ 2: Pin Messages (Advanced)
**ปักหมุดข้อความสำคัญในแชท**

```typescript
// Pinned messages bar at top of chat
const ChatWindow = () => {
  return (
    <>
      {pinnedMessages.length > 0 && (
        <PinnedMessagesBar messages={pinnedMessages} />
      )}
      <MessageList />
    </>
  );
};

const PinnedMessagesBar = ({ messages }) => {
  return (
    <div className="pinned-messages">
      <PinIcon />
      <Carousel>
        {messages.map(msg => (
          <div onClick={() => scrollToMessage(msg.id)}>
            {msg.content}
          </div>
        ))}
      </Carousel>
    </div>
  );
};
```

**Backend ต้องทำ:**
```typescript
PUT /api/messages/{id}/pin
DELETE /api/messages/{id}/pin
GET /api/conversations/{id}/pinned-messages

// Add field to message:
{
  isPinned: boolean;
  pinnedBy: string;
  pinnedAt: Date;
}
```

#### ส่วนที่ 3: Notes (Alternative)
**สมุดบันทึกส่วนตัว**

```typescript
// Personal notes - ไม่เกี่ยวกับแชท
const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);

  return (
    <div className="notes-app">
      <h2>My Notes</h2>
      <button onClick={createNote}>+ New Note</button>
      {notes.map(note => (
        <NoteItem key={note.id} note={note} />
      ))}
    </div>
  );
};
```

**Backend ต้องทำ:**
```typescript
POST /api/notes
GET /api/notes
PUT /api/notes/{id}
DELETE /api/notes/{id}
```

**คำแนะนำ:** ควรทำทั้ง Pin Conversations และ Pin Messages, Notes อาจเป็น feature แยก

---

### #16: ค้นหาข้อความ

**ฟีเจอร์:**
- ค้นหาข้อความในแชท
- ค้นหาใน conversation ปัจจุบัน หรือทุก conversation

```typescript
// Search in current conversation
const ChatSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);

  const handleSearch = async () => {
    const results = await api.searchMessages({
      conversationId,
      query
    });
    setResults(results);
  };

  return (
    <div className="chat-search">
      <input
        type="search"
        placeholder="Search in this chat..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      <div className="search-results">
        {results.map(msg => (
          <SearchResultItem
            key={msg.id}
            message={msg}
            onClick={() => scrollToMessage(msg.id)}
          />
        ))}
      </div>
    </div>
  );
};

// Global search (all conversations)
const GlobalSearch = () => {
  return (
    <input
      type="search"
      placeholder="Search messages, contacts..."
      onChange={handleGlobalSearch}
    />
  );
};
```

**Backend ต้องทำ:**
✅ **ต้องทำ:**
```typescript
GET /api/messages/search
Query: {
  q: string;                    // Search query
  conversationId?: string;      // Optional: search in specific conversation
  limit?: number;
  offset?: number;
}

Response: {
  results: Array<{
    message: Message;
    conversation: Conversation;
    matchedText: string;        // Highlighted match
  }>;
  total: number;
}

// Full-text search implementation:
// - Use database full-text search (PostgreSQL, MySQL)
// - Or Elasticsearch / Algolia for better performance
```

---

### #17: กด select ข้อความ กดแชร์ ส่งต่อข้อความ

**ฟีเจอร์:**
- เลือกหลายข้อความ
- Forward ไปยัง conversation อื่น

```typescript
const MessageList = () => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleForward = async () => {
    // Show conversation picker
    const targetConversations = await showConversationPicker();

    // Forward messages
    await api.forwardMessages({
      messageIds: selectedMessages,
      targetConversationIds: targetConversations
    });

    exitSelectionMode();
  };

  return (
    <>
      {selectionMode && (
        <SelectionToolbar
          count={selectedMessages.length}
          onForward={handleForward}
          onDelete={handleDelete}
          onCancel={exitSelectionMode}
        />
      )}

      {messages.map(msg => (
        <MessageItem
          key={msg.id}
          message={msg}
          selectionMode={selectionMode}
          isSelected={selectedMessages.includes(msg.id)}
          onSelect={() => toggleMessageSelection(msg.id)}
          onLongPress={() => setSelectionMode(true)}
        />
      ))}
    </>
  );
};
```

**Backend ต้องทำ:**
✅ **ต้องทำ:**
```typescript
POST /api/messages/forward
Body: {
  messageIds: string[];
  targetConversationIds: string[];
}

// Creates new messages in target conversations
// with "forwarded" flag
{
  content: string;
  isForwarded: true;
  forwardedFrom: {
    messageId: string;
    senderId: string;
    conversationId: string;
  }
}
```

---

### #18: ขอเป็นตีมสว่าง มืด ดีกว่า / มมืดใช้แล้วปวดตา

**ฟีเจอร์:** Dark/Light Theme Toggle

```typescript
// Theme Provider
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('theme');
    if (saved) setTheme(saved as 'light' | 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// CSS Variables
:root[data-theme='light'] {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #000000;
  --text-secondary: #666666;
}

:root[data-theme='dark'] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #b3b3b3;
}

// Theme Toggle Button
const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
};
```

**Backend ต้องทำ:** ❌ ไม่ต้อง (Frontend only)

**หมายเหตุ:** ถ้า dark theme ใช้แล้วปวดตา → ปรับสี contrast ให้นุ่มกว่า

---

### #19: เอาตั้งเวลาส่งข้อความให้ด้วย (Scheduled Messages)

**ฟีเจอร์:** ส่งข้อความในเวลาที่กำหนด

```typescript
const ScheduleMessagePicker = ({ onSchedule }) => {
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());

  return (
    <Dialog>
      <h3>Schedule Message</h3>
      <DateTimePicker value={selectedTime} onChange={setSelectedTime} />

      <QuickOptions>
        <button onClick={() => schedule(addHours(1))}>In 1 hour</button>
        <button onClick={() => schedule(addHours(2))}>In 2 hours</button>
        <button onClick={() => schedule(tomorrow(9))}>Tomorrow 9AM</button>
      </QuickOptions>

      <button onClick={() => onSchedule(selectedTime)}>Schedule</button>
    </Dialog>
  );
};

const handleSchedule = async (time: Date) => {
  await api.scheduleMessage({
    conversationId,
    content: messageContent,
    scheduledAt: time.toISOString()
  });
};
```

**Backend ต้องทำ:**
✅ **ต้องทำ:**
```typescript
POST /api/messages/schedule
Body: {
  conversationId: string;
  content: string;
  scheduledAt: string;  // ISO date
}

// Background job to send messages at scheduled time
// Database table: scheduled_messages
{
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  scheduledAt: Date;
  status: 'pending' | 'sent' | 'cancelled';
  sentAt?: Date;
}

// API to manage scheduled messages
GET /api/messages/scheduled         // List scheduled
DELETE /api/messages/scheduled/{id} // Cancel
```

---

### #20: เลือกวันที่ได้

**ฟีเจอร์:** Jump to Date - เลื่อนไปดูข้อความในวันที่เลือก

```typescript
const JumpToDate = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleJumpToDate = async () => {
    const messages = await api.getMessagesByDate({
      conversationId,
      date: selectedDate.toISOString()
    });

    // Scroll to first message on that date
    if (messages.length > 0) {
      scrollToMessage(messages[0].id);
    }
  };

  return (
    <Popover>
      <Calendar value={selectedDate} onChange={setSelectedDate} />
      <button onClick={handleJumpToDate}>Go to Date</button>
    </Popover>
  );
};
```

**Backend ต้องทำ:**
✅ **อาจต้องทำ:**
```typescript
GET /api/conversations/{id}/messages/by-date
Query: {
  date: string;  // YYYY-MM-DD
  limit: number;
}

// Return messages from that date
```

---

### #21: มี memo ของตัวเอง

**ฟีเจอร์:** Personal notes/memo app (ตามที่กล่าวใน #12)

```typescript
// Notes app - separate from chat
const NotesApp = () => {
  return (
    <div className="notes-app">
      <NotesList />
      <NoteEditor />
    </div>
  );
};

const Note = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
};
```

**Backend ต้องทำ:**
```typescript
POST /api/notes
GET /api/notes
PUT /api/notes/{id}
DELETE /api/notes/{id}
```

---

## 🎯 แผนการแก้ไข (แนะนำลำดับ)

### Phase 1: UX Improvements (ทำก่อน - ง่าย)
1. **#18 - Dark/Light Theme** (2 ชม.) - Frontend only // ทำไปแล้ว
2. **#12 - Pin Conversations** (2 ชม.) - ต้อง Backend // ทำไปแล้ว

### Phase 2: Search & Navigation (สำคัญ)
3. **#16 - Search Messages** (3-4 ชม.) - ต้อง Backend
4. **#20 - Jump to Date** (1 ชม.) - ต้อง Backend

### Phase 3: Advanced Features
5. **#17 - Forward Messages** (2-3 ชม.) - ต้อง Backend
6. **#8 - Mentions** (3-4 ชม.) - ต้อง Backend
7. **#12 - Pin Messages** (2 ชม.) - ต้อง Backend // ทำไปแล้ว

### Phase 4: Nice to Have
8. **#19 - Scheduled Messages** (4-5 ชม.) - ต้อง Backend + Cron job
9. **#21 - Notes App** (5-6 ชม.) - ต้อง Backend, Feature แยก

---

## ✅ เงื่อนไขการ Test

จะเพิ่มใน checklist แยกตามฟีเจอร์เมื่อเริ่มทำ

---

**หมายเหตุ:** ฟีเจอร์เหล่านี้ควรทำหลังจากแก้ปัญหาหลัก (Critical & High Priority) เสร็จก่อน
