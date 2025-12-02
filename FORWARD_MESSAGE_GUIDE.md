# Forward Message Feature Guide

## 📋 Overview
Forward Message feature ช่วยให้ผู้ใช้สามารถส่งต่อข้อความไปยัง conversation อื่นๆ ได้อย่างรวดเร็ว โดยรองรับการเลือกหลายข้อความพร้อมกัน

---

## 🎯 User Workflow (ขั้นตอนการใช้งาน)

### 1️⃣ เข้าสู่ Selection Mode
**วิธีการ:** คลิกค้างข้อความ (Long Press) นาน 500ms

**สิ่งที่เกิดขึ้น:**
- ✅ ระบบเข้าสู่ Selection Mode ทันที
- ✅ Checkbox ปรากฏที่ด้านซ้ายของทุกข้อความ
- ✅ ข้อความที่คลิกค้างจะถูกเลือกอัตโนมัติ (checkbox ติ๊ก)
- ✅ Background ของข้อความที่เลือกเปลี่ยนเป็น `bg-accent/30`
- ✅ Selection Toolbar ปรากฏที่ด้านบนของหน้าจอ
- ✅ Context Menu (right-click) จะถูกซ่อน (ป้องกันความสับสน)

**Technical Implementation:**
```typescript
// useLongPress hook
const longPressHandlers = useLongPress({
  onLongPress: () => {
    if (!message.is_deleted && !isSelectionMode) {
      longPressFiredRef.current = true;
      enterSelectionMode(message.id); // Auto-select first message
    }
  },
  threshold: 500, // 500ms
});
```

---

### 2️⃣ เลือกข้อความเพิ่มเติม
**วิธีการ:** คลิกที่ข้อความอื่นๆ (ไม่ต้องคลิกค้าง)

**สิ่งที่เกิดขึ้น:**
- ✅ คลิกครั้งแรก → เลือกข้อความ (checkbox ติ๊ก, background highlight)
- ✅ คลิกอีกครั้ง → ยกเลิกการเลือก (checkbox เอาออก, background กลับมาปกติ)
- ✅ จำนวนข้อความที่เลือกแสดงที่ Selection Toolbar
- ✅ สามารถเลือกได้ไม่จำกัดจำนวน

**Technical Implementation:**
```typescript
const handleClick = useCallback((e: React.MouseEvent) => {
  // Skip if long press just fired
  if (longPressFiredRef.current) {
    longPressFiredRef.current = false;
    return;
  }

  // Toggle selection
  if (isSelectionMode && !message.is_deleted) {
    toggleMessageSelection(message.id);
  }
}, [isSelectionMode, message.id, toggleMessageSelection]);
```

**หมายเหตุ:**
- ❌ ไม่สามารถเลือกข้อความที่ถูกลบแล้ว (`is_deleted: true`)
- ✅ สามารถเลือกข้อความทุกประเภท: text, image, album, file, sticker, reply

---

### 3️⃣ กดปุ่ม Forward
**วิธีการ:** คลิกปุ่ม "Forward" ใน Selection Toolbar

**สิ่งที่เกิดขึ้น:**
- ✅ Dialog "Forward Message" เปิดขึ้น
- ✅ แสดงรายการ Conversations ทั้งหมดที่สามารถส่งต่อได้
- ✅ มี Search Bar สำหรับค้นหา conversation
- ✅ แสดงจำนวนข้อความที่เลือกไว้ (เช่น "Forward 3 messages")

**Dialog Components:**
- **Conversation List:** แสดง conversation ทั้งหมด (ยกเว้น conversation ปัจจุบัน)
- **Search:** ค้นหาตามชื่อ conversation
- **Checkbox:** เลือก conversation ที่ต้องการส่งต่อ (รองรับเลือกหลาย conversation)
- **Selected Count:** แสดงจำนวน conversation ที่เลือกแล้ว

---

