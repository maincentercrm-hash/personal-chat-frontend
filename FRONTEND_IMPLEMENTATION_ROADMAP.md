# Frontend Implementation Roadmap - Chat UI/UX Features

**วันที่สร้าง:** 2025-01-30
**อ้างอิงจาก:** `D:\Admin\Desktop\MY PROJECT\chat-backend-v2-main\FRONTEND_REQUIREMENTS_STATUS.md`
**Backend Timeline:** Week 1 (Jan 30 - Feb 5), Week 2 (Feb 6 - Feb 12)

---

## 🎯 สรุปสถานะ

### ✅ Backend พร้อมให้ใช้แล้ว
| Feature | Endpoint/Event | Status |
|---------|---------------|--------|
| Presence API (Single) | `GET /api/v1/presence/user/:userId` | ✅ พร้อม |
| Presence API (Batch) | `POST /api/v1/presence/users` | ✅ พร้อม |
| Online Friends | `GET /api/v1/presence/friends/online` | ✅ พร้อม |
| Typing Events | `message.typing` WebSocket | ✅ พร้อม |
| Database Field | `last_active_at` | ✅ พร้อม |

### 🔴 Backend กำลังพัฒนา (รอได้)
| Feature | ETA | Blocking? | Workaround |
|---------|-----|-----------|------------|
| WebSocket `user_status` | 2-3 วัน | ✅ Yes | Polling fallback |
| Typing auto-stop | 2-3 วัน | ❌ No | Local timeout |
| Typing user info | 1 วัน | ❌ No | Local store query |
| Response format | 1 วัน | ❌ No | Compatible code |

### 💡 **สรุป: Frontend สามารถเริ่มได้เลย 100%!**

Backend แนะนำให้:
1. ✅ ทำ local typing timeout (fallback)
2. ✅ Debounce typing events
3. ✅ Polling fallback สำหรับ user status
4. ✅ Mock data testing

---

## 📅 แผนการทำงาน 3 สัปดาห์

### Week 1: Frontend Core Development (วันนี้ - Feb 5)
**เป้าหมาย:** สร้าง UI components และ logic ทั้งหมด พร้อม fallbacks

### Week 2: Backend Integration (Feb 6 - Feb 12)
**เป้าหมาย:** Integrate กับ WebSocket `user_status` event ที่ Backend พร้อมแล้ว

### Week 3: Testing & Polish (Feb 13 - Feb 19)
**เป้าหมาย:** E2E testing, bug fixes, performance optimization

---

## 🚀 Phase 1: Foundation & UI Components (Day 1-3)

### Day 1: Utility Functions & Types

#### 1.1 Format Utilities 🟢
**Priority:** High | **Blocking:** None | **Duration:** 2-3 ชั่วโมง

**Files to Create:**
```
src/utils/time/
  └─ formatLastSeen.ts        - Format last seen time
  └─ formatLastSeen.test.ts   - Unit tests

src/utils/typing/
  └─ formatTypingText.ts      - Format typing indicator text
  └─ formatTypingText.test.ts - Unit tests
```

**Implementation:**

**`src/utils/time/formatLastSeen.ts`**
```typescript
/**
 * แปลง timestamp เป็นข้อความ last seen
 * @example
 * formatLastSeen(new Date()) => "Active now"
 * formatLastSeen(5 mins ago) => "Active 5m ago"
 * formatLastSeen(2 hours ago) => "Active 2h ago"
 */
export const formatLastSeen = (lastActiveTime: Date | null): string => {
  if (!lastActiveTime) return 'Offline';

  const now = new Date();
  const diff = now.getTime() - lastActiveTime.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  // Active now (< 1 minute)
  if (minutes < 1) return 'Active now';

  // Minutes ago (< 1 hour)
  if (minutes < 60) return `Active ${minutes}m ago`;

  // Hours ago (< 24 hours)
  if (hours < 24) return `Active ${hours}h ago`;

  // Yesterday
  if (days === 1) return 'Active yesterday';

  // More than 1 day
  return `Last seen ${lastActiveTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })}`;
};

/**
 * แปลง timestamp เป็นข้อความสั้น (สำหรับ mobile)
 */
export const formatLastSeenShort = (lastActiveTime: Date | null): string => {
  if (!lastActiveTime) return 'Offline';

  const now = new Date();
  const diff = now.getTime() - lastActiveTime.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return '1d';
  return `${days}d`;
};
```

