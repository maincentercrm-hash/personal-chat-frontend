# Chat UI/UX Improvement Plan

**วันที่สร้าง:** 2025-01-29
**ผู้รับผิดชอบ:** Frontend Developer
**ลำดับความสำคัญ:** 🟡 MEDIUM PRIORITY
**เวลาโดยประมาณ:** 4-6 ชั่วโมง

---

## 📋 สรุปปัญหาและสถานะ

| # | ปัญหา | สถานะ | ความจำเป็น | เวลา |
|---|-------|-------|------------|------|
| #6 | Chat Header (ชื่อ + ไอคอนโปรไฟล์) | ✅ **มีอยู่แล้ว** | ตรวจสอบ + ปรับปรุง | 30 นาที |
| #13 | Auto Scroll ไม่ดี + ไม่มีปุ่มกลับล่าง | ⚠️ **ต้องแก้** | แก้ไข logic | 1.5 ชม. |
| #23 | เลื่อนไม่ลง กระตุก | ✅ **มี Virtuoso แล้ว** | ตรวจสอบ performance | 30 นาที |
| #28 | ไม่มีขีดวันที่ | ❌ **ยังไม่มี** | สร้างใหม่ | 2 ชม. |

---

## 🎯 เป้าหมาย

### 1. **ปรับปรุง Chat Header** (#6)
- ✅ มี component อยู่แล้ว (`src/components/standard/conversation/ChatHeader.tsx`)
- ✅ แสดง avatar, ชื่อ, online status
- 🔧 **ต้องปรับปรุง:**
  - เพิ่ม typing indicator
  - เพิ่ม last seen สำหรับ offline users
  - ปรับปรุง responsive (mobile)

### 2. **แก้ไข Smart Auto-Scroll** (#13)
- ❌ **ปัญหา:** เลื่อนขึ้นดูแชทเก่า แล้วเด้งกลับล่างสุด
- ✅ **มี scroll button แล้ว** (`showScrollButton` in MessageArea)
- 🔧 **ต้องแก้:**
  - ปรับ logic ให้ไม่ auto-scroll เมื่อ user กำลังอ่านแชทเก่า
  - แสดง badge จำนวนข้อความใหม่

### 3. **ตรวจสอบ Performance** (#23)
- ✅ **มี React Virtuoso แล้ว**
- ✅ **มี height caching**
- ✅ **มี memoization**
- 🔍 **ต้องตรวจสอบ:**
  - ทดสอบกับ 1000+ messages
  - ตรวจสอบ memory leaks
  - ดู re-render patterns

### 4. **สร้าง Date Separator** (#28)
- ❌ **ยังไม่มี**
- 🆕 **ต้องสร้างใหม่:**
  - Component: `DateSeparator.tsx`
  - Logic: Group messages by date
  - Format: "Today", "Yesterday", "Monday, Jan 1"

---

## 📐 สถาปัตยกรรมปัจจุบัน

### ไฟล์ที่เกี่ยวข้อง

```
src/
├── components/
│   ├── standard/
│   │   └── conversation/
│   │       └── ChatHeader.tsx ✅ มีอยู่แล้ว
│   └── shared/
│       ├── MessageArea.tsx ✅ มีอยู่แล้ว
│       ├── VirtualMessageList.tsx ✅ มีอยู่แล้ว (Virtuoso)
│       └── VirtualMessageList/
│           └── MessageItem.tsx ✅ มีอยู่แล้ว
├── hooks/
│   ├── useMessagesList.ts ✅ มีอยู่แล้ว
│   ├── useMessageHeightCache.ts ✅ มีอยู่แล้ว
│   └── useScrollHandlers.ts ✅ มีอยู่แล้ว
└── utils/
    └── dateFormatter.ts ❌ ต้องสร้างใหม่
```

### Flow ปัจจุบัน

```
ConversationPage
    ↓
ChatHeader (แสดงชื่อ + avatar + status)
    ↓
MessageArea
    ↓ (ส่ง messages + props)
VirtualMessageList (Virtuoso)
    ↓ (render แต่ละข้อความ)
MessageItem
```

