# E2E Tests สำหรับ Text Editor Features

Playwright E2E tests สำหรับทดสอบฟีเจอร์ Message Input ตาม checklist ใน `Problem_today/01_critical_text_editor.md`

---

## 📁 โครงสร้างไฟล์

```
e2e/
├── helpers/
│   └── test-helpers.ts          # Helper functions ที่ใช้ร่วมกัน
├── fixtures/                    # Test fixtures (ถ้ามี)
├── 01-multiline-input.spec.ts   # Test #5: Shift+Enter, multiline
├── 02-auto-focus.spec.ts        # Test #4: Auto-focus หลังส่งข้อความ
├── 03-draft-messages.spec.ts    # Test #3: Draft messages system
├── 04-cursor-selection.spec.ts  # Test #14: Cursor selection highlight
├── message-input.spec.ts        # Integration tests รวม
└── README.md                    # ไฟล์นี้
```

---

## 🚀 วิธีรัน Tests

### 1. รันทุก tests
```bash
npm run test:e2e
```

### 2. รัน tests แบบ UI mode (แนะนำ)
```bash
npm run test:e2e:ui
```

### 3. รัน tests แบบเห็นเบราว์เซอร์ (headed mode)
```bash
npm run test:e2e:headed
```

### 4. รันเฉพาะเบราว์เซอร์ที่ต้องการ
```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### 5. Debug mode
```bash
npm run test:debug
```

### 6. ดู test report
```bash
npm run test:report
```

---

## 📝 Test Coverage

### ✅ Test #5: Multiline Input (01-multiline-input.spec.ts)
- [x] ขึ้นบรรทัดใหม่ด้วย Shift+Enter
- [x] ส่งข้อความด้วย Enter
- [x] พิมพ์ได้หลายบรรทัด
- [x] Auto-grow textarea ตามเนื้อหา
- [x] แสดง scrollbar เมื่อเกิน max-height

### ✅ Test #4: Auto-focus (02-auto-focus.spec.ts)
- [x] Auto-focus หลังส่งข้อความด้วย Enter
- [x] Auto-focus หลังคลิกปุ่ม Send
- [x] พิมพ์ต่อได้ทันทีโดยไม่ต้องคลิก
- [x] ส่งข้อความหลายครั้งติดกัน

### ✅ Test #3: Draft Messages (03-draft-messages.spec.ts)
- [x] เก็บ draft ใน localStorage
- [x] เก็บ draft แยกตาม conversation
- [x] โหลด draft กลับมาเมื่อกลับมา conversation เดิม
- [x] ลบ draft หลังส่งข้อความ
- [x] อัปเดต draft แบบ real-time
- [x] รองรับข้อความหลายบรรทัด

### ✅ Test #14: Cursor Selection (04-cursor-selection.spec.ts)
- [x] เห็น highlight เมื่อเลือกข้อความ
- [x] มี selection color ที่กำหนด
- [x] เลือกด้วย mouse drag
- [x] เลือกด้วย Shift+Arrow keys
- [x] เห็น cursor เมื่อพิมพ์
- [x] Selection ในหลายบรรทัด
- [x] Double-click เลือกคำ
- [x] Delete/Replace ข้อความที่เลือก

---

## ⚠️ สิ่งที่ต้องแก้ไขก่อนรัน Tests

### 1. **แก้ไข Selectors ให้ตรงกับ Component จริง**

ใน `helpers/test-helpers.ts`:

```typescript
// ปรับ selector ให้ตรงกับแอพจริง
export async function getMessageInput(page: Page): Promise<Locator> {
  // ตัวเลือก:

  // Option 1: ใช้ placeholder (ปัจจุบัน)
  return page.locator('textarea[placeholder*="พิมพ์ข้อความ"]');

  // Option 2: ใช้ data-testid (แนะนำ)
  // เพิ่ม data-testid="message-input" ใน MessageInput.tsx
  // return page.locator('[data-testid="message-input"]');

  // Option 3: ใช้ role
  // return page.getByRole('textbox', { name: /พิมพ์ข้อความ/i });
}
```

### 2. **เพิ่ม data-testid ใน Components (แนะนำ)**

เพิ่มใน `MessageInput.tsx`:
```tsx
<textarea
  data-testid="message-input"
  ref={messageInputRef}
  value={message}
  // ...
/>

<button
  data-testid="send-button"
  type="submit"
  // ...
/>
```

เพิ่มใน Message components:
```tsx
<div data-testid="message-item">
  {/* message content */}