**`src/utils/typing/formatTypingText.ts`**
```typescript
interface TypingUser {
  user_id: string;
  username?: string;
  display_name?: string;
}

/**
 * Format typing indicator text
 * @example
 * [John] => "John is typing..."
 * [John, Sarah] => "John and Sarah are typing..."
 * [John, Sarah, Mike, Anna] => "John, Sarah and 2 others are typing..."
 */
export const formatTypingText = (typingUsers: TypingUser[]): string => {
  if (typingUsers.length === 0) return '';

  const names = typingUsers.map(u => u.display_name || u.username || 'Someone');

  if (names.length === 1) {
    return `${names[0]} is typing...`;
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`;
  }

  // 3+ users: "John, Sarah and 2 others are typing..."
  const firstTwo = names.slice(0, 2).join(', ');
  const remaining = names.length - 2;
  return `${firstTwo} and ${remaining} other${remaining > 1 ? 's' : ''} are typing...`;
};
```

**Testing:**
```typescript
// src/utils/time/formatLastSeen.test.ts
describe('formatLastSeen', () => {
  it('แสดง "Active now" เมื่อ < 1 นาที', () => {
    const now = new Date();
    expect(formatLastSeen(now)).toBe('Active now');
  });

  it('แสดง "Active 5m ago" เมื่อผ่านไป 5 นาที', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatLastSeen(fiveMinutesAgo)).toBe('Active 5m ago');
  });

  it('แสดง "Active 2h ago" เมื่อผ่านไป 2 ชั่วโมง', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatLastSeen(twoHoursAgo)).toBe('Active 2h ago');
  });
});
```

**Tasks:**
- [ ] สร้าง `formatLastSeen.ts`
- [ ] สร้าง `formatLastSeenShort.ts`
- [ ] สร้าง `formatTypingText.ts`
- [ ] เขียน unit tests
- [ ] Test ครอบคลุมทุก edge cases

---

#### 1.2 Type Definitions 🟢
**Priority:** High | **Duration:** 30 นาที

**`src/types/typing.types.ts`**
```typescript
export interface TypingUser {
  user_id: string;
  username?: string;
  display_name?: string;
  conversation_id: string;
  is_typing: boolean;
  timestamp?: string;
}

export interface TypingState {
  conversationId: string;
  users: TypingUser[];
  lastUpdate: Date;
}

export interface TypingEventData {
  type: 'message.typing' | 'user_typing';
  data: {
    conversation_id: string;
    user_id: string;
    username?: string;
    display_name?: string;
    is_typing: boolean;
  };
}
```

**`src/types/presence.types.ts`**
```typescript
export interface UserPresence {
  user_id: string;
  status?: 'online' | 'offline' | 'away';  // จาก Backend v2
  is_online: boolean;
  last_seen?: string;        // รองรับ Backend v2
  last_active_at?: string;   // รองรับ Backend v1
}

export interface PresenceResponse {
  success: boolean;
  data: UserPresence | UserPresence[];
}
```

**Tasks:**
- [ ] สร้าง `typing.types.ts`
- [ ] สร้าง `presence.types.ts`
- [ ] Update `websocket.types.ts` ถ้าจำเป็น

---

### Day 2: UI Components

#### 2.1 Typing Indicator Component 🟢
**Priority:** High | **Duration:** 3-4 ชั่วโมง

**`src/components/shared/TypingIndicator.tsx`**
```typescript
import React from 'react';
import { formatTypingText } from '@/utils/typing/formatTypingText';
import { AnimatedDots } from './AnimatedDots';
import type { TypingUser } from '@/types/typing.types';

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  className = ''
}) => {
  if (typingUsers.length === 0) {
    return null;
  }

  const text = formatTypingText(typingUsers);

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 text-sm text-gray-500 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span>{text}</span>
      <AnimatedDots />
    </div>
  );
};
```

**`src/components/shared/AnimatedDots.tsx`**
```typescript
import React from 'react';

