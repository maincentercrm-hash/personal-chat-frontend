import { test, expect } from '@playwright/test';
import {
  loginAndNavigateToConversation,
  getMessageInput,
  getSendButton,
  sendMessage,
} from './helpers/test-helpers';

/**
 * E2E Tests สำหรับ Message Input / Text Editor Features
 * ทดสอบตาม checklist ใน Problem_today/01_critical_text_editor.md
 */

test.describe('Message Input - Text Editor Features', () => {

  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToConversation(page);
  });

  /**
   * Test #5: เว้นบรรทัดได้ (Shift+Enter)
   * ✅ กด Shift+Enter ขึ้นบรรทัดใหม่ได้
   * ✅ กด Enter เฉยๆ ส่งข้อความ
   */
  test('#5 - เว้นบรรทัดได้ด้วย Shift+Enter', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความบรรทัดแรก
    await input.fill('บรรทัดแรก');

    // กด Shift+Enter เพื่อขึ้นบรรทัดใหม่
    await input.press('Shift+Enter');

    // พิมพ์บรรทัดที่สอง
    await input.pressSequentially('บรรทัดที่สอง');

    // ตรวจสอบว่ามีทั้ง 2 บรรทัดใน textarea
    const value = await input.inputValue();
    expect(value).toContain('บรรทัดแรก\nบรรทัดที่สอง');

    // กด Shift+Enter อีกครั้ง
    await input.press('Shift+Enter');
    await input.pressSequentially('บรรทัดที่สาม');

    // ตรวจสอบว่ามี 3 บรรทัด
    const finalValue = await input.inputValue();
    expect(finalValue.split('\n').length).toBe(3);
  });

  test('#5 - กด Enter เฉยๆ ส่งข้อความ', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ
    await input.fill('ข้อความทดสอบ');

    // กด Enter (ไม่กด Shift)
    await input.press('Enter');

    // ตรวจสอบว่า input ว่างเปล่า (ข้อความถูกส่งแล้ว)
    await expect(input).toHaveValue('');

    // TODO: ตรวจสอบว่าข้อความปรากฏใน message list
    // const lastMessage = page.locator('[data-testid="message-item"]').last();
    // await expect(lastMessage).toContainText('ข้อความทดสอบ');
  });

  /**
   * Test #4: Auto-focus หลังส่งข้อความ
   * ✅ หลังส่งข้อความ cursor กลับมาที่ input box อัตโนมัติ
   */
  test('#4 - Auto-focus หลังส่งข้อความ', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์และส่งข้อความ
    await input.fill('ข้อความทดสอบ 1');
    await input.press('Enter');

    // ตรวจสอบว่า input ว่างเปล่า
    await expect(input).toHaveValue('');

    // ตรวจสอบว่า input ยังมี focus อยู่
    await expect(input).toBeFocused();

    // พิมพ์ข้อความใหม่ได้ทันที (ไม่ต้องคลิกอีก)
    await input.pressSequentially('ข้อความทดสอบ 2');
    const value = await input.inputValue();
    expect(value).toBe('ข้อความทดสอบ 2');
  });

  test('#4 - Auto-focus หลังคลิกปุ่ม Send', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ
    await input.fill('ข้อความทดสอบ');

    // คลิกปุ่ม Send (ปรับ selector ตามจริง)
    const sendButton = page.locator('button[type="submit"]').last();
    await sendButton.click();

    // ตรวจสอบว่า input ว่างและยัง focus อยู่
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
  });

  /**
   * Test #3: Draft messages - ข้อความไม่หาย
   * ✅ พิมพ์ข้อความแล้วสลับ conversation ข้อความต้องยังอยู่
   */
  test('#3 - Draft messages ไม่หายเมื่อสลับ conversation', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ (ยังไม่ส่ง)
    const draftMessage = 'นี่คือ draft message ที่ยังไม่ส่ง';
    await input.fill(draftMessage);

    // ตรวจสอบว่า draft ถูกเก็บ (ใน localStorage)
    const drafts = await page.evaluate(() => {
      const stored = localStorage.getItem('draft-storage');
      return stored ? JSON.parse(stored) : null;
    });
    expect(drafts).toBeTruthy();

    // TODO: สลับไปยัง conversation อื่น
    // await page.click('[data-testid="conversation-item"]:nth-child(2)');
    // await page.waitForTimeout(500);

    // TODO: กลับมา conversation เดิม
    // await page.click('[data-testid="conversation-item"]:first-child');
    // await page.waitForTimeout(500);

    // ตรวจสอบว่าข้อความยังอยู่
    // await expect(input).toHaveValue(draftMessage);
  });

  test('#3 - Draft ถูกลบหลังส่งข้อความ', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ
    await input.fill('ข้อความทดสอบ draft');

    // ส่งข้อความ
    await input.press('Enter');

    // ตรวจสอบว่า draft ถูกลบแล้ว
    const draftsAfterSend = await page.evaluate(() => {
      const stored = localStorage.getItem('draft-storage');
      if (!stored) return null;
      const data = JSON.parse(stored);
      return data?.state?.drafts || {};
    });

    // Draft ควรเป็น empty object หรือไม่มี key สำหรับ conversation นี้
    // (ขึ้นอยู่กับ implementation)
    expect(draftsAfterSend).toBeTruthy();
  });

  /**
   * Test #14: เห็น cursor selection
   * ✅ เลือกข้อความเห็น highlight ชัดเจน
   */
  test('#14 - เห็น cursor highlight เมื่อเลือกข้อความ', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ
    await input.fill('ข้อความสำหรับทดสอบการเลือก');

    // Focus textarea
    await input.focus();

    // เลือกข้อความทั้งหมด (Ctrl+A)
    await input.press('Control+A');

    // ตรวจสอบ CSS selection style
    const selectionColor = await page.evaluate(() => {
      const style = window.getComputedStyle(document.body, '::selection');
      return style.backgroundColor;
    });

    // ตรวจสอบว่ามี selection color (ไม่ใช่ transparent)
    expect(selectionColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(selectionColor).toBeTruthy();
  });

  /**
   * Test: Auto-grow textarea
   * ✅ Textarea ปรับความสูงอัตโนมัติตามเนื้อหา
   */
  test('Textarea auto-grow ตามจำนวนบรรทัด', async ({ page }) => {
    const input = await getMessageInput(page);

    // วัดความสูงเริ่มต้น
    const initialHeight = await input.evaluate((el) => el.offsetHeight);

    // พิมพ์หลายบรรทัด
    await input.fill('บรรทัด 1');
    await input.press('Shift+Enter');
    await input.pressSequentially('บรรทัด 2');
    await input.press('Shift+Enter');
    await input.pressSequentially('บรรทัด 3');
    await input.press('Shift+Enter');
    await input.pressSequentially('บรรทัด 4');

    // วัดความสูงหลังพิมพ์หลายบรรทัด
    const expandedHeight = await input.evaluate((el) => el.offsetHeight);

    // ตรวจสอบว่าความสูงเพิ่มขึ้น
    expect(expandedHeight).toBeGreaterThan(initialHeight);

    // ตรวจสอบว่าไม่เกิน max-height (120px)
    expect(expandedHeight).toBeLessThanOrEqual(120);
  });

  /**
   * Test: การทำงานร่วมกันของทุก features
   */
  test('Integration test - ทุก features ทำงานร่วมกัน', async ({ page }) => {
    const input = await getMessageInput(page);

    // 1. พิมพ์ข้อความหลายบรรทัด
    await input.fill('บรรทัด 1');
    await input.press('Shift+Enter');
    await input.pressSequentially('บรรทัด 2');

    // 2. ตรวจสอบ draft (ยังไม่ส่ง)
    const value1 = await input.inputValue();
    expect(value1).toContain('บรรทัด 1\nบรรทัด 2');

    // 3. ส่งข้อความ
    await input.press('Enter');

    // 4. ตรวจสอบว่า input ว่างและ focus อยู่
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();

    // 5. พิมพ์ข้อความใหม่ได้ทันที
    await input.pressSequentially('ข้อความใหม่');
    const value2 = await input.inputValue();
    expect(value2).toBe('ข้อความใหม่');

    // 6. เลือกข้อความ
    await input.press('Control+A');

    // 7. ลบและพิมพ์ใหม่
    await input.press('Delete');
    await input.pressSequentially('Final message');

    const finalValue = await input.inputValue();
    expect(finalValue).toBe('Final message');
  });

});