</div>
```

### 3. **Setup Authentication (ถ้ามี)**

แก้ไข `loginAndNavigateToConversation()` ใน `helpers/test-helpers.ts`:

```typescript
export async function loginAndNavigateToConversation(
  page: Page,
  conversationId?: string
): Promise<void> {
  await page.goto('/');

  // เพิ่ม login logic
  await page.fill('[data-testid="username-input"]', 'testuser');
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/chat');

  // Navigate to conversation
  if (conversationId) {
    await page.goto(`/chat/${conversationId}`);
  }

  await page.waitForLoadState('networkidle');
}
```

### 4. **Setup Test Data (ถ้าจำเป็น)**

สร้าง fixtures หรือ seed data สำหรับ tests:

```typescript
// e2e/fixtures/test-data.ts
export const testUsers = {
  user1: {
    username: 'testuser1',
    password: 'password123'
  },
  user2: {
    username: 'testuser2',
    password: 'password456'
  }
};

export const testConversations = [
  {
    id: 'conv_1',
    name: 'Test Conversation 1'
  },
  {
    id: 'conv_2',
    name: 'Test Conversation 2'
  }
];
```

---

## 🔧 การ Debug Tests

### 1. ใช้ UI Mode
```bash
npm run test:e2e:ui
```
- เห็น tests ทั้งหมด
- รันทีละ test
- ดู step-by-step
- Time travel debugging

### 2. ใช้ Headed Mode
```bash
npm run test:e2e:headed
```
- เห็นเบราว์เซอร์ขณะรัน tests
- ช้าลงเพื่อดูได้ชัดเจน

### 3. ใช้ Debug Mode
```bash
npm run test:debug
```
- Pause ที่แต่ละ step
- ดู DOM inspector
- Console logs

### 4. เพิ่ม Console Logs
```typescript
test('my test', async ({ page }) => {
  console.log('Starting test...');

  const input = await getMessageInput(page);
  const value = await input.inputValue();
  console.log('Input value:', value);

  // ...
});
```

### 5. ถ่าย Screenshots
```typescript
await page.screenshot({ path: 'debug-screenshot.png' });
```

---

## 📊 Test Reports

หลังรัน tests เสร็จ ดู HTML report:

```bash
npm run test:report
```

Report จะแสดง:
- ✅ Tests ที่ pass
- ❌ Tests ที่ fail
- 📸 Screenshots (on failure)
- 🎥 Videos (on failure)
- 📝 Traces

---

## 💡 Tips

1. **รัน tests บ่อยๆ** - เพื่อจับ bug ตั้งแต่เนิ่นๆ
2. **ใช้ data-testid** - เพื่อความชัดเจนและไม่พึ่ง CSS classes
3. **แยก tests ออกเป็นไฟล์ย่อย** - easy to maintain
4. **ใช้ helper functions** - DRY (Don't Repeat Yourself)
5. **Mock data** - สำหรับ tests ที่ต้องการ specific scenarios
6. **CI/CD Integration** - รัน tests ทุกครั้งที่ push code

---

## 🆘 Troubleshooting

### ❌ "Timeout waiting for element"
- ตรวจสอบ selector ว่าถูกต้องหรือไม่
- เพิ่ม `await page.waitForLoadState('networkidle')`
- เพิ่ม timeout: `await page.locator(...).click({ timeout: 10000 })`

### ❌ "Element is not visible"
- ตรวจสอบว่า element มี `display: none` หรือ `visibility: hidden`
- รอให้ element ปรากฏ: `await element.waitFor({ state: 'visible' })`

### ❌ Tests ทำงานบน local แต่ fail บน CI
- ตรวจสอบ timing issues
- เพิ่ม explicit waits
- ใช้ `await page.waitForTimeout(500)` เมื่อจำเป็น

---

## 📚 เอกสารเพิ่มเติม

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Debug Guide](https://playwright.dev/docs/debug)

---

## ✅ Checklist ก่อนรัน Tests ครั้งแรก

- [ ] ติดตั้ง Playwright browsers: `npx playwright install`
- [ ] แก้ไข selectors ใน `helpers/test-helpers.ts`
- [ ] เพิ่ม data-testid ใน components (แนะนำ)
- [ ] Setup authentication logic (ถ้ามี)
- [ ] เตรียม test data/fixtures
- [ ] รัน dev server: `npm run dev`
- [ ] ทดลองรัน tests: `npm run test:e2e:headed`

---

**Happy Testing! 🎉**