---

## 🔨 แผนการดำเนินการ

### Phase 1: วิเคราะห์และเตรียมการ (30 นาที)

#### 1.1 ตรวจสอบ ChatHeader
- [x] อ่านโค้ด ChatHeader.tsx
- [ ] ทดสอบ online status
- [ ] เช็ค responsive mobile
- [ ] ดู typing indicator (ถ้ามี)

#### 1.2 ตรวจสอบ Auto-Scroll Logic
- [ ] อ่าน useScrollHandlers.ts
- [ ] ทดสอบ scroll behavior
- [ ] เช็ค showScrollButton condition
- [ ] ทดสอบ newMessagesCount

#### 1.3 ตรวจสอบ Performance
- [ ] ทดสอบกับ 100+ messages
- [ ] ทดสอบกับ 500+ messages
- [ ] ทดสอบกับ 1000+ messages
- [ ] ใช้ React DevTools Profiler
- [ ] เช็ค memory usage

---

### Phase 2: แก้ไข Smart Auto-Scroll (1.5 ชั่วโมง)

#### ปัญหาที่พบ

```typescript
// ❌ ปัญหา: Auto-scroll ทำงานตลอด
useEffect(() => {
  scrollToBottom(); // เรียกทุกครั้งที่มี message ใหม่
}, [messages]);
```

#### วิธีแก้

**2.1 สร้าง useSmartAutoScroll Hook** (30 นาที)

```typescript
// src/hooks/useSmartAutoScroll.ts
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSmartAutoScrollOptions {
  threshold?: number; // px from bottom to trigger auto-scroll (default: 100)
}

export function useSmartAutoScroll(options: UseSmartAutoScrollOptions = {}) {
  const { threshold = 100 } = options;

  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  /**
   * ตรวจสอบว่า user scroll อยู่ที่ด้านล่างหรือไม่
   */
  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // ถ้าอยู่ใกล้ด้านล่าง (ภายใน threshold px) → อนุญาต auto-scroll
    const isNearBottom = distanceFromBottom < threshold;

    setShouldAutoScroll(isNearBottom);

    // ถ้ากลับมาที่ด้านล่าง → reset new messages count
    if (isNearBottom) {
      setNewMessagesCount(0);
    }
  }, [threshold]);

  /**
   * Handle scroll event
   */
  const handleScroll = useCallback(() => {
    checkScrollPosition();
  }, [checkScrollPosition]);

  /**
   * นับข้อความใหม่เมื่อ user ไม่อยู่ที่ด้านล่าง
   */
  const incrementNewMessagesCount = useCallback((messageCount: number) => {
    const newCount = messageCount - lastMessageCountRef.current;

    if (!shouldAutoScroll && newCount > 0) {
      setNewMessagesCount(prev => prev + newCount);
    }

    lastMessageCountRef.current = messageCount;
  }, [shouldAutoScroll]);

  /**
   * Scroll to bottom function
   */
  const scrollToBottom = useCallback((smooth = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });

    setShouldAutoScroll(true);
    setNewMessagesCount(0);
  }, []);

  return {
    shouldAutoScroll,
    newMessagesCount,
    scrollContainerRef,
    handleScroll,
    scrollToBottom,
    incrementNewMessagesCount,
    checkScrollPosition
  };
}
```

**2.2 อัพเดท VirtualMessageList** (30 นาที)

