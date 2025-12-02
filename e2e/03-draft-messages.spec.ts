import { test, expect } from '@playwright/test';
import {
  loginAndNavigateToConversation,
  getMessageInput,
  getDraftFromStorage,
  clearDrafts,
  switchConversation,
} from './helpers/test-helpers';

/**
 * Test #3: Draft Messages
 * - พิมพ์ข้อความแล้วสลับ conversation ข้อความต้องยังอยู่
 * - Draft ถูกเก็บใน localStorage
 * - Draft ถูกลบหลังส่งข้อความ
 */
test.describe('Test #3 - Draft Messages', () => {

  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToConversation(page);
    // Clear drafts before each test
    await clearDrafts(page);
  });

  test('ควรเก็บ draft ใน localStorage เมื่อพิมพ์ข้อความ', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ (ยังไม่ส่ง)
    const draftMessage = 'นี่คือ draft message ที่ยังไม่ส่ง';
    await input.fill(draftMessage);

    // รอให้ draft ถูกเก็บ (debounce)
    await page.waitForTimeout(300);

    // ตรวจสอบว่า draft ถูกเก็บใน localStorage
    const drafts = await getDraftFromStorage(page);
    expect(drafts).toBeTruthy();

    // ตรวจสอบว่ามีข้อความที่พิมพ์
    const allDrafts = await getDraftFromStorage(page);
    const hasDraft = allDrafts && Object.values(allDrafts).some(
      (draft) => draft === draftMessage
    );
    expect(hasDraft).toBe(true);
  });

  test('ควรเก็บ draft แยกตาม conversation', async ({ page }) => {
    const input = await getMessageInput(page);

    // TODO: ต้องมีอย่างน้อย 2 conversations
    // Conversation 1
    const draft1 = 'Draft สำหรับ conversation 1';
    await input.fill(draft1);
    await page.waitForTimeout(300);

    // สลับไป Conversation 2
    // await switchConversation(page, 1);
    // const draft2 = 'Draft สำหรับ conversation 2';
    // await input.fill(draft2);
    // await page.waitForTimeout(300);

    // ตรวจสอบว่ามี 2 drafts แยกกัน
    // const drafts = await getDraftFromStorage(page);
    // expect(Object.keys(drafts || {}).length).toBe(2);
  });

  test('ควรโหลด draft กลับมาเมื่อกลับมาที่ conversation เดิม', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความใน conversation 1
    const draftMessage = 'นี่คือ draft ที่ต้องกลับมา';
    await input.fill(draftMessage);
    await page.waitForTimeout(300);

    // TODO: สลับไปยัง conversation อื่น
    // await switchConversation(page, 1);
    // await page.waitForTimeout(500);

    // กลับมา conversation เดิม
    // await switchConversation(page, 0);
    // await page.waitForTimeout(500);

    // ตรวจสอบว่าข้อความยังอยู่
    // await expect(input).toHaveValue(draftMessage);
  });

  test('ควรลบ draft หลังส่งข้อความแล้ว', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ
    await input.fill('ข้อความทดสอบ draft');
    await page.waitForTimeout(300);

    // ตรวจสอบว่ามี draft
    let drafts = await getDraftFromStorage(page);
    expect(drafts).toBeTruthy();

    // ส่งข้อความ
    await input.press('Enter');
    await page.waitForTimeout(300);

    // ตรวจสอบว่า draft ถูกลบแล้ว (หรือว่างเปล่า)
    drafts = await getDraftFromStorage(page);
    const hasEmptyDraft = drafts && Object.values(drafts).every(
      (draft) => draft === ''
    );
    expect(hasEmptyDraft || !drafts || Object.keys(drafts).length === 0).toBe(true);
  });

  test('ควรอัปเดต draft แบบ real-time ขณะพิมพ์', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ทีละนิด
    await input.fill('Hello');
    await page.waitForTimeout(300);

    let drafts = await getDraftFromStorage(page);
    let currentDraft = Object.values(drafts || {})[0];
    expect(currentDraft).toContain('Hello');

    // พิมพ์ต่อ
    await input.fill('Hello World');
    await page.waitForTimeout(300);

    drafts = await getDraftFromStorage(page);
    currentDraft = Object.values(drafts || {})[0];
    expect(currentDraft).toBe('Hello World');
  });

  test('ควรจัดการ draft สำหรับข้อความหลายบรรทัด', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความหลายบรรทัด
    await input.fill('บรรทัดแรก');
    await input.press('Shift+Enter');
    await input.pressSequentially('บรรทัดที่สอง');
    await page.waitForTimeout(300);

    // ตรวจสอบว่า draft มี newline
    const drafts = await getDraftFromStorage(page);
    const currentDraft = Object.values(drafts || {})[0];
    expect(currentDraft).toContain('\n');
    expect(currentDraft).toContain('บรรทัดแรก');
    expect(currentDraft).toContain('บรรทัดที่สอง');
  });

  test('ควรล้าง draft เมื่อ refresh หน้า', async ({ page }) => {
    const input = await getMessageInput(page);

    // พิมพ์ข้อความ
    await input.fill('Draft ก่อน refresh');
    await page.waitForTimeout(300);

    // Refresh หน้า
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ตรวจสอบว่า draft ยังอยู่ (เพราะเก็บใน localStorage)
    const inputAfterReload = await getMessageInput(page);
    // await expect(inputAfterReload).toHaveValue('Draft ก่อน refresh');
  });

});