### 4️⃣ เลือก Conversation ปลายทาง
**วิธีการ:** คลิก Checkbox หน้า conversation ที่ต้องการส่งต่อ

**สิ่งที่เกิดขึ้น:**
- ✅ Checkbox ติ๊ก (สามารถเลือกได้หลาย conversation)
- ✅ ปุ่ม "Forward" ด้านล่างแสดงจำนวน conversation ที่เลือก
- ✅ สามารถค้นหา conversation ได้ (search real-time)

**ตัวอย่าง:**
```
Selected: 2 conversations
- "อยากกินอะไรดี" (1-on-1 chat)
- "ทีมงาน Marketing" (Group chat)
```

---

### 5️⃣ ยืนยัน Forward
**วิธีการ:** คลิกปุ่ม "Forward" ใน Dialog

**สิ่งที่เกิดขึ้น:**

#### **Frontend Process:**
1. ✅ รวบรวม `messageIds` ที่เลือกไว้
2. ✅ รวบรวม `conversationIds` ปลายทาง
3. ✅ เรียก API `POST /api/messages/forward`
4. ✅ แสดง Loading State (ปุ่ม disabled, loading spinner)

#### **Backend Process:**
1. ✅ รับ request:
   ```json
   {
     "message_ids": ["uuid1", "uuid2", "uuid3"],
     "target_conversation_ids": ["conv1", "conv2"]
   }
   ```
2. ✅ ตรวจสอบ permissions:
   - ผู้ใช้เป็นสมาชิกของ conversation ต้นทาง
   - ผู้ใช้เป็นสมาชิกของ conversation ปลายทาง
   - Messages ไม่ถูกลบ
3. ✅ คัดลอกข้อความ:
   - สร้าง message ใหม่ใน target conversations
   - คัดลอก content, media_url, file_url, etc.
   - รักษา message_type (text, image, album, file)
   - **ไม่คัดลอก:** replies, reactions, read status
4. ✅ ส่ง WebSocket event:
   - ส่ง `new_message` event ไปยังสมาชิกของ target conversations
   - Real-time update ทันที (ไม่ต้อง refresh)
5. ✅ Return response:
   ```json
   {
     "success": true,
     "forwarded_count": 6,
     "details": [
       {
         "conversation_id": "conv1",
         "message_count": 3
       },
       {
         "conversation_id": "conv2",
         "message_count": 3
       }
     ]
   }
   ```

#### **Frontend After Success:**
1. ✅ ปิด Dialog
2. ✅ แสดง Toast notification: "Forwarded 3 messages to 2 conversations"
3. ✅ ออกจาก Selection Mode อัตโนมัติ
4. ✅ Clear selected messages
5. ✅ กลับสู่หน้าจอ chat ปกติ

---

## 🎨 UI/UX Details

### Selection Mode Visual States

**Checkbox Position:**
- 📍 ด้านซ้ายของข้อความทุกข้อความ
- 📍 Margin: `mr-3` (12px spacing)

**Selected Message Style:**
```css
/* Selected state */
.selected-message {
  background-color: var(--accent) / 0.3; /* bg-accent/30 */
  transition: background-color 200ms;
}

/* Normal state */
.normal-message {
  background-color: transparent;
}
```

**Selection Toolbar:**
- 📍 Position: Top of screen (sticky)
- 📍 Background: `bg-background` with border
- 📍 Content:
  - Left: Selected count (e.g., "3 selected")
  - Right: "Cancel" and "Forward" buttons

---

## 📊 Message Type Support

### ✅ Supported Message Types
| Type | Support | Notes |
|------|---------|-------|
| Text | ✅ | รวมทั้ง link, mention |
| Image | ✅ | คัดลอก media_url |
| Album | ✅ | คัดลอก album_files array |
| File | ✅ | คัดลอก file_url |
| Video | ✅ | คัดลอก media_url + thumbnail |
| Sticker | ✅ | คัดลอก sticker_url |
| Reply | ✅ | **แต่ reply_to reference หายไป** (forward เป็น plain message) |