export const AnimatedDots: React.FC = () => {
  return (
    <span className="inline-flex gap-1">
      <span className="animate-bounce delay-0">.</span>
      <span className="animate-bounce delay-100">.</span>
      <span className="animate-bounce delay-200">.</span>
    </span>
  );
};
```

**CSS Animation (in `src/index.css`):**
```css
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.animate-bounce {
  animation: bounce 1s ease-in-out infinite;
}

.delay-0 { animation-delay: 0s; }
.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
```

**Tasks:**
- [ ] สร้าง `TypingIndicator.tsx`
- [ ] สร้าง `AnimatedDots.tsx`
- [ ] เพิ่ม CSS animations
- [ ] ทดสอบกับ mock data (1, 2, 3+ users)

---

#### 2.2 Online Status Badge 🟢
**Priority:** High | **Duration:** 1-2 ชั่วโมง

**`src/components/shared/OnlineStatusBadge.tsx`**
```typescript
import React from 'react';
import { cn } from '@/lib/utils';

interface OnlineStatusBadgeProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  showOffline?: boolean;
  className?: string;
}

export const OnlineStatusBadge: React.FC<OnlineStatusBadgeProps> = ({
  isOnline,
  size = 'md',
  showOffline = false,
  className
}) => {
  if (!isOnline && !showOffline) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const colorClasses = isOnline
    ? 'bg-green-500 ring-white'
    : 'bg-gray-400 ring-white';

  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 block rounded-full ring-2',
        sizeClasses[size],
        colorClasses,
        className
      )}
      aria-label={isOnline ? 'Online' : 'Offline'}
    />
  );
};
```

**Tasks:**
- [ ] สร้าง `OnlineStatusBadge.tsx`
- [ ] Support multiple sizes (sm, md, lg)
- [ ] Responsive design

---

### Day 3: Hooks & Logic

#### 3.1 Typing Indicator Hook 🟢
**Priority:** Critical | **Duration:** 4-5 ชั่วโมง

**`src/hooks/useTypingIndicator.ts`**
```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { useDebouncedCallback } from 'use-debounce';
import type { TypingUser } from '@/types/typing.types';

interface UseTypingIndicatorOptions {
  conversationId: string;
  currentUserId?: string;
  autoStopTimeout?: number; // default: 5000ms
}

export const useTypingIndicator = ({
  conversationId,
  currentUserId,
  autoStopTimeout = 5000
}: UseTypingIndicatorOptions) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const { addEventListener, send, isConnected } = useWebSocketContext();

  // Auto-stop timers for each user
  const typingTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Track if current user is typing
  const isTypingRef = useRef(false);

  /**
   * Handle incoming typing events from WebSocket
   */
  const handleTypingEvent = useCallback((data: any) => {
    if (!data?.data) return;

    const eventData = data.data;

    // Ignore if not for this conversation
    if (eventData.conversation_id !== conversationId) return;

    // Ignore current user's typing
    if (currentUserId && eventData.user_id === currentUserId) return;

    const userId = eventData.user_id;
    const isTyping = eventData.is_typing;

    // Clear existing timer for this user
    const existingTimer = typingTimers.current.get(userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      typingTimers.current.delete(userId);
    }

    if (isTyping) {
      // Add or update user in typing list
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.user_id !== userId);
        return [
          ...filtered,
          {
            user_id: userId,
            username: eventData.username,
            display_name: eventData.display_name,
            conversation_id: conversationId,
            is_typing: true,
            timestamp: new Date().toISOString()
          }
        ];
      });

      // Set auto-stop timer (fallback if backend doesn't send stop event)
      const timer = setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.user_id !== userId));
        typingTimers.current.delete(userId);
      }, autoStopTimeout);

      typingTimers.current.set(userId, timer);
    } else {
      // Remove user from typing list
      setTypingUsers(prev => prev.filter(u => u.user_id !== userId));
    }
  }, [conversationId, currentUserId, autoStopTimeout]);

  /**
   * Listen to WebSocket typing events
   * รองรับทั้ง 'message.typing' (old) และ 'user_typing' (new)
   */
  useEffect(() => {
    const unsubscribeOld = addEventListener('message.typing', handleTypingEvent);
    const unsubscribeNew = addEventListener('user_typing', handleTypingEvent);

    return () => {
      unsubscribeOld();
      unsubscribeNew();
    };
  }, [addEventListener, handleTypingEvent]);

  /**
   * Send typing event to server (debounced)
   * ส่งไม่เกิน 1 ครั้ง/วินาที
   */
  const sendTypingDebounced = useDebouncedCallback((isTyping: boolean) => {
    if (!isConnected) return;

    send('message.typing', {
      conversation_id: conversationId,
      is_typing: isTyping
    });
  }, 1000, { leading: true, trailing: false });

  /**
   * Start typing
   */
  const startTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingDebounced(true);
    }
  }, [sendTypingDebounced]);

  /**
   * Stop typing
   */
  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTypingDebounced(false);
    }
  }, [sendTypingDebounced]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clear all timers
      typingTimers.current.forEach(timer => clearTimeout(timer));
      typingTimers.current.clear();

      // Send stop typing if was typing
      if (isTypingRef.current) {
        send('message.typing', {
          conversation_id: conversationId,
          is_typing: false
        });
      }
    };
  }, [conversationId, send]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
    isTyping: isTypingRef.current
  };
};
```

**Tasks:**
- [ ] สร้าง `useTypingIndicator.ts`
- [ ] Implement auto-stop fallback (5 วินาที)
- [ ] Debounce outgoing events (1 วินาที)
- [ ] รองรับทั้ง old และ new event types
- [ ] เขียน unit tests

---

#### 3.2 Enhanced Online Status Hook 🟢
**Priority:** Medium | **Duration:** 2-3 ชั่วโมง

**ปรับปรุง `src/hooks/useOnlineStatus.ts`:**

```typescript
// เพิ่มใน useOnlineStatus hook