```typescript
// src/components/shared/VirtualMessageList.tsx

// เพิ่ม state
const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
const [newMessagesCount, setNewMessagesCount] = useState(0);

// ✅ แก้ไข: Auto-scroll เฉพาะเมื่อ shouldAutoScroll = true
useEffect(() => {
  if (shouldAutoScroll && messages.length > prevMessageCountRef.current) {
    // มีข้อความใหม่ และ user อยู่ที่ด้านล่าง → scroll
    virtuosoRef.current?.scrollToIndex({
      index: messages.length - 1,
      behavior: 'smooth'
    });
  } else if (!shouldAutoScroll && messages.length > prevMessageCountRef.current) {
    // มีข้อความใหม่ แต่ user ไม่อยู่ที่ด้านล่าง → นับ new messages
    const newCount = messages.length - prevMessageCountRef.current;
    setNewMessagesCount(prev => prev + newCount);
  }

  prevMessageCountRef.current = messages.length;
}, [messages.length, shouldAutoScroll]);

// ✅ ตรวจจับว่า user scroll หรือไม่
const handleAtBottomStateChange = useCallback((isAtBottom: boolean) => {
  setShouldAutoScroll(isAtBottom);

  if (isAtBottom) {
    setNewMessagesCount(0); // Reset count เมื่อกลับมาด้านล่าง
  }
}, []);

// ใน Virtuoso component
<Virtuoso
  // ... other props
  atBottomStateChange={handleAtBottomStateChange}
  atBottomThreshold={100} // trigger เมื่ออยู่ภายใน 100px จากด้านล่าง
/>
```

**2.3 ปรับปรุง Scroll to Bottom Button** (30 นาที)

```typescript
// src/components/shared/MessageArea.tsx

// แสดงปุ่มเมื่อ:
// 1. User ไม่อยู่ที่ด้านล่าง (shouldAutoScroll = false)
// 2. มีข้อความใหม่ (newMessagesCount > 0)

{!shouldAutoScroll && (
  <Button
    className="fixed bottom-20 right-6 rounded-full shadow-lg z-10"
    size="icon"
    onClick={() => virtualListRef.current?.scrollToBottom(true)}
  >
    <ArrowDown size={20} />
    {newMessagesCount > 0 && (
      <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold min-w-[20px] text-center">
        {newMessagesCount > 99 ? '99+' : newMessagesCount}
      </div>
    )}
  </Button>
)}
```

---

### Phase 3: สร้าง Date Separator (2 ชั่วโมง)

#### 3.1 สร้าง Utility Functions (30 นาที)

```typescript
// src/utils/dateFormatter.ts
import { format, isSameDay, differenceInDays, isToday, isYesterday } from 'date-fns';
import { th } from 'date-fns/locale';

/**
 * Format date separator (Today, Yesterday, Monday, Jan 1, 2024)
 */
export function formatDateSeparator(dateString: string): string {
  const date = new Date(dateString);

  if (isToday(date)) {
    return 'วันนี้';
  }

  if (isYesterday(date)) {
    return 'เมื่อวาน';
  }

  // ภายใน 7 วัน → แสดงวัน (จันทร์, อังคาร, ...)
  const today = new Date();
  if (differenceInDays(today, date) < 7) {
    return format(date, 'EEEE', { locale: th });
  }

  // ถ้าปีเดียวกัน → ไม่ต้องแสดงปี
  if (date.getFullYear() === today.getFullYear()) {
    return format(date, 'd MMMM', { locale: th });
  }

  // ถ้าคนละปี → แสดงปีด้วย
  return format(date, 'd MMMM yyyy', { locale: th });
}

/**
 * Group messages by date
 */
export interface GroupedMessages {
  date: string; // yyyy-MM-dd
  displayDate: string; // "Today", "Yesterday", etc.
  messages: any[];
}

export function groupMessagesByDate(messages: any[]): GroupedMessages[] {
  const groups: Record<string, any[]> = {};

  // Group by date (yyyy-MM-dd)
  messages.forEach(msg => {
    const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(msg);
  });

  // Convert to array with display date
  return Object.entries(groups)
    .map(([date, msgs]) => ({
      date,
      displayDate: formatDateSeparator(date),
      messages: msgs
    }))
    .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date ascending
}

/**
 * Check if should show date separator between two messages
 */
export function shouldShowDateSeparator(
  currentMessage: any,
  previousMessage: any | null
): boolean {
  if (!previousMessage) return true;

  const currentDate = new Date(currentMessage.created_at);
  const previousDate = new Date(previousMessage.created_at);

  return !isSameDay(currentDate, previousDate);
}
```

#### 3.2 สร้าง DateSeparator Component (30 นาที)

