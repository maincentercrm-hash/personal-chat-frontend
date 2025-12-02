# 06 - MEDIUM PRIORITY: ปัญหา Chat UI/UX

**ลำดับความสำคัญ: 🟡 MEDIUM PRIORITY**
**ระดับความยาก: ⭐⭐ ง่าย-ปานกลาง**

---

## 📋 รายการปัญหา

### #6: เอาชื่อคนพิมไว้ข้างบน + ไอคอนโปรไฟล์

**ปัญหา:**
- ไม่มี header บอกว่ากำลังแชทกับใคร
- ไม่มีรูปโปรไฟล์ของคนที่แชทด้วย

**วิธีแก้:**
1. **สร้าง Chat Header:**
   ```typescript
   <ChatHeader>
     <Avatar src={user.avatar} />
     <div>
       <h3>{user.displayName}</h3>
       <OnlineStatus status={user.onlineStatus} />
     </div>
     <Actions>
       <IconButton icon="search" />    // ค้นหาข้อความ
       <IconButton icon="info" />      // ข้อมูลแชท
       <IconButton icon="more" />      // เมนูเพิ่มเติม
     </Actions>
   </ChatHeader>
   ```

2. **แสดงข้อมูล:**
   - รูปโปรไฟล์
   - ชื่อ (Display Name)
   - Online status (online, offline, away, last seen)
   - Typing indicator

3. **Click เพื่อดูข้อมูลเพิ่ม:**
   - เปิด User Profile
   - ดู Shared Media
   - ตั้งค่าแชท

**Backend ต้องทำ:**
✅ **ต้องมี (น่าจะมีอยู่แล้ว):**
- `GET /api/users/{id}` - User profile
- `GET /api/users/{id}/online-status` - Online status
- WebSocket event: `user.online`, `user.offline`, `user.typing`

---

### #13: จะเลื่อนขึ้นไปดูแชท มันเด้งกลับมาข้างล่างสุดตลอด แต่ถ้าเลือกข้อความไปดูแชทเก่า ไม่มีปุ่มให้เลื่อนลงมาล่างสุด

**ปัญหาแบ่งเป็น 2 ส่วน:**

#### ส่วนที่ 1: เลื่อนขึ้นดูแชทเก่า แล้วเด้งกลับล่างสุด

**สาเหตุ:**
- Auto-scroll ทำงานตลอดเวลา แม้ user กำลังอ่านแชทเก่า
- ข้อความใหม่เข้ามา → force scroll to bottom

**วิธีแก้:**
```typescript
const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
const chatContainerRef = useRef<HTMLDivElement>(null);

// ตรวจสอบว่า user scroll ขึ้นไปดูแชทเก่าหรือไม่
const handleScroll = () => {
  const container = chatContainerRef.current;
  if (!container) return;

  const { scrollTop, scrollHeight, clientHeight } = container;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

  // ถ้าอยู่ใกล้ด้านล่าง (ภายใน 100px) → auto-scroll
  // ถ้าเลื่อนขึ้นไปแล้ว → ปิด auto-scroll
  setShouldAutoScroll(distanceFromBottom < 100);
};

// เมื่อมีข้อความใหม่
useEffect(() => {
  if (shouldAutoScroll) {
    scrollToBottom();
  }
}, [messages, shouldAutoScroll]);
```

#### ส่วนที่ 2: ไม่มีปุ่มเลื่อนกลับลงล่างสุด

**วิธีแก้:**
```typescript
// แสดงปุ่ม "Scroll to Bottom" เมื่อ:
// 1. User เลื่อนขึ้นไปดูแชทเก่า
// 2. มีข้อความใหม่เข้ามาระหว่างที่เลื่อนอยู่

{!shouldAutoScroll && (
  <ScrollToBottomButton onClick={scrollToBottom}>
    {unreadCount > 0 && (
      <Badge>{unreadCount} new messages</Badge>
    )}
    ↓
  </ScrollToBottomButton>
)}
```

**Backend ต้องทำ:** ❌ ไม่ต้อง

---

### #23: เลื่อนไม่ลง กระตุก

**ปัญหา:**
- Scrolling ไม่ smooth
- กระตุก lag
- Performance ไม่ดี

**สาเหตุที่เป็นไปได้:**
1. **Re-render ทั้ง list:**
   - ทุกข้อความ re-render เมื่อมีข้อความใหม่

2. **ไม่มี Virtualization:**
   - Render ทุกข้อความ แม้มี 1000+ ข้อความ

3. **Heavy Components:**
   - Image/Video โหลดทุกตัว
   - ไม่มี lazy loading

4. **CSS Performance:**
   - Heavy animations
   - Complex shadows/effects

**วิธีแก้:**

### 1. Virtualization (แนะนำมาก):
```bash
npm install react-virtuoso
# or
npm install react-window
```

```typescript
import { Virtuoso } from 'react-virtuoso';

<Virtuoso
  data={messages}
  itemContent={(index, message) => (
    <MessageItem key={message.id} message={message} />
  )}
  followOutput="smooth"  // Auto-scroll to bottom
  initialTopMostItemIndex={messages.length - 1}
/>
```

### 2. Memoization:
```typescript
const MessageItem = memo(({ message }) => {
  // Component content
});

// ใน MessageList:
const messageItems = useMemo(
  () => messages.map(msg => <MessageItem key={msg.id} message={msg} />),
  [messages]
);
```

### 3. Lazy Loading Images:
```typescript
<img
  src={message.imageUrl}
  loading="lazy"
  alt=""
/>
```

