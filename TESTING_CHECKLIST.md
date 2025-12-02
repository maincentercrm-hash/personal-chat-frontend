# 📋 Testing Checklist - Chat Application

**วันที่:** 2025-11-17
**Version:** 2.0
**Status:** Ready for Testing

---

## 📑 สารบัญ

1. [Authentication & Setup](#1-authentication--setup)
2. [Direct Chat Features](#2-direct-chat-features)
3. [Group Chat Features](#3-group-chat-features)
4. [Message Features](#4-message-features)
5. [WebSocket & Real-time](#5-websocket--real-time)
6. [UI/UX & Navigation](#6-uiux--navigation)
7. [Media Features](#7-media-features)
8. [Performance & Error Handling](#8-performance--error-handling)
9. [Cross-browser Testing](#9-cross-browser-testing)
10. [Mobile Responsive](#10-mobile-responsive)

---

## 1. Authentication & Setup

### 1.1 Login/Logout
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (show error)
- [ ] Logout successfully
- [ ] Auto-redirect to login if not authenticated
- [ ] Token refresh works (when token expires)
- [ ] Remember me / Auto-login

### 1.2 Initial Load
- [ ] Conversation list loads on first login
- [ ] WebSocket connects automatically
- [ ] User status shows correctly (online/offline)
- [ ] Profile picture loads
- [ ] No console errors on initial load

---

## 2. Direct Chat Features

### 2.1 Create Direct Conversation
- [ ] **From Contacts Page:**
  - [ ] Navigate to `/chat/contacts`
  - [ ] Click on a friend
  - [ ] Click "แชท" button
  - [ ] ✅ Redirect to `/chat/{conversation_id}`
  - [ ] ✅ Conversation appears in sidebar
  - [ ] ✅ No duplicate conversations created

- [ ] **From Existing Conversation:**
  - [ ] Conversation already exists → open directly
  - [ ] No new conversation created

### 2.2 Conversation Management
- [ ] Open conversation from sidebar
- [ ] Conversation loads with recent messages
- [ ] Scroll to load older messages
- [ ] Message count badge shows unread count
- [ ] Last message preview shows correctly

### 2.3 Conversation Actions
- [ ] **Pin Conversation:**
  - [ ] Click pin icon
  - [ ] ✅ Conversation moves to top
  - [ ] ✅ Pin icon changes state
  - [ ] Unpin works correctly

- [ ] **Mute Conversation:**
  - [ ] Click mute icon
  - [ ] ✅ Notification badge changes
  - [ ] ✅ No toast for new messages (when muted)
  - [ ] Unmute works correctly

- [ ] **Hide/Delete Conversation:**
  - [ ] Click delete/hide
  - [ ] ✅ Confirm dialog appears
  - [ ] ✅ Conversation removed from list
  - [ ] ✅ Redirect to `/chat` (if was active)

---

## 3. Group Chat Features

### 3.1 Create Group
- [ ] **From Contacts Page:**
  - [ ] Click "สร้างกลุ่ม" button
  - [ ] Modal/Dialog opens
  - [ ] Enter group name (required)
  - [ ] Select members (at least 1)
  - [ ] Upload group icon (optional)
  - [ ] Click "สร้าง"
  - [ ] ✅ Group created successfully
  - [ ] ✅ Redirect to `/chat/{group_id}`
  - [ ] ✅ All members receive notification

### 3.2 View Group Details
- [ ] Open Conversation Details (click group name or info icon)
- [ ] ✅ Shows group name
- [ ] ✅ Shows group icon
- [ ] ✅ Shows member count
- [ ] ✅ Shows member list with online status
- [ ] ✅ Shows media summary (photos, videos, files, links)

### 3.3 Edit Group Info
- [ ] **Edit Group Name:**
  - [ ] Click edit button (pencil icon)
  - [ ] Edit dialog opens
  - [ ] Change group name
  - [ ] Click "บันทึก"
  - [ ] ✅ Group name updates immediately
  - [ ] ✅ All members see updated name (real-time)
  - [ ] ✅ Toast notification shows
  - [ ] ✅ Sidebar updates

- [ ] **Edit Group Icon (File Upload):**
  - [ ] Click on group avatar in edit dialog
  - [ ] Select image file (PNG/JPG)
  - [ ] ✅ File uploads successfully
  - [ ] ✅ Preview shows new icon
  - [ ] ✅ Toast: "อัปโหลดรูปภาพสำเร็จ"
  - [ ] Click "บันทึก"
  - [ ] ✅ Icon updates everywhere
  - [ ] ✅ All members see new icon (real-time)

- [ ] **Edit Group Icon (URL):**
  - [ ] Enter icon URL in text field
  - [ ] ✅ Preview shows icon
  - [ ] Click "บันทึก"
  - [ ] ✅ Icon updates

- [ ] **Validation:**
  - [ ] Empty group name → Error
  - [ ] File too large (>5MB) → Error
  - [ ] Non-image file → Error
  - [ ] No changes → Info toast

### 3.4 Group Member Management
- [ ] **Add Members:**
  - [ ] Click "เพิ่มสมาชิก" button
  - [ ] Select friends to add
  - [ ] Click "เพิ่ม"
  - [ ] ✅ Members added successfully
  - [ ] ✅ All members receive notification
  - [ ] ✅ Member list updates
  - [ ] ✅ Member count updates

- [ ] **Remove Members (Admin only):**
  - [ ] Click remove icon next to member
  - [ ] Confirm dialog appears
  - [ ] Click "ลบ"
  - [ ] ✅ Member removed
  - [ ] ✅ Removed member receives notification
  - [ ] ✅ Conversation disappears from their list
  - [ ] ✅ Other members see updated list

- [ ] **Leave Group:**
  - [ ] Click "ออกจากกลุ่ม" button
  - [ ] Confirm dialog appears
  - [ ] Click "ออกจากกลุ่ม"
  - [ ] ✅ Leave successful
  - [ ] ✅ Redirect to `/chat`
  - [ ] ✅ Group removed from sidebar
  - [ ] ✅ Other members see updated list

### 3.5 Group Permissions
- [ ] Creator can edit group info
- [ ] Creator can remove members
- [ ] Creator sees "ผู้สร้าง" badge
- [ ] Non-creator cannot remove members (UI hidden/disabled)

---

## 4. Message Features

### 4.1 Send Messages

#### 4.1.1 Text Messages
- [ ] Type text in input field
- [ ] Press Enter or Click send button
- [ ] ✅ Message appears immediately (optimistic update)
- [ ] ✅ Shows "กำลังส่ง..." status
- [ ] ✅ Status changes to "ส่งแล้ว" (single checkmark)
- [ ] ✅ Status changes to "อ่านแล้ว" (double checkmark)
- [ ] ✅ Message appears in recipient's chat (real-time)
- [ ] ✅ Conversation moves to top of sidebar
- [ ] ✅ Last message preview updates

#### 4.1.2 Image Messages
- [ ] Click image icon or paste image
- [ ] Select image file
- [ ] ✅ Upload progress shows
- [ ] ✅ Preview appears before sending
- [ ] ✅ Can add caption
- [ ] Send message
- [ ] ✅ Image displays correctly
- [ ] ✅ Click image to view full size
- [ ] ✅ Image appears in media gallery

#### 4.1.3 Video Messages
- [ ] Click video icon
- [ ] Select video file
- [ ] ✅ Upload progress shows
- [ ] ✅ Thumbnail preview appears
- [ ] Send message
- [ ] ✅ Video player works
- [ ] ✅ Video appears in media gallery

#### 4.1.4 File Messages
- [ ] Click file icon
- [ ] Select any file type
- [ ] ✅ File info shows (name, size)
- [ ] Send message
- [ ] ✅ Download link works
- [ ] ✅ File appears in file list

#### 4.1.5 Emoji & Stickers
- [ ] Click emoji button
- [ ] Emoji picker opens
- [ ] Select emoji
- [ ] ✅ Emoji inserts at cursor position
- [ ] Send message with emoji
- [ ] ✅ Emoji renders correctly

### 4.2 Reply to Messages
- [ ] Hover over message
- [ ] Click reply button
- [ ] ✅ Reply preview shows above input
- [ ] Type reply
- [ ] Send
- [ ] ✅ Message shows with quoted message
- [ ] ✅ Click quoted message → jump to original
- [ ] ✅ Works for all message types (text, image, video, file)

### 4.3 Edit Messages
- [ ] **Own Messages Only:**
  - [ ] Hover over your message
  - [ ] Click edit button (pencil icon)
  - [ ] Edit text appears in input
  - [ ] Make changes
  - [ ] Press Enter or click save
  - [ ] ✅ Message updates immediately
  - [ ] ✅ Shows "แก้ไข" badge
  - [ ] ✅ Recipient sees updated message (real-time)

- [ ] **Others' Messages:**
  - [ ] Edit button not visible
  - [ ] Cannot edit

### 4.4 Delete Messages
- [ ] **Own Messages:**
  - [ ] Hover over message
  - [ ] Click delete button (trash icon)
  - [ ] Confirm dialog appears
  - [ ] Click "ลบ"
  - [ ] ✅ Message shows "ข้อความนี้ถูกลบแล้ว"
  - [ ] ✅ Recipient sees deleted message (real-time)

- [ ] **Others' Messages:**
  - [ ] Delete button not visible (or disabled)

### 4.5 Message Status
- [ ] **Sending:** Gray, single clock icon
- [ ] **Sent:** Single gray checkmark
- [ ] **Delivered:** Double gray checkmarks
- [ ] **Read:** Double blue checkmarks
- [ ] **Failed:** Red X icon with retry option

### 4.6 Read Receipts
- [ ] Send message
- [ ] Recipient opens conversation
- [ ] ✅ Message marked as read automatically
- [ ] ✅ Sender sees "อ่านแล้ว" status
- [ ] ✅ Read count increases
- [ ] ✅ Unread badge clears

### 4.7 Message Actions Menu
- [ ] Long press or right-click on message
- [ ] ✅ Actions menu appears:
  - [ ] Reply
  - [ ] Copy text
  - [ ] Edit (own messages)
  - [ ] Delete (own messages)
  - [ ] Forward (future feature)

---

## 5. WebSocket & Real-time

### 5.1 Connection Management
- [ ] **Initial Connection:**
  - [ ] WebSocket connects on login
  - [ ] Connection status shows "เชื่อมต่อแล้ว"
  - [ ] No error toast

- [ ] **Disconnect:**
  - [ ] Disable network (DevTools → Offline)
  - [ ] ✅ Toast: "การเชื่อมต่อขาดหาย"
  - [ ] ✅ Status shows "กำลังเชื่อมต่อใหม่..."
  - [ ] Enable network
  - [ ] ✅ Auto-reconnect successful
  - [ ] ✅ Toast: "เชื่อมต่อสำเร็จ"

- [ ] **Navigation Between Pages:**
  - [ ] Navigate from `/chat/contacts` to `/chat/{id}`
  - [ ] ✅ **NO** "การเชื่อมต่อขาดหาย" toast
  - [ ] WebSocket stays connected
  - [ ] No disconnect/reconnect

### 5.2 Real-time Message Delivery
- [ ] **Two Users:**
  - [ ] User A sends message
  - [ ] ✅ User B receives immediately (no refresh)
  - [ ] ✅ Conversation moves to top
  - [ ] ✅ Unread badge appears
  - [ ] ✅ Last message preview updates

- [ ] **Group Chat (3+ Users):**
  - [ ] User A sends message
  - [ ] ✅ All members receive immediately
  - [ ] ✅ Works for all message types

### 5.3 Real-time Conversation Updates
- [ ] **Group Name Change:**
  - [ ] User A edits group name
  - [ ] ✅ User B sees updated name (no refresh)
  - [ ] ✅ Toast notification (if not active conversation)

- [ ] **Group Icon Change:**
  - [ ] User A uploads new icon
  - [ ] ✅ User B sees new icon immediately
  - [ ] ✅ Sidebar updates
  - [ ] ✅ Details sheet updates

- [ ] **Member Added:**
  - [ ] User A adds User C
  - [ ] ✅ User B sees updated member list
  - [ ] ✅ User C sees new group in sidebar
  - [ ] ✅ Toast notifications

- [ ] **Member Removed:**
  - [ ] User A removes User B
  - [ ] ✅ User B gets notification
  - [ ] ✅ Group disappears from User B's sidebar
  - [ ] ✅ Redirect to `/chat`
  - [ ] ✅ Other members see updated list

### 5.4 Online Status
- [ ] User goes online
- [ ] ✅ Status indicator shows green
- [ ] ✅ "ออนไลน์" text shows
- [ ] User goes offline
- [ ] ✅ Status indicator shows gray
- [ ] ✅ "Last seen" timestamp shows

---

## 6. UI/UX & Navigation

### 6.1 Sidebar
- [ ] Conversation list shows correctly
- [ ] Pinned conversations at top
- [ ] Sort by last message time
- [ ] Unread badge shows count
- [ ] Muted conversations show mute icon
- [ ] Search conversations works
- [ ] Click conversation → navigates to `/chat/{id}`

### 6.2 Message Input
- [ ] **Auto-focus:**
  - [ ] ❌ Input does NOT auto-focus on page load
  - [ ] ✅ Input focuses after sending message
  - [ ] ✅ Input focuses after emoji/file select

- [ ] **Multi-line:**
  - [ ] Shift+Enter creates new line
  - [ ] Enter sends message
  - [ ] Text area grows with content

- [ ] **File Upload:**
  - [ ] Click upload icon → file picker opens
  - [ ] Drag & drop file → upload starts
  - [ ] Paste image → upload starts

### 6.3 Message List Scrolling
- [ ] **Initial Load:**
  - [ ] ✅ Scrolls to bottom immediately (no smooth)
  - [ ] Shows latest messages

- [ ] **New Message (Sender):**
  - [ ] Send message
  - [ ] ✅ Auto-scroll to bottom (smooth)

- [ ] **New Message (Recipient):**
  - [ ] Receive message
  - [ ] ✅ Auto-scroll to bottom (smooth)
  - [ ] ✅ Message visible immediately

- [ ] **Load More:**
  - [ ] Scroll to top
  - [ ] ✅ Load older messages
  - [ ] ✅ Scroll position maintained
  - [ ] ✅ No jump

- [ ] **Jump to Message:**
  - [ ] Click on quoted message
  - [ ] ✅ Scroll to target message
  - [ ] ✅ Highlight/bounce animation
  - [ ] ✅ Message centered in view

### 6.4 Conversation Details Sheet
- [ ] Click info icon or conversation name
- [ ] ✅ Sheet slides in from right
- [ ] ✅ Shows avatar, name, member count
- [ ] **Tabs:**
  - [ ] Info tab shows members (for group)
  - [ ] Photos tab shows image gallery
  - [ ] Videos tab shows video gallery
  - [ ] Files tab shows file list
  - [ ] Links tab shows extracted links
- [ ] Click outside → closes sheet
- [ ] Click X → closes sheet

### 6.5 Navigation
- [ ] **Desktop:**
  - [ ] Sidebar always visible
  - [ ] Conversation view in center
  - [ ] Details sheet on right (when open)

- [ ] **Mobile:**
  - [ ] Sidebar toggles with menu button
  - [ ] Full-screen conversation view
  - [ ] Back button → returns to conversation list
  - [ ] Details sheet full-screen

---

## 7. Media Features

### 7.1 Photo Gallery
- [ ] Click "Photos" tab in details
- [ ] ✅ Shows all images from conversation
- [ ] ✅ Grid layout (thumbnails)
- [ ] Click image
- [ ] ✅ Opens lightbox/full view
- [ ] ✅ Can navigate between images
- [ ] ✅ Click on image → jump to message

### 7.2 Video Gallery
- [ ] Click "Videos" tab
- [ ] ✅ Shows all videos with thumbnails
- [ ] Click video
- [ ] ✅ Video plays
- [ ] ✅ Controls work (play, pause, seek)
- [ ] ✅ Click on video → jump to message

### 7.3 File List
- [ ] Click "Files" tab
- [ ] ✅ Shows all files with icons
- [ ] ✅ Shows file name, size, date
- [ ] Click file
- [ ] ✅ Downloads file
- [ ] ✅ Click on file → jump to message

### 7.4 Link List
- [ ] Click "Links" tab
- [ ] ✅ Shows all extracted links
- [ ] ✅ Shows URL preview (if available)
- [ ] Click link
- [ ] ✅ Opens in new tab
- [ ] ✅ Click on link item → jump to message

### 7.5 Media Cache & Performance
- [ ] Media loads from cache on revisit
- [ ] React Query invalidation works on new media
- [ ] No duplicate API calls
- [ ] Thumbnails load quickly

---

## 8. Performance & Error Handling

### 8.1 Loading States
- [ ] Initial conversation load shows skeleton
- [ ] Message sending shows loading
- [ ] File upload shows progress bar
- [ ] Lazy loading for images
- [ ] Infinite scroll works smoothly

### 8.2 Error Handling
- [ ] **Network Error:**
  - [ ] Disable network
  - [ ] Try to send message
  - [ ] ✅ Error toast appears
  - [ ] ✅ Message shows failed status
  - [ ] ✅ Retry button available

- [ ] **Upload Error:**
  - [ ] Upload large file (>10MB)
  - [ ] ✅ Error toast
  - [ ] ✅ Upload cancelled

- [ ] **API Error:**
  - [ ] 401 Unauthorized → redirect to login
  - [ ] 403 Forbidden → error message
  - [ ] 500 Server Error → error toast

### 8.3 Edge Cases
- [ ] Empty conversation list
- [ ] No messages in conversation
- [ ] Very long message (1000+ characters)
- [ ] Very long conversation name
- [ ] Many members in group (50+)
- [ ] Rapid message sending (spam)
- [ ] Simultaneous edits by multiple users

---

## 9. Cross-browser Testing

### 9.1 Desktop Browsers
- [ ] **Chrome:**
  - [ ] All features work
  - [ ] WebSocket stable
  - [ ] No console errors

- [ ] **Firefox:**
  - [ ] All features work
  - [ ] File upload works
  - [ ] No console errors

- [ ] **Safari:**
  - [ ] All features work
  - [ ] WebSocket reconnect works
  - [ ] No console errors

- [ ] **Edge:**
  - [ ] All features work
  - [ ] No console errors

### 9.2 Compatibility
- [ ] localStorage works
- [ ] sessionStorage works
- [ ] WebSocket supported
- [ ] File API works
- [ ] Drag & drop works

---

## 10. Mobile Responsive

### 10.1 Layout
- [ ] **Portrait:**
  - [ ] Sidebar toggles with button
  - [ ] Message list full width
  - [ ] Input bar at bottom
  - [ ] Touch scrolling works

- [ ] **Landscape:**
  - [ ] Layout adjusts
  - [ ] All features accessible

### 10.2 Touch Interactions
- [ ] Tap to select conversation
- [ ] Swipe to delete (if implemented)
- [ ] Long press for message actions
- [ ] Pinch to zoom images
- [ ] Pull to refresh (if implemented)

### 10.3 Mobile-specific
- [ ] Virtual keyboard doesn't break layout
- [ ] Input stays above keyboard
- [ ] Camera/file picker works
- [ ] Share functionality (if implemented)
- [ ] Push notifications (if implemented)

---

## 11. Security & Privacy

### 11.1 Authentication
- [ ] Token stored securely
- [ ] Auto-logout on token expiry
- [ ] No token in URL
- [ ] HTTPS only (production)

### 11.2 Authorization
- [ ] Can only see own conversations
- [ ] Can only edit own messages
- [ ] Can only delete own messages
- [ ] Admin-only actions protected (group)

### 11.3 Data Validation
- [ ] XSS prevention (no script injection)
- [ ] File upload validation
- [ ] Message length limits
- [ ] Rate limiting (API level)

---

## 📊 Testing Summary

**Total Checklist Items:** ~200+

### Priority Levels

**P0 - Critical (Must Work):**
- [ ] Login/Logout
- [ ] Create conversation
- [ ] Send/Receive messages (text)
- [ ] WebSocket connection
- [ ] Real-time updates

**P1 - High (Should Work):**
- [ ] File uploads (image, video, file)
- [ ] Edit/Delete messages
- [ ] Group management
- [ ] Read receipts
- [ ] Navigation

**P2 - Medium (Nice to Have):**
- [ ] Media galleries
- [ ] Jump to message
- [ ] Emoji picker
- [ ] Online status

**P3 - Low (Polish):**
- [ ] Animations
- [ ] Tooltips
- [ ] Loading skeletons

---

## 🐛 Bug Report Template

When you find a bug, report with:

```markdown
**Bug Title:** [Short description]

**Priority:** P0 / P1 / P2 / P3

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
What should happen

**Actual Result:**
What actually happened

**Screenshots/Video:**
[Attach if possible]

**Environment:**
- Browser: Chrome 120
- OS: Windows 11
- Device: Desktop
- Network: Stable

**Console Errors:**
```
[Paste console errors]
```

**Additional Notes:**
[Any other relevant info]
```

---

## ✅ Testing Progress

**Date Started:** _______________
**Date Completed:** _______________
**Tester:** _______________

**Overall Status:**
- [ ] Not Started
- [ ] In Progress (___%)
- [ ] Completed
- [ ] Ready for Production

**Blockers:**
1.
2.
3.

**Notes:**
-
-
-

---

**Last Updated:** 2025-11-17
**Version:** 2.0
