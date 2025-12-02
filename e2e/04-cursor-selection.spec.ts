import { test, expect } from '@playwright/test';
import {
  loginAndNavigateToConversation,
  getMessageInput,
  getSelectionStyle,
} from './helpers/test-helpers';

/**
 * Test #14: Cursor Selection Highlight
 * - เลือกข้อความเห็น highlight ชัดเจน
 * - มี ::selection CSS style
 */
test.describe('Test #14 - Cursor Selection Highlight', () => {

  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToConversation(page);
  });

  test('ควรเห็น highlight เมื่อเลือกข้อความด้วย Ctrl+A', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ
    await input.fill('ข้อความสำหรับทดสอบการเลือก');

    // Focus textarea
    await input.focus();

    // เลือกข้อความทั้งหมด (Ctrl+A)
    await input.press('Control+A');

    // ตรวจสอบ CSS selection style
    const selectionStyle = await getSelectionStyle(page);

    // ตรวจสอบว่ามี background color (ไม่ใช่ transparent)
    expect(selectionStyle.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(selectionStyle.backgroundColor).not.toBe('transparent');
    expect(selectionStyle.backgroundColor).toBeTruthy();
  });

  test('ควรมี selection color ที่กำหนดไว้', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์และเลือกข้อความ
    await input.fill('Test selection color');
    await input.focus();
    await input.press('Control+A');

    // ตรวจสอบ selection style
    const selectionStyle = await getSelectionStyle(page);

    // ควรมี color (text color) ที่ไม่ใช่ default
    expect(selectionStyle.color).toBeTruthy();
  });

  test('ควรเลือกข้อความด้วย mouse drag ได้', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ
    await input.fill('สามารถเลือกด้วย mouse ได้');

    // Get bounding box
    const box = await input.boundingBox();
    if (!box) throw new Error('Input not visible');

    // Drag to select (simulate mouse selection)
    await page.mouse.move(box.x + 10, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
    await page.mouse.up();

    // ตรวจสอบว่ามีข้อความถูกเลือก
    const selectedText = await page.evaluate(() => {
      return window.getSelection()?.toString() || '';
    });

    expect(selectedText.length).toBeGreaterThan(0);
  });

  test('ควรเลือกข้อความด้วย Shift+Arrow keys ได้', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ
    await input.fill('เลือกด้วย keyboard');

    // Focus และเลื่อน cursor ไปต้น
    await input.focus();
    await input.press('Home');

    // เลือกข้อความด้วย Shift+End
    await input.press('Shift+End');

    // ตรวจสอบว่าข้อความทั้งหมดถูกเลือก
    const selectedText = await input.evaluate((el: HTMLTextAreaElement) => {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      return el.value.substring(start, end);
    });

    expect(selectedText).toBe('เลือกด้วย keyboard');
  });

  test('ควรเห็น cursor เมื่อพิมพ์ข้อความ', async ({ page }) => {
    const input = await getMessageInput(page);

    // Focus textarea
    await input.focus();

    // ตรวจสอบว่า cursor visible (มี caret)
    const hasFocus = await input.evaluate((el) => el === document.activeElement);
    expect(hasFocus).toBe(true);

    // พิมพ์ข้อความ
    await input.pressSequentially('กำลังพิมพ์');

    // ตรวจสอบว่า cursor ยังอยู่
    const stillFocused = await input.evaluate((el) => el === document.activeElement);
    expect(stillFocused).toBe(true);
  });

  test('ควรเห็น selection highlight ในหลายบรรทัด', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์หลายบรรทัด
    await input.fill('บรรทัด 1');
    await input.press('Shift+Enter');
    await input.pressSequentially('บรรทัด 2');
    await input.press('Shift+Enter');
    await input.pressSequentially('บรรทัด 3');

    // เลือกทั้งหมด
    await input.press('Control+A');

    // ตรวจสอบว่าข้อความทั้งหมดถูกเลือก
    const selectedText = await input.evaluate((el: HTMLTextAreaElement) => {
      return el.value.substring(el.selectionStart, el.selectionEnd);
    });

    expect(selectedText).toContain('บรรทัด 1');
    expect(selectedText).toContain('บรรทัด 2');
    expect(selectedText).toContain('บรรทัด 3');
  });

  test('ควรเห็น selection เมื่อใช้ double-click เลือกคำ', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ
    await input.fill('คำแรก คำที่สอง คำสุดท้าย');

    // Double-click เพื่อเลือกคำ (กลางๆ)
    const box = await input.boundingBox();
    if (!box) throw new Error('Input not visible');

    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);

    // ตรวจสอบว่ามีคำถูกเลือก
    const selectedText = await input.evaluate((el: HTMLTextAreaElement) => {
      return el.value.substring(el.selectionStart, el.selectionEnd);
    });

    expect(selectedText.length).toBeGreaterThan(0);
  });

  test('ควรลบข้อความที่เลือกเมื่อกด Delete', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ
    await input.fill('ข้อความที่จะถูกลบ');

    // เลือกทั้งหมด
    await input.press('Control+A');

    // กด Delete
    await input.press('Delete');

    // ตรวจสอบว่าข้อความถูกลบ
    await expect(input).toHaveValue('');
  });

  test('ควร replace ข้อความที่เลือกเมื่อพิมพ์ใหม่', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ
    await input.fill('ข้อความเก่า');

    // เลือกทั้งหมด
    await input.press('Control+A');

    // พิมพ์ข้อความใหม่
    await input.pressSequentially('ข้อความใหม่');

    // ตรวจสอบว่าข้อความเก่าถูก replace
    await expect(input).toHaveValue('ข้อความใหม่');
  });

});