### 4. Smooth Scroll CSS:
```css
.chat-container {
  scroll-behavior: smooth;
  overflow-y: auto;
  will-change: scroll-position;
}
```

**Backend ต้องทำ:** ❌ ไม่ต้อง (Performance optimization frontend)

---

### #28: ข้อความคนละวัน ไม่มีขีดวันที่

**ปัญหา:**
- ดูแชทแล้วไม่รู้ว่าข้อความไหนส่งวันไหน
- ไม่มี date separator

**วิธีแก้:**
```typescript
const MessageList = ({ messages }) => {
  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: Record<string, Message[]> = {};

    messages.forEach(msg => {
      const dateKey = format(new Date(msg.createdAt), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });

    return groups;
  }, [messages]);

  return (
    <>
      {Object.entries(groupedMessages).map(([date, msgs]) => (
        <div key={date}>
          <DateSeparator date={date} />
          {msgs.map(msg => (
            <MessageItem key={msg.id} message={msg} />
          ))}
        </div>
      ))}
    </>
  );
};

const DateSeparator = ({ date }) => {
  const displayDate = formatDateSeparator(date);
  // "Today", "Yesterday", "Monday, Jan 1", etc.

  return (
    <div className="date-separator">
      <span>{displayDate}</span>
    </div>
  );
};

// Helper function
const formatDateSeparator = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';

  // ถ้าภายใน 7 วัน → แสดงวัน (Monday, Tuesday, ...)
  if (differenceInDays(today, date) < 7) {
    return format(date, 'EEEE');
  }

  // ถ้านานกว่า → แสดงวันที่เต็ม
  return format(date, 'MMMM d, yyyy');
};
```

**UI Style:**
```css
.date-separator {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 20px 0;
}

.date-separator::before,
.date-separator::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e0e0e0;
}

.date-separator span {
  padding: 0 10px;
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  border-radius: 12px;
  padding: 4px 12px;
}
```

**Backend ต้องทำ:** ❌ ไม่ต้อง (Frontend formatting)

---

## 🎯 แผนการแก้ไข (เรียงตามลำดับ)

### Phase 1: Quick Wins (2-3 ชม.)
1. **#6 - Chat Header** (1 ชม.)
   - สร้าง ChatHeader component
   - แสดงชื่อ + avatar
   - Online status

2. **#28 - Date Separator** (1 ชม.)
   - Group messages by date
   - สร้าง DateSeparator component
   - Format display

### Phase 2: Scroll Improvements (2-3 ชม.)
3. **#13 - Smart Auto-Scroll** (1.5 ชม.)
   - Conditional auto-scroll
   - Scroll to bottom button
   - Unread badge

4. **#23 - Performance** (1.5 ชม.)
   - Implement virtualization
   - Memoization
   - Lazy loading

### Phase 3: Testing
1. Test chat header
2. Test scroll behavior
3. Test performance (1000+ messages)
4. Test date separators

---

## 📦 ไฟล์ที่ต้องแก้

- `src/components/Chat/ChatHeader.tsx` (สร้างใหม่)
- `src/components/Chat/MessageList.tsx`
- `src/components/Chat/DateSeparator.tsx` (สร้างใหม่)
- `src/components/Chat/ScrollToBottomButton.tsx` (สร้างใหม่)
- `src/hooks/useAutoScroll.ts` (สร้างใหม่)
- `src/utils/dateFormatter.ts`

---

## 🎨 UI Design Suggestions

### Chat Header:
```
┌────────────────────────────────────────┐
│  👤 John Doe              🔍 ℹ️  ⋮     │
│     Online                              │
└────────────────────────────────────────┘
```

### Date Separator:
```
────────── Today ──────────
    You: Hello!        10:30 AM
    John: Hi there!    10:31 AM

────── Yesterday ──────────
    You: See you!      8:45 PM
    John: Bye!         8:46 PM

─── Monday, Jan 1 ────
    John: Happy New Year!
```

### Scroll to Bottom Button:
```
     (Floating button at bottom-right)
     ┌───────────────────┐
     │   ↓  3 new       │
     └───────────────────┘
```

---

## ✅ เงื่อนไขการ Test

**#6 - Chat Header:**
- [ ] แสดงชื่อและรูปโปรไฟล์
- [ ] แสดง online status (online/offline/last seen)
- [ ] Click avatar → เปิด profile
- [ ] Typing indicator ทำงาน

**#13 - Auto Scroll:**
- [ ] ข้อความใหม่เข้ามา + อยู่ล่างสุด → scroll ลงอัตโนมัติ
- [ ] ข้อความใหม่เข้ามา + กำลังอ่านแชทเก่า → ไม่ scroll
- [ ] เลื่อนขึ้นดูแชทเก่า → ปุ่ม "scroll to bottom" แสดง
- [ ] คลิกปุ่ม → scroll ลงล่างสุด
- [ ] แสดง badge จำนวนข้อความใหม่

**#23 - Performance:**
- [ ] เลื่อนดู 1000+ ข้อความ smooth ไม่กระตุก
- [ ] Load time เร็ว
- [ ] CPU usage ต่ำ
- [ ] Memory usage ไม่สูงผิดปกติ

**#28 - Date Separator:**
- [ ] แสดง "Today" สำหรับวันนี้
- [ ] แสดง "Yesterday" สำหรับเมื่อวาน
- [ ] แสดงวันสำหรับภายใน 7 วัน
- [ ] แสดงวันที่เต็มสำหรับนานกว่า 7 วัน
- [ ] Date separator อยู่ตำแหน่งที่ถูกต้อง