### ❌ Limitations
- ❌ ไม่สามารถ forward ข้อความที่ถูกลบ (`is_deleted: true`)
- ❌ ไม่สามารถ forward ไปยัง conversation ที่ไม่มีสิทธิ์
- ❌ Reply reference ไม่ถูกคัดลอก (กลายเป็น standalone message)
- ❌ Reactions ไม่ถูกคัดลอก
- ❌ Read status ไม่ถูกคัดลอก

---

## 🔐 Security & Permissions

### Permission Checks
1. **Source Conversation:**
   - ✅ ผู้ใช้ต้องเป็นสมาชิกของ conversation ต้นทาง
   - ✅ Messages ต้องไม่ถูกลบ

2. **Target Conversations:**
   - ✅ ผู้ใช้ต้องเป็นสมาชิกของทุก conversation ที่เลือก
   - ✅ Conversation ต้อง active (ไม่ถูกลบ)
   - ✅ Group chat: ต้องไม่ถูก kick/ban

### Data Privacy
- ✅ Media files: ใช้ URL เดิม (ไม่ duplicate storage)
- ✅ Sender info: แสดงผู้ส่งเดิมหรือผู้ forward (ขึ้นกับ backend implementation)
- ✅ Timestamp: ใช้เวลาที่ forward (ไม่ใช่เวลาต้นฉบับ)

---

## 🔄 Real-time Updates (WebSocket)

### Events Triggered
```typescript
// Event ที่ส่งไปยัง target conversations
{
  type: 'new_message',
  conversation_id: 'conv1',
  message: {
    id: 'new-uuid',
    sender_id: 'forwarder-uuid',
    message_type: 'text',
    content: 'forwarded content',
    is_forwarded: true, // Optional: flag to indicate forwarded
    created_at: '2025-01-01T12:00:00Z'
  }
}
```

### Frontend Handling
1. ✅ WebSocket listener รับ `new_message` event
2. ✅ เพิ่ม message เข้า conversation messages array
3. ✅ Scroll to bottom (ถ้า user อยู่ที่ bottom)
4. ✅ แสดง notification (ถ้า conversation ไม่ใช่ active)

---

## 🧪 Testing Scenarios

### Test Cases

#### 1. Basic Forward (1 message → 1 conversation)
- [ ] Long press message
- [ ] Click Forward
- [ ] Select 1 target conversation
- [ ] Click Forward
- [ ] ✅ Message ปรากฏใน target conversation
- [ ] ✅ Selection mode exits
- [ ] ✅ Toast notification แสดง

#### 2. Multiple Messages → Multiple Conversations
- [ ] Long press first message
- [ ] Click 2 more messages (total 3)
- [ ] Click Forward
- [ ] Select 2 target conversations
- [ ] Click Forward
- [ ] ✅ 3 messages ปรากฏใน 2 conversations (total 6 messages created)

#### 3. Forward Album
- [ ] Long press album message
- [ ] Click Forward
- [ ] Select target conversation
- [ ] Click Forward
- [ ] ✅ Album ปรากฏใน target conversation
- [ ] ✅ Images และ files ทั้งหมดครบถ้วน

#### 4. Cancel Selection Mode
- [ ] Long press message
- [ ] Click Cancel in toolbar
- [ ] ✅ Selection mode exits
- [ ] ✅ Checkboxes หายไป
- [ ] ✅ กลับสู่ normal mode

#### 5. Permission Error
- [ ] Long press message
- [ ] Click Forward
- [ ] Select conversation ที่ไม่มีสิทธิ์
- [ ] Click Forward
- [ ] ✅ Error message แสดง
- [ ] ✅ Dialog ยังเปิดอยู่ (ไม่ปิด)

---

## 📁 File Structure

