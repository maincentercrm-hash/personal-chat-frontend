# 03 - HIGH PRIORITY: ปัญหา Block User

**ลำดับความสำคัญ: 🔴 HIGH PRIORITY**
**ระดับความยาก: ⭐⭐ ปานกลาง**

---

## 📋 รายการปัญหา

### #26: กดบล็อค ต้องรีเฟรช ถึงขึ้นรายชื่อ
**ปัญหา:**
- เมื่อบล็อคผู้ใช้ รายชื่อผู้ถูกบล็อคไม่ update ทันที
- ต้อง refresh หน้าเว็บถึงจะเห็นรายชื่อผู้ถูกบล็อค

**สาเหตุ:**
1. ไม่มี real-time update หลัง block
2. ไม่ได้ refetch blocked users list
3. Local state ไม่ได้ update

**วิธีแก้:**
1. **Optimistic Update:**
   ```typescript
   const handleBlock = async (userId: string) => {
     // Update local state ทันที
     setBlockedUsers(prev => [...prev, userId]);

     try {
       await api.blockUser(userId);
       // Refetch to confirm
       await refetchBlockedUsers();
     } catch (error) {
       // Rollback on error
       setBlockedUsers(prev => prev.filter(id => id !== userId));
       showError('Failed to block user');
     }
   };
   ```

2. **WebSocket Event:**
   - Listen to `user.blocked` event
   - Update blocked users list

3. **Cache Invalidation:**
   - ใช้ React Query / SWR → invalidate cache
   - Refetch blocked users list

**Backend ต้องทำ:**
✅ **ต้องทำ:**
1. **API Response:**
   - `POST /api/users/{userId}/block`
   - Response: `{ success: true, blockedUser: {...} }`

2. **WebSocket Event (Optional):**
   - ส่ง `user.blocked` event
   - Payload: `{ blockerId, blockedUserId, blockedAt }`

---

### #27: บล็อคแล้วยังแชทได้ปกติ
**ปัญหา:**
- หลังจากบล็อคผู้ใช้แล้ว ยังสามารถส่งและรับข้อความได้ปกติ
- Block feature ไม่ทำงาน

**สาเหตุ:**
1. **Frontend ไม่ได้ block UI:**
   - ยังแสดง input box ให้ส่งข้อความได้
   - ยังรับข้อความจาก blocked user

2. **Backend ไม่ได้ block จริงๆ:**
   - API block ทำงาน แต่ไม่ได้ enforce restrictions
   - WebSocket ยังส่งข้อความจาก blocked user มา

**วิธีแก้:**

### Frontend:
1. **Block UI Elements:**
   ```typescript
   const isBlocked = blockedUsers.includes(otherUserId);
   const isBlockedBy = blockedByUsers.includes(otherUserId);

   if (isBlocked || isBlockedBy) {
     return (
       <div className="blocked-conversation">
         <p>This conversation is blocked</p>
         {isBlocked && <button onClick={handleUnblock}>Unblock</button>}
       </div>
     );
   }
   ```

2. **Filter Messages:**
   - Filter out messages จาก blocked users
   - ไม่แสดง notification จาก blocked users

3. **Hide Blocked Users:**
   - ซ่อนใน search results
   - ซ่อนใน friend suggestions
   - แสดงใน blocked list เท่านั้น

4. **Prevent Sending:**
   - Disable input box
   - Show "You blocked this user" หรือ "This user blocked you"

### Backend:
**Backend ต้องทำ:**
✅ **ต้องทำ (CRITICAL):**

1. **Block Logic:**
   ```typescript
   // ตอน A block B:
   // - A ส่งข้อความหา B ไม่ได้
   // - B ส่งข้อความหา A ไม่ได้
   // - A ไม่เห็นข้อความใหม่จาก B
   // - B ไม่เห็นว่า A block (อาจแสดง "Message not delivered")
   ```

2. **API Endpoints:**
   - `POST /api/users/{userId}/block`
   - `POST /api/users/{userId}/unblock`
   - `GET /api/users/blocked` - รายชื่อคนที่เราบล็อค
   - `GET /api/users/blocked-by` (Optional) - รายชื่อคนที่บล็อคเรา