```typescript
// src/components/shared/DateSeparator.tsx
import React from 'react';

interface DateSeparatorProps {
  date: string; // "Today", "Yesterday", "Monday, Jan 1", etc.
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 border-t border-border"></div>
      <div className="px-3 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
        {date}
      </div>
      <div className="flex-1 border-t border-border"></div>
    </div>
  );
};

export default React.memo(DateSeparator);
```

#### 3.3 อัพเดท MessageItem ให้แสดง Date Separator (1 ชั่วโมง)

**Option 1: แยก Component (แนะนำ)**

```typescript
// src/components/shared/VirtualMessageList/MessageWithDate.tsx
import React from 'react';
import { MessageItem } from './MessageItem';
import { DateSeparator } from '../DateSeparator';
import { shouldShowDateSeparator } from '@/utils/dateFormatter';
import type { MessageDTO } from '@/types/message.types';

interface MessageWithDateProps {
  message: MessageDTO;
  previousMessage: MessageDTO | null;
  // ... other props from MessageItem
}

export const MessageWithDate: React.FC<MessageWithDateProps> = ({
  message,
  previousMessage,
  ...messageItemProps
}) => {
  const showDateSeparator = shouldShowDateSeparator(message, previousMessage);

  return (
    <>
      {showDateSeparator && (
        <DateSeparator
          date={formatDateSeparator(message.created_at)}
        />
      )}
      <MessageItem message={message} {...messageItemProps} />
    </>
  );
};
```

**Option 2: ใช้ Virtuoso grouping (performance ดีกว่า)**

```typescript
// src/components/shared/VirtualMessageList.tsx

import { groupMessagesByDate } from '@/utils/dateFormatter';

// ใน VirtualMessageList component
const groupedMessages = useMemo(() => {
  return groupMessagesByDate(deduplicatedMessages);
}, [deduplicatedMessages]);

// ใช้ GroupedVirtuoso แทน Virtuoso
<GroupedVirtuoso
  groupCounts={groupedMessages.map(g => g.messages.length)}
  groupContent={(index) => {
    const group = groupedMessages[index];
    return <DateSeparator date={group.displayDate} />;
  }}
  itemContent={(index) => {
    // Find which group this item belongs to
    let groupIndex = 0;
    let itemIndex = index;

    for (let i = 0; i < groupedMessages.length; i++) {
      if (itemIndex < groupedMessages[i].messages.length) {
        groupIndex = i;
        break;
      }
      itemIndex -= groupedMessages[i].messages.length;
    }

    const message = groupedMessages[groupIndex].messages[itemIndex];
    return <MessageItem message={message} {...props} />;
  }}
  // ... other props
/>
```

---

### Phase 4: ปรับปรุง ChatHeader (30 นาที)

#### 4.1 เพิ่ม Typing Indicator

```typescript
// src/components/standard/conversation/ChatHeader.tsx

interface ChatHeaderProps {
  // ... existing props
  isTyping?: boolean; // ✅ เพิ่ม
  typingUsers?: string[]; // ✅ เพิ่ม - รายชื่อคนที่กำลังพิมพ์
}

// ใน component
const getStatusDisplay = () => {
  // ✅ แสดง typing indicator ก่อน
  if (isTyping && typingUsers && typingUsers.length > 0) {
    if (typingUsers.length === 1) {
      return {
        text: 'กำลังพิมพ์...',
        color: 'text-primary animate-pulse'
      };
    }
    return {
      text: `${typingUsers.length} คนกำลังพิมพ์...`,
      color: 'text-primary animate-pulse'
    };
  }

  // ... existing status logic
};
```

#### 4.2 เพิ่ม Last Seen

```typescript
// เพิ่ม last seen สำหรับ offline users
if (!isOnline && otherUserId) {
  const lastSeen = getLastSeen(otherUserId); // จาก WebSocket หรือ API

  if (lastSeen) {
    return {
      text: `ออนไลน์ล่าสุด ${formatLastSeen(lastSeen)}`,
      color: 'text-muted-foreground'
    };
  }
}

// Helper function
function formatLastSeen(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = differenceInMinutes(now, date);

  if (diff < 1) return 'เมื่อสักครู่';
  if (diff < 60) return `${diff} นาทีที่แล้ว`;
  if (diff < 1440) return `${Math.floor(diff / 60)} ชั่วโมงที่แล้ว`;

  return format(date, 'd MMM HH:mm', { locale: th });
}
```