```
src/
├── components/
│   ├── shared/
│   │   ├── MessageSelectionToolbar.tsx    # Toolbar with Forward button
│   │   ├── ForwardMessageDialog.tsx       # Dialog for selecting target conversations
│   │   └── VirtualMessageList.tsx         # Handles long press & selection
│   └── ui/
│       └── checkbox.tsx                    # Checkbox component
├── contexts/
│   └── MessageSelectionContext.tsx        # Global selection state
├── hooks/
│   └── useLongPress.ts                    # Long press detection
└── services/
    └── messageService.ts                  # API call for forwarding
```

---

## 🚀 Future Enhancements

### Potential Improvements
1. **Forward with Caption:**
   - เพิ่ม textarea ให้ใส่ caption เพิ่มเติมเมื่อ forward
   - Caption จะแสดงด้านบนของ forwarded messages

2. **Forward History:**
   - แสดงว่าข้อความถูก forward จากไหน (conversation + sender)
   - UI: "Forwarded from: John Doe"

3. **Batch Forward Progress:**
   - แสดง progress bar เมื่อ forward หลาย messages
   - แสดงว่า forward ไปที่ conversation ไหนแล้ว

4. **Forward Preview:**
   - แสดง preview ของข้อความที่เลือกไว้ใน dialog
   - ให้ user ดูก่อนยืนยัน forward

5. **Smart Deduplication:**
   - ตรวจสอบว่า message ซ้ำหรือไม่ (ถ้า forward ไปที่เดิม)
   - แจ้งเตือน: "This message already exists in the conversation"

---

## ❗ Known Issues & Limitations

1. **Reply Reference Lost:**
   - เมื่อ forward reply message → reply_to reference หายไป
   - Solution: เพิ่ม flag `is_forwarded` และ `original_reply_context`

2. **No Undo:**
   - ไม่มีปุ่ม Undo หลัง forward
   - Solution: เพิ่ม "Undo" ใน toast notification (timeout 5 วินาที)

3. **No Forward Count:**
   - ไม่รู้ว่าข้อความถูก forward กี่ครั้ง
   - Solution: เพิ่ม `forward_count` field ใน message

4. **Large Album Performance:**
   - Forward album ที่มี 50+ files อาจช้า
   - Solution: แสดง progress bar, batch upload

---

## 📞 API Reference

### POST /api/messages/forward

**Request:**
```json
{
  "message_ids": ["uuid1", "uuid2"],
  "target_conversation_ids": ["conv1", "conv2"]
}
```

**Response (Success):**
```json
{
  "success": true,
  "forwarded_count": 4,
  "details": [
    {
      "conversation_id": "conv1",
      "message_count": 2,
      "message_ids": ["new-uuid1", "new-uuid2"]
    },
    {
      "conversation_id": "conv2",
      "message_count": 2,
      "message_ids": ["new-uuid3", "new-uuid4"]
    }
  ]
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Permission denied",
  "code": "PERMISSION_DENIED",
  "details": "User is not a member of conversation conv1"
}
```

---

## 🎓 Summary

**Forward Message Feature** ช่วยให้ผู้ใช้สามารถ:
- ✅ เลือกข้อความได้หลายข้อความพร้อมกัน (Long press + Click)
- ✅ ส่งต่อไปยังหลาย conversations ในคลิกเดียว
- ✅ Real-time update ผ่าน WebSocket
- ✅ รองรับทุก message types (text, image, album, file, etc.)
- ✅ UX ที่สะดวก: Checkbox + Selection Toolbar
- ✅ Permission checks เพื่อความปลอดภัย

**Key Technical Points:**
- Long Press (500ms) → Enter Selection Mode
- Click → Toggle Selection
- MessageSelectionContext → Global State Management
- ForwardMessageDialog → UI for selecting targets
- Backend API → Copy messages to target conversations
- WebSocket → Real-time updates

---

**Generated:** 2025-01-02
**Version:** 1.0
**Status:** ✅ Implemented & Working