/**
 * Polling fallback สำหรับกรณี WebSocket disconnect
 * Poll ทุก 30 วินาที
 */
useEffect(() => {
  if (isConnected || userIds.length === 0) return;

  // Poll immediately
  fetchUserStatuses(userIds);

  // Set interval polling
  const interval = setInterval(() => {
    fetchUserStatuses(userIds);
  }, 30000); // 30 seconds

  return () => clearInterval(interval);
}, [isConnected, userIds, fetchUserStatuses]);

/**
 * Get user status with compatibility
 * รองรับทั้ง last_seen และ last_active_at
 */
const getUserStatus = useCallback((userId: string): UserPresence | null => {
  const status = userStatuses[userId];
  if (!status) return null;

  return {
    user_id: userId,
    status: status.status || (status.is_online ? 'online' : 'offline'),
    is_online: status.status === 'online' || status.is_online,
    last_seen: status.last_seen || status.last_active_at,
    last_active_at: status.last_active_at
  };
}, [userStatuses]);
```

**Tasks:**
- [ ] เพิ่ม polling fallback (30 วินาที)
- [ ] เพิ่ม compatibility layer
- [ ] รองรับ `last_seen` และ `last_active_at`

---

## 🚀 Phase 2: Integration (Day 4-5)

### Day 4: Chat Components Integration

#### 4.1 Chat Header Enhancement 🟢
**Priority:** Critical | **Duration:** 3-4 ชั่วโมง

**ปรับปรุง `src/components/standard/conversation/ChatHeader.tsx`:**

```typescript
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatLastSeen } from '@/utils/time/formatLastSeen';
import { OnlineStatusBadge } from '@/components/shared/OnlineStatusBadge';

