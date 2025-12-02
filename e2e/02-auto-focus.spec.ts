import { test, expect } from '@playwright/test';
import {
  loginAndNavigateToConversation,
  getMessageInput,
  getSendButton,
  sendMessage,
} from './helpers/test-helpers';

/**
 * Test #4: Auto-focus
 * - หลังส่งข้อความ cursor ต้องกลับมาที่ input box อัตโนมัติ
 */
test.describe('Test #4 - Auto-focus', () => {

  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToConversation(page);
  });

  test('ควร auto-focus หลังส่งข้อความด้วย Enter', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์และส่งข้อความ
    await input.fill('ข้อความทดสอบ 1');
    await input.press('Enter');

    // รอให้ข้อความถูกส่งและ state update เสร็จ
    await page.waitForTimeout(200);

    // ตรวจสอบว่า input ว่างเปล่า
    await expect(input).toHaveValue('');

    // ตรวจสอบว่า input ยังมี focus อยู่
    await expect(input).toBeFocused();
  });

  test('ควร auto-focus หลังคลิกปุ่ม Send', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ
    await input.fill('ข้อความทดสอบ 2');

    // คลิกปุ่ม Send (force click เพื่อข้าม toast notification)
    const sendBtn = await getSendButton(page);
    await sendBtn.click({ force: true });

    // รอให้ข้อความถูกส่งและ state update เสร็จ
    await page.waitForTimeout(200);

    // ตรวจสอบว่า input ว่างและยัง focus อยู่
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
  });

  test('ควรพิมพ์ต่อได้ทันทีหลังส่งข้อความ (ไม่ต้องคลิกใหม่)', async ({ page }) => {
    const input = await getMessageInput(page);

    // ส่งข้อความ
    await sendMessage(page, 'ข้อความแรก');

    // รอให้ auto-focus ทำงาน
    await page.waitForTimeout(200);

    // ตรวจสอบว่ามี focus
    await expect(input).toBeFocused();

    // พิมพ์ข้อความใหม่ได้ทันที (ไม่ต้องคลิก)
    await input.pressSequentially('ข้อความที่สอง');

    const value = await input.inputValue();
    expect(value).toBe('ข้อความที่สอง');
  });

  test('ควรส่งข้อความได้หลายครั้งติดกัน', async ({ page }) => {
    const input = await getMessageInput(page);

    // ส่งข้อความ 3 ครั้งติดกัน
    for (let i = 1; i <= 3; i++) {
      await input.fill(`ข้อความที่ ${i}`);
      await input.press('Enter');

      // รอให้ auto-focus ทำงาน
      await page.waitForTimeout(200);

      // ตรวจสอบว่ายังมี focus อยู่
      await expect(input).toBeFocused();
      await expect(input).toHaveValue('');
    }
  });

  test('ควรมี focus หลังอัปโหลดไฟล์', async ({ page }) => {
    const input = await getMessageInput(page);

    // TODO: Test upload file
    // const fileInput = page.locator('input[type="file"]');
    // await fileInput.setInputFiles('path/to/test-file.png');

    // ตรวจสอบว่า textarea ยังมี focus
    // await expect(input).toBeFocused();
  });

  test('ควรมี focus หลังเลือก emoji', async ({ page }) => {
    const input = await getMessageInput(page);

    // TODO: Test emoji selection
    // await page.click('[data-testid="emoji-button"]');
    // await page.click('[data-testid="emoji-😀"]');

    // ตรวจสอบว่า textarea ยังมี focus
    // await expect(input).toBeFocused();
  });

});