---

### Phase 5: ทดสอบและ QA (1 ชั่วโมง)

#### 5.1 Manual Testing Checklist

**Auto-Scroll:**
- [ ] ข้อความใหม่เข้ามา + อยู่ล่างสุด → scroll ลงอัตโนมัติ ✅
- [ ] ข้อความใหม่เข้ามา + กำลังอ่านแชทเก่า → **ไม่** scroll ✅
- [ ] เลื่อนขึ้นดูแชทเก่า → ปุ่ม "scroll to bottom" แสดง ✅
- [ ] แสดง badge จำนวนข้อความใหม่ ✅
- [ ] คลิกปุ่ม → scroll ลงล่างสุด ✅

**Date Separator:**
- [ ] แสดง "วันนี้" สำหรับวันนี้ ✅
- [ ] แสดง "เมื่อวาน" สำหรับเมื่อวาน ✅
- [ ] แสดงวันสำหรับภายใน 7 วัน (จันทร์, อังคาร, ...) ✅
- [ ] แสดงวันที่เต็มสำหรับนานกว่า 7 วัน ✅
- [ ] Date separator อยู่ตำแหน่งที่ถูกต้อง (ระหว่างวัน) ✅

**Chat Header:**
- [ ] แสดงชื่อและรูปโปรไฟล์ ✅
- [ ] แสดง online status (online/offline) ✅
- [ ] แสดง typing indicator เมื่อมีคนพิมพ์ ✅
- [ ] แสดง last seen สำหรับ offline users ✅
- [ ] Responsive mobile ✅

**Performance:**
- [ ] เลื่อนดู 100+ ข้อความ smooth ไม่กระตุก ✅
- [ ] เลื่อนดู 500+ ข้อความ smooth ไม่กระตุก ✅
- [ ] เลื่อนดู 1000+ ข้อความ smooth ไม่กระตุก ✅
- [ ] Load time เร็ว (< 1 วินาที) ✅
- [ ] Memory usage ไม่สูงผิดปกติ ✅

#### 5.2 Automated Testing

```typescript
// src/components/shared/__tests__/DateSeparator.test.tsx
import { render, screen } from '@testing-library/react';
import { DateSeparator } from '../DateSeparator';

describe('DateSeparator', () => {
  it('should render date text', () => {
    render(<DateSeparator date="Today" />);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });
});
```

```typescript
// src/utils/__tests__/dateFormatter.test.ts
import { formatDateSeparator, shouldShowDateSeparator } from '../dateFormatter';

describe('dateFormatter', () => {
  it('should return "Today" for today\'s date', () => {
    const today = new Date().toISOString();
    expect(formatDateSeparator(today)).toBe('วันนี้');
  });

  it('should return "Yesterday" for yesterday\'s date', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatDateSeparator(yesterday.toISOString())).toBe('เมื่อวาน');
  });
});
```

---

## 📦 สรุปไฟล์ที่ต้องสร้าง/แก้ไข

### สร้างใหม่ (New Files)

1. `src/utils/dateFormatter.ts` - Date formatting utilities
2. `src/components/shared/DateSeparator.tsx` - Date separator component
3. `src/hooks/useSmartAutoScroll.ts` - Smart auto-scroll hook (optional)
4. `src/components/shared/VirtualMessageList/MessageWithDate.tsx` - Message with date wrapper (optional)

### แก้ไข (Modified Files)

1. `src/components/shared/VirtualMessageList.tsx` - เพิ่ม date grouping + smart auto-scroll
2. `src/components/shared/MessageArea.tsx` - ปรับปรุง scroll button UI
3. `src/components/standard/conversation/ChatHeader.tsx` - เพิ่ม typing indicator + last seen
4. `src/hooks/useScrollHandlers.ts` - ปรับปรุง auto-scroll logic (ถ้าจำเป็น)