// ใน ChatHeader component
const ChatHeader: React.FC<ChatHeaderProps> = ({ conversation }) => {
  const chatPartnerId = conversation.participants?.[0]?.user_id;

  const {
    isUserOnline,
    getLastActiveTime,
    isLoading
  } = useOnlineStatus(chatPartnerId ? [chatPartnerId] : []);

  const isOnline = chatPartnerId ? isUserOnline(chatPartnerId) : false;
  const lastActiveTime = chatPartnerId ? getLastActiveTime(chatPartnerId) : null;

  return (
    <div className="flex items-center gap-3 p-4 border-b">
      {/* Avatar with online badge */}
      <div className="relative">
        <Avatar>
          <AvatarImage src={conversation.avatar} />
          <AvatarFallback>{conversation.name?.[0]}</AvatarFallback>
        </Avatar>

        {!isLoading && (
          <OnlineStatusBadge
            isOnline={isOnline}
            size="md"
            className="bottom-0 right-0"
          />
        )}
      </div>

      {/* Name and status */}
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold truncate">
          {conversation.name}
        </h2>

        {!isLoading && (
          <p className="text-sm text-gray-500">
            {isOnline ? (
              <span className="text-green-600">● Online</span>
            ) : (
              <span>{formatLastSeen(lastActiveTime)}</span>
            )}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* ... existing actions ... */}
      </div>
    </div>
  );
};
```

**Tasks:**
- [ ] Integrate `useOnlineStatus` hook
- [ ] แสดง online status badge
- [ ] แสดง "Online" หรือ "Last seen X ago"
- [ ] Loading state
- [ ] Responsive design

---

#### 4.2 Message Input with Typing 🟢
**Priority:** Critical | **Duration:** 3-4 ชั่วโมง

**ปรับปรุง `src/components/shared/MessageInput.tsx`:**

```typescript
import { useTypingIndicator } from '@/hooks/useTypingIndicator';

const MessageInput: React.FC<MessageInputProps> = ({ conversationId }) => {
  const [value, setValue] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const { startTyping, stopTyping } = useTypingIndicator({
    conversationId,
    currentUserId: currentUser?.id,
    autoStopTimeout: 5000
  });

  /**
   * Handle input change
   * - ส่ง typing start
   * - Set timeout สำหรับ typing stop (3 วินาที)
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (newValue.trim()) {
      // เริ่มพิมพ์
      startTyping();

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout สำหรับ auto-stop (3 วินาที)
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 3000);
    } else {
      // ถ้าลบข้อความหมดแล้ว หยุดพิมพ์ทันที
      stopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  /**
   * Handle send message
   * - หยุด typing
   * - ส่งข้อความ
   */
  const handleSendMessage = async () => {
    if (!value.trim()) return;

    // หยุด typing indicator ทันที
    stopTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // ส่งข้อความ
    await sendMessage(value);
    setValue('');
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping();
    };
  }, [stopTyping]);

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="w-full p-3 rounded-lg"
      />

      <button onClick={handleSendMessage}>
        Send
      </button>
    </div>
  );
};
```

**Tasks:**
- [ ] Integrate `useTypingIndicator` hook
- [ ] ส่ง typing start เมื่อเริ่มพิมพ์
- [ ] Auto-stop หลัง 3 วินาที idle
- [ ] Stop typing เมื่อส่งข้อความ
- [ ] Cleanup on unmount

---

#### 4.3 Message Area with Typing Indicator 🟢
**Priority:** Critical | **Duration:** 2 ชั่วโมง

**ปรับปรุง `src/components/shared/MessageArea.tsx`:**

```typescript
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { TypingIndicator } from '@/components/shared/TypingIndicator';

const MessageArea: React.FC<MessageAreaProps> = ({ conversationId }) => {
  const { typingUsers } = useTypingIndicator({
    conversationId,
    currentUserId: currentUser?.id
  });

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <VirtualMessageList messages={messages} />
      </div>

      {/* Typing indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Input */}
      <MessageInput conversationId={conversationId} />
    </div>
  );
};
```

**Tasks:**
- [ ] เพิ่ม `TypingIndicator` component
- [ ] แสดงเหนือ MessageInput
- [ ] Smooth fade in/out animation

---

### Day 5: Testing & Refinement

#### 5.1 Mock Data Testing 🟢
**Priority:** High | **Duration:** 3-4 ชั่วโมง

**`src/utils/test/mockWebSocketEvents.ts`**
```typescript
/**
 * Mock WebSocket events สำหรับทดสอบ
 */
export const mockTypingEvent = (userId: string, isTyping: boolean) => ({
  type: 'message.typing',
  data: {
    conversation_id: 'test-conv-123',
    user_id: userId,
    username: 'john_doe',
    display_name: 'John Doe',
    is_typing: isTyping
  }
});

export const mockUserStatusEvent = (userId: string, status: 'online' | 'offline') => ({
  type: 'user_status',
  data: {
    user_id: userId,
    status: status,
    timestamp: new Date().toISOString(),
    ...(status === 'offline' && { last_seen: new Date().toISOString() })
  }
});

/**
 * Helper function เพื่อ simulate typing events
 */