3. **Message Sending Validation:**
   ```typescript
   // Before sending message
   if (await isBlocked(senderId, receiverId)) {
     throw new Error('Cannot send message to blocked user');
   }
   ```

4. **WebSocket Message Filtering:**
   - ก่อนส่งข้อความผ่าน WebSocket ให้ recipient
   - Check ว่า sender ถูก block โดย recipient หรือไม่
   - ถ้าใช่ → ไม่ส่ง

5. **API Message Filtering:**
   - `GET /api/conversations/{id}/messages`
   - Filter out messages จาก blocked users
   - หรือ return error ถ้า conversation ถูก block

6. **Block Status:**
   - เพิ่ม field `blockStatus` ใน conversation/user response:
   ```json
   {
     "userId": "user_123",
     "blockStatus": {
       "isBlocked": false,      // เราบล็อคคนนี้หรือไม่
       "isBlockedBy": false     // คนนี้บล็อคเราหรือไม่
     }
   }
   ```

---

## 🎯 แผนการแก้ไข (เรียงตามลำดับ)

### Phase 1: Frontend Quick Fix (1 ชม.)
1. เพิ่ม optimistic update สำหรับ block action
2. แสดงรายชื่อ blocked users ทันทีหลัง block
3. Disable input box ใน blocked conversation

### Phase 2: Backend Coordination (CRITICAL - ต้องทำก่อน)
1. Implement block validation ใน message sending
2. Filter WebSocket events
3. Add block status API
4. Test block scenarios

### Phase 3: Frontend Integration (2-3 ชม.)
1. Integrate block status จาก backend
2. Filter messages จาก blocked users
3. Update UI สำหรับ blocked conversations
4. Handle blocked/blocked-by scenarios

### Phase 4: Testing
1. Test A block B → ทั้งคู่ส่งข้อความไม่ได้
2. Test B ยังเห็น conversation เก่าหรือไม่
3. Test unblock → ส่งข้อความได้อีกครั้ง
4. Test notification → ไม่มี notification จาก blocked users
5. Test group chat → blocked users ใน group

---

## 📦 ไฟล์ที่ต้องแก้

**Frontend:**
- `src/components/Settings/BlockedUsers.tsx` - Blocked users list
- `src/components/Chat/ChatWindow.tsx` - Block status check
- `src/components/Chat/MessageInput.tsx` - Disable input for blocked
- `src/services/api/users.ts` - Block/unblock API
- `src/stores/userStore.ts` - Blocked users state
- `src/services/websocket.ts` - Filter blocked users messages

**Backend (ต้องทำก่อน):**
- Message sending validation
- WebSocket event filtering
- Block status API
- Blocked users list API

---

## ⚠️ Edge Cases ที่ต้องพิจารณา

1. **Group Chat:**
   - ถ้า A block B แล้วอยู่กลุ่มเดียวกัน?
     - Option 1: A ไม่เห็นข้อความของ B ในกลุ่ม
     - Option 2: Block ใช้ได้เฉพาะ 1-on-1 chat

2. **Block แล้ว Unblock:**
   - Conversation เก่ากลับมาไหม?
   - Message history ยังเห็นไหม?

3. **Mutual Block:**
   - A block B, B block A → ทั้งคู่ไม่เห็นกันเลย

4. **Block ใน Friend List:**
   - Block แล้วยังเป็นเพื่อนอยู่ไหม?
   - Block = unfriend หรือไม่?

---

## ✅ เงื่อนไขการ Test

**สำหรับ #26 (UI Update):**
- [x] Block user → รายชื่อ update ทันที (ไม่ต้อง refresh)
- [x] Unblock → รายชื่อ update ทันที
- [x] Block หลายคนติดกัน → UI responsive

**สำหรับ #27 (Block Functionality):**
- [x] A block B → A ส่งข้อความหา B ไม่ได้
- [x] B ส่งข้อความหา A → A ไม่เห็น
- [x] A ไม่เห็น notification จาก B
- [x] B ไม่รู้ว่าถูก block (ดูเหมือนส่งได้ แต่ A ไม่ได้รับ - optional)
- [x] Unblock → กลับมาแชทได้ปกติ
- [x] Test ใน group chat
- [x] Test search → ไม่เจอ blocked users
