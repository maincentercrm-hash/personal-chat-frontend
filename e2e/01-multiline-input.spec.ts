import { test, expect } from '@playwright/test';
import {
  loginAndNavigateToConversation,
  getMessageInput,
  typeMultilineMessage,
} from './helpers/test-helpers';

/**
 * Test #5: เว้นบรรทัดได้ (Multiline Input)
 * - Shift+Enter = ขึ้นบรรทัดใหม่
 * - Enter = ส่งข้อความ
 */
test.describe('Test #5 - Multiline Input (Shift+Enter)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToConversation(page);
  });

  test('ควรขึ้นบรรทัดใหม่เมื่อกด Shift+Enter', async ({ page }) => {
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
  });

  test('ควรสามารถพิมพ์ได้หลายบรรทัด', async ({ page }) => {
    const input = await getMessageInput(page);

    // ใช้ helper function สำหรับพิมพ์หลายบรรทัด
    await typeMultilineMessage(page, [
      'บรรทัดที่ 1',
      'บรรทัดที่ 2',
      'บรรทัดที่ 3',
      'บรรทัดที่ 4',
    ]);

    // ตรวจสอบว่ามีครบ 4 บรรทัด
    const value = await input.inputValue();
    const lines = value.split('\n');
    expect(lines.length).toBe(4);
    expect(lines[0]).toBe('บรรทัดที่ 1');
    expect(lines[3]).toBe('บรรทัดที่ 4');
  });

  test('ควรส่งข้อความเมื่อกด Enter (ไม่กด Shift)', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ
    await input.fill('ข้อความทดสอบ');

    // กด Enter (ไม่กด Shift)
    await input.press('Enter');

    // ตรวจสอบว่า input ว่างเปล่า (ข้อความถูกส่งแล้ว)
    await expect(input).toHaveValue('');
  });

  test('ควรส่งข้อความหลายบรรทัดได้', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความหลายบรรทัด
    await typeMultilineMessage(page, [
      'บรรทัดที่ 1',
      'บรรทัดที่ 2',
      'บรรทัดที่ 3',
    ]);

    // กด Enter เพื่อส่ง
    await input.press('Enter');

    // ตรวจสอบว่า input ว่างเปล่า
    await expect(input).toHaveValue('');

    // TODO: ตรวจสอบว่าข้อความปรากฏใน message list
    // const lastMessage = await getLastMessage(page);
    // await expect(lastMessage).toContainText('บรรทัดที่ 1');
    // await expect(lastMessage).toContainText('บรรทัดที่ 3');
  });

  test('ควร auto-grow ตามจำนวนบรรทัด', async ({ page }) => {
    const input = await getMessageInput(page);

    // วัดความสูงเริ่มต้น
    const initialHeight = await input.evaluate((el) => el.offsetHeight);

    // พิมพ์หลายบรรทัด
    await typeMultilineMessage(page, [
      'บรรทัด 1',
      'บรรทัด 2',
      'บรรทัด 3',
      'บรรทัด 4',
      'บรรทัด 5',
    ]);

    // วัดความสูงหลังพิมพ์หลายบรรทัด
    const expandedHeight = await input.evaluate((el) => el.offsetHeight);

    // ตรวจสอบว่าความสูงเพิ่มขึ้น
    expect(expandedHeight).toBeGreaterThan(initialHeight);

    // ตรวจสอบว่าไม่เกิน max-height (120px)
    expect(expandedHeight).toBeLessThanOrEqual(120);
  });

  test('ควรมี scrollbar เมื่อเนื้อหาเกิน max-height', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์หลายบรรทัดให้เกิน max-height
    const manyLines = Array.from({ length: 10 }, (_, i) => `บรรทัดที่ ${i + 1}`);
    await typeMultilineMessage(page, manyLines);

    // ตรวจสอบว่า scrollHeight > offsetHeight (มี scrollbar)
    const hasScroll = await input.evaluate((el) => {
      return el.scrollHeight > el.offsetHeight;
    });

    expect(hasScroll).toBe(true);
  });

});