export const simulateTyping = (userId: string, duration: number = 3000) => {
  // Start typing
  window.dispatchEvent(new CustomEvent('websocket:message', {
    detail: mockTypingEvent(userId, true)
  }));

  // Stop typing after duration
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('websocket:message', {
      detail: mockTypingEvent(userId, false)
    }));
  }, duration);
};
```

**Test Cases:**
```typescript
describe('TypingIndicator', () => {
  it('แสดง 1 user typing', () => {
    simulateTyping('user1');
    // expect: "John Doe is typing..."
  });

  it('แสดง 2 users typing', () => {
    simulateTyping('user1');
    simulateTyping('user2');
    // expect: "John Doe and Jane Smith are typing..."
  });

  it('หายไปหลัง 5 วินาที', async () => {
    simulateTyping('user1', 6000);
    await wait(6000);
    // expect: typing indicator ควรหายไป
  });
});
```

**Tasks:**
- [ ] สร้าง mock WebSocket events
- [ ] ทดสอบ TypingIndicator component
- [ ] ทดสอบ OnlineStatusBadge component
- [ ] ทดสอบ formatLastSeen utility
- [ ] ทดสอบ useTypingIndicator hook

---

## 🚀 Phase 3: Backend Integration (Week 2: Feb 6-12)

### Day 6-7: WebSocket `user_status` Integration

**เมื่อ Backend พร้อม (ETA: Feb 5):**

#### 6.1 Update Event Listeners 🟡
**Priority:** High | **Duration:** 2 ชั่วโมง

**ปรับปรุง `src/hooks/useOnlineStatus.ts`:**
```typescript
// เพิ่ม listener สำหรับ user_status event (new)
const unsubscribeUserStatus = addEventListener('user_status', (data) => {
  if (data?.data?.user_id) {
    const userId = data.data.user_id;
    const status = data.data.status; // 'online' | 'offline'
    const lastSeen = data.data.last_seen; // เฉพาะ offline
    const timestamp = data.data.timestamp || new Date().toISOString();

    updateUserStatus(userId, status === 'online', lastSeen || timestamp);
  }
});
```

**Tasks:**
- [ ] เพิ่ม event listener สำหรับ `user_status`
- [ ] รองรับ `last_seen` field
- [ ] รองรับทั้ง old และ new events
- [ ] ทดสอบกับ Backend ที่พร้อมแล้ว

---

#### 6.2 Remove Polling Fallback 🟡
**Priority:** Medium | **Duration:** 30 นาที

```typescript
// ลบ polling fallback ออก (optional)
// เพราะมี WebSocket real-time แล้ว
```

**Tasks:**
- [ ] ประเมินว่าควรเก็บ polling ไว้หรือไม่
- [ ] ถ้าลบ ให้ทดสอบว่า WebSocket reconnect ทำงานดี

---

### Day 8-9: Typing Enhancements Integration

#### 8.1 Backend Auto-Stop Integration 🟡
**Priority:** Low | **Duration:** 1 ชั่วโมง

**เมื่อ Backend มี auto-stop แล้ว:**
```typescript
// Local timeout ยังคงเก็บไว้เป็น fallback
// แต่ควรจะไม่ trigger เพราะ Backend จัดการแล้ว
```

**Tasks:**
- [ ] ทดสอบว่า Backend auto-stop ทำงานจริง
- [ ] เก็บ local timeout เป็น fallback
- [ ] Log ถ้า local timeout trigger (debug)

---

#### 8.2 User Info in Typing Events 🟡
**Priority:** Medium | **Duration:** 1 ชั่วโมง

**เมื่อ Backend ส่ง username และ display_name แล้ว:**
```typescript
// useTypingIndicator จะได้รับ username และ display_name อัตโนมัติ
// ไม่ต้อง query จาก local store อีกแล้ว
```

**Tasks:**
- [ ] ตรวจสอบว่า Backend ส่งข้อมูลครบ
- [ ] ลบ code ที่ query user info จาก local store (ถ้ามี)
- [ ] ทดสอบกับ group chat (3+ users)

---

### Day 10: Integration Testing

#### 10.1 E2E Tests 🟢
**Priority:** Critical | **Duration:** Full day

**Test Scenarios:**
```typescript
// 1. Online Status
- [ ] User A login → User B เห็น "Online" real-time
- [ ] User A logout → User B เห็น "Last seen X ago"
- [ ] Network disconnect → Status อัพเดทภายใน 5 นาที (TTL)