---

## 🎨 UI/UX Design Reference

### Chat Header
```
┌─────────────────────────────────────────────────────┐
│  👤  John Doe                      🔍  ℹ️  ⋮         │
│      กำลังพิมพ์... (หรือ ออนไลน์/ออฟไลน์)            │
└─────────────────────────────────────────────────────┘
```

### Date Separator
```
─────────────── วันนี้ ───────────────
    You: สวัสดี             10:30 AM
    John: สบายดีไหม          10:31 AM

──────────── เมื่อวาน ────────────
    You: ไว้เจอกันพรุ่งนี้     20:45
    John: โอเค!              20:46

──────── อังคาร, 28 ม.ค. ────────
    John: Happy New Year!    00:01
```

### Scroll to Bottom Button
```
     (Floating button at bottom-right, above input area)

     ┌───────────────┐
     │      ↓        │
     │   3 new       │
     └───────────────┘
```

---

## ⚡ Performance Optimization Tips

### 1. Memoization
```typescript
// DateSeparator component
export default React.memo(DateSeparator);

// groupMessagesByDate - useMemo
const groupedMessages = useMemo(
  () => groupMessagesByDate(messages),
  [messages]
);
```

### 2. Virtualization
```typescript
// ใช้ GroupedVirtuoso สำหรับ date grouping
// แทนที่จะ render ทุก message, จะ render เฉพาะที่เห็นบนหน้าจอ
<GroupedVirtuoso
  data={groupedMessages}
  // ... virtualization props
/>
```

### 3. Lazy Image Loading
```typescript
// ใน MessageItem
<img
  src={imageUrl}
  loading="lazy"
  alt=""
/>
```

---

## 🐛 Known Issues & Solutions

### Issue 1: Date separator กระตุกเมื่อ scroll เร็วๆ
**Solution:** ใช้ `React.memo` และ virtualization

### Issue 2: Auto-scroll ทำงานช้า
**Solution:** ใช้ `requestAnimationFrame` แทน `setTimeout`

```typescript
const scrollToBottom = useCallback(() => {
  requestAnimationFrame(() => {
    virtuosoRef.current?.scrollToIndex({
      index: messages.length - 1,
      behavior: 'smooth'
    });
  });
}, [messages.length]);
```

### Issue 3: New messages count ไม่ถูกต้อง
**Solution:** ใช้ `useRef` เพื่อเก็บ previous count

```typescript
const prevCountRef = useRef(messages.length);

useEffect(() => {
  if (!shouldAutoScroll) {
    const newCount = messages.length - prevCountRef.current;
    setNewMessagesCount(prev => prev + newCount);
  }
  prevCountRef.current = messages.length;
}, [messages.length, shouldAutoScroll]);
```

---

## 📊 Success Metrics

### Performance Targets
- **Load Time:** < 1 second for 1000 messages
- **Scroll FPS:** 60 FPS constant
- **Memory:** < 100MB for 1000 messages
- **CPU Usage:** < 30% during scroll

### User Experience Targets
- **Auto-scroll accuracy:** 100% (no false positives)
- **Date separator visibility:** 100% (always visible when needed)
- **Scroll button responsiveness:** < 100ms
- **Typing indicator latency:** < 500ms

---

## 🎯 Next Steps

1. **Review และ approve plan**
2. **เริ่ม Phase 1: วิเคราะห์โค้ดปัจจุบัน**
3. **Implement Phase 2-4 ตามลำดับ**
4. **Testing และ QA**
5. **Deploy to staging**
6. **User acceptance testing**
7. **Production deployment**

---

## 📞 ติดต่อ & Support

หากมีข้อสงสัยหรือพบปัญหา:
1. สร้าง issue ใน GitHub
2. ติดต่อ Frontend Team Lead
3. Check documentation: `docs/CHAT_FEATURES.md`

---

**สร้างโดย:** Claude Code Assistant
**Last Updated:** 2025-01-29
**Version:** 1.0.0