// 2. Typing Indicator
- [ ] User A พิมพ์ → User B เห็น "User A is typing..."
- [ ] User A หยุดพิมพ์ → Typing indicator หายไปภายใน 5 วินาที
- [ ] Group chat: 2 users พิมพ์ → แสดง "User A and User B are typing..."
- [ ] 3+ users พิมพ์ → แสดง "User A, User B and 2 others are typing..."

// 3. Edge Cases
- [ ] WebSocket disconnect → Polling fallback ทำงาน
- [ ] Rapid typing → Debounce ทำงาน (ส่งไม่เกิน 1 event/วินาที)
- [ ] User ส่งข้อความ → Typing indicator หายไปทันที
```

**Tasks:**
- [ ] เขียน E2E tests
- [ ] Manual testing กับ Backend จริง
- [ ] Performance testing
- [ ] Cross-browser testing

---

## 🚀 Phase 4: Polish & Optimization (Week 3: Feb 13-19)

### Day 11-12: UI/UX Polish

#### 11.1 Animations & Transitions 🟢
**Priority:** Medium | **Duration:** 3-4 ชั่วโมง

```css
/* Typing indicator fade in/out */
.typing-indicator {
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Online badge pulse */
.online-badge {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

**Tasks:**
- [ ] Smooth fade in/out สำหรับ typing indicator
- [ ] Pulse animation สำหรับ online badge
- [ ] Skeleton loading states
- [ ] Error states

---

#### 11.2 Mobile Responsive 🟢
**Priority:** High | **Duration:** 2-3 ชั่วโมง

**Mobile optimizations:**
- ใช้ `formatLastSeenShort()` แทน `formatLastSeen()`
- เล็กลง online badge
- ปรับ typing indicator ให้กะทัดรัด

**Tasks:**
- [ ] Mobile layout testing
- [ ] Tablet layout testing
- [ ] Touch interactions

---

### Day 13-14: Performance Optimization

#### 13.1 Memoization 🟢
**Priority:** Medium | **Duration:** 2-3 ชั่วโมง

```typescript
// Memoize expensive calculations
const sortedTypingUsers = useMemo(() => {
  return typingUsers.sort((a, b) =>
    (a.display_name || a.username || '').localeCompare(
      b.display_name || b.username || ''
    )
  );
}, [typingUsers]);

// Memoize components
export const TypingIndicator = React.memo(({ typingUsers }) => {
  // ...
});
```

**Tasks:**
- [ ] Memoize TypingIndicator component
- [ ] Memoize format functions
- [ ] Profile performance
- [ ] Optimize re-renders

---

#### 13.2 Bundle Size Optimization 🟢
**Priority:** Low | **Duration:** 1-2 ชั่วโมง

```typescript
// Code splitting
const TypingIndicator = lazy(() => import('@/components/shared/TypingIndicator'));

// Tree shaking
import { formatLastSeen } from '@/utils/time/formatLastSeen';
// แทน
import * as timeUtils from '@/utils/time';
```

**Tasks:**
- [ ] Code splitting สำหรับ optional components
- [ ] Tree shaking utilities
- [ ] Analyze bundle size

---

### Day 15: Final Testing & Documentation

#### 15.1 Comprehensive Testing 🟢
**Priority:** Critical | **Duration:** Full day

**Test Coverage:**
- [ ] Unit tests: 80%+
- [ ] Integration tests: ทุก critical paths
- [ ] E2E tests: ทุก user flows
- [ ] Performance tests: < 100ms response time

---

#### 15.2 Documentation 🟢
**Priority:** High | **Duration:** 2-3 ชั่วโมง

**สร้างเอกสาร:**
- [ ] API usage guide
- [ ] Component documentation
- [ ] Troubleshooting guide
- [ ] Performance tips

---

## 📊 Progress Tracking

### Week 1 (Jan 30 - Feb 5)
| Day | Tasks | Status | Notes |
|-----|-------|--------|-------|
| Day 1 | Utilities & Types | ⏳ Todo | formatLastSeen, formatTypingText |
| Day 2 | UI Components | ⏳ Todo | TypingIndicator, OnlineStatusBadge |
| Day 3 | Hooks | ⏳ Todo | useTypingIndicator enhancements |
| Day 4 | Chat Integration | ⏳ Todo | ChatHeader, MessageInput |
| Day 5 | Testing | ⏳ Todo | Mock data tests |

### Week 2 (Feb 6 - Feb 12)
| Day | Tasks | Status | Blocking |
|-----|-------|--------|----------|
| Day 6-7 | Backend Integration | 🔴 Blocked | รอ Backend `user_status` |
| Day 8-9 | Typing Enhancements | 🔴 Blocked | รอ Backend user info |
| Day 10 | E2E Testing | 🔴 Blocked | รอ Week 2 Day 1-9 |

### Week 3 (Feb 13 - Feb 19)
| Day | Tasks | Status | Notes |
|-----|-------|--------|-------|
| Day 11-12 | UI/UX Polish | ⏳ Planned | Animations, responsive |
| Day 13-14 | Performance | ⏳ Planned | Memoization, optimization |
| Day 15 | Final Testing | ⏳ Planned | Comprehensive tests |

---

## 🎯 Success Criteria

### Must Have (MVP)
- ✅ แสดง online/offline status ใน Chat Header
- ✅ แสดง "Last seen X ago" สำหรับ offline users
- ✅ Typing indicator: "User is typing..."
- ✅ Typing auto-hide หลัง 5 วินาที
- ✅ Group chat typing: แสดงหลาย users

### Should Have
- ✅ Smooth animations
- ✅ Mobile responsive
- ✅ Polling fallback
- ✅ Error handling

### Nice to Have
- 🟢 Privacy settings (hide last seen)
- 🟢 Away status detection
- 🟢 Typing in conversation list

---

## 🚨 Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend delay | 🔴 High | ใช้ polling fallback + local timeout |
| WebSocket disconnect | 🟡 Medium | Auto-reconnect + polling fallback |
| Performance issues | 🟡 Medium | Memoization + debouncing |
| Mobile layout issues | 🟢 Low | Responsive design + testing |

---

## 📞 Communication Plan

### Daily Standup (10 AM)
- อัพเดทความคืบหน้า
- Report blockers
- Sync กับ Backend team

### Weekly Demo (Friday 3 PM)
- Demo features ที่เสร็จแล้ว
- Feedback session
- Plan สัปดาห์ถัดไป

### Backend Sync
- ทุกวัน: Check Backend progress
- Day 5: Backend ETA confirmation
- Day 6: Integration testing start

---

## 📋 Checklist Summary

### Can Start Now ✅
- [ ] Day 1: Utility functions (formatLastSeen, formatTypingText)
- [ ] Day 1: Type definitions
- [ ] Day 2: TypingIndicator component
- [ ] Day 2: OnlineStatusBadge component
- [ ] Day 3: useTypingIndicator hook
- [ ] Day 3: Polling fallback
- [ ] Day 4: ChatHeader integration
- [ ] Day 4: MessageInput integration
- [ ] Day 5: Mock data testing

### Waiting for Backend 🔴
- [ ] Day 6-7: WebSocket `user_status` integration (ETA: Feb 5)
- [ ] Day 8-9: Typing user info integration (ETA: Feb 7)
- [ ] Day 10: E2E testing with real Backend

### Future Enhancements 🟢
- [ ] Privacy settings
- [ ] Away status detection
- [ ] Advanced animations

---

## 🎉 Next Steps

1. **เริ่มทันที:**
   - สร้าง utility functions (Day 1)
   - สร้าง UI components (Day 2)
   - Mock data testing (Day 5)

2. **ติดตาม Backend:**
   - Daily check-in กับ Backend team
   - รอ `user_status` event (ETA: 2-3 วัน)

3. **Prepare for Integration:**
   - เตรียม compatibility layer
   - เตรียม integration tests
   - เตรียม E2E test scenarios

---

**พร้อมเริ่มเลยไหมครับ?** 🚀

ผมแนะนำเริ่มจาก **Day 1: Utility Functions** ก่อน เพราะไม่ blocked และใช้เวลาไม่นาน (2-3 ชั่วโมง)

---

**สร้างโดย:** Claude Code Assistant
**Version:** 1.0.0
**Last Updated:** 2025-01-30
