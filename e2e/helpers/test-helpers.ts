import { type Page, type Locator } from '@playwright/test';

/**
 * Helper functions สำหรับ E2E tests
 */

/**
 * Setup: Login and navigate to conversation
 * ใช้ credentials จริงสำหรับ E2E testing
 *
 * Default conversation: 69cd966b-c0f4-44bf-ae6f-f08eaf501e20 (direct)
 * Group conversation: 7103d857-9498-4d55-9b6a-57d98162ee0f
 */
export async function loginAndNavigateToConversation(
  page: Page,
  conversationId: string = '69cd966b-c0f4-44bf-ae6f-f08eaf501e20' // Default to direct conversation
): Promise<void> {
  // Navigate to login page
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');

  // ถ้ามี auth อยู่แล้ว (จาก test ก่อนหน้า) จะ redirect ไป /chat
  const currentUrl = page.url();

  if (!currentUrl.includes('/auth/login')) {
    // Already logged in, just navigate to conversation
    await page.goto(`/chat/${conversationId}`);
    await page.waitForLoadState('networkidle');
    return;
  }

  // Login with test credentials
  await page.fill('#username', 'adminx');
  await page.fill('#password', '123456789');

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for redirect to /chat
  await page.waitForURL(/\/chat/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  // Navigate to specific conversation
  await page.goto(`/chat/${conversationId}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Get message input textarea
 */
export async function getMessageInput(page: Page): Promise<Locator> {
  // ใช้ data-testid (แนะนำ)
  return page.locator('[data-testid="message-input"]');
}

/**
 * Get send button
 */
export async function getSendButton(page: Page): Promise<Locator> {
  // ใช้ data-testid (แนะนำ)
  return page.locator('[data-testid="send-button"]');
}

/**
 * Send a message
 */
export async function sendMessage(
  page: Page,
  message: string,
  method: 'enter' | 'button' = 'enter'
): Promise<void> {
  const input = await getMessageInput(page);
  await input.fill(message);

  if (method === 'enter') {
    await input.press('Enter');
  } else {
    const sendBtn = await getSendButton(page);
    await sendBtn.click();
  }

  // Wait for message to be sent
  await page.waitForTimeout(500);
}

/**
 * Type multiline message (with Shift+Enter)
 */
export async function typeMultilineMessage(
  page: Page,
  lines: string[]
): Promise<void> {
  const input = await getMessageInput(page);

  for (let i = 0; i < lines.length; i++) {
    await input.pressSequentially(lines[i]);
    if (i < lines.length - 1) {
      await input.press('Shift+Enter');
    }
  }
}

/**
 * Get last message in conversation
 */
export async function getLastMessage(page: Page): Promise<Locator> {
  // ปรับ selector ตาม component จริง
  return page.locator('[data-testid="message-item"]').last();

  // หรือ:
  // return page.locator('.message-item').last();
}

/**
 * Get all messages in conversation
 */
export async function getAllMessages(page: Page): Promise<Locator> {
  return page.locator('[data-testid="message-item"]');
}

/**
 * Wait for message to appear
 */
export async function waitForMessageWithText(
  page: Page,
  text: string
): Promise<void> {
  await page.waitForSelector(`text=${text}`, { timeout: 5000 });
}

/**
 * Get draft from localStorage
 */
export async function getDraftFromStorage(
  page: Page,
  conversationId?: string
): Promise<Record<string, string> | null> {
  const drafts = await page.evaluate(() => {
    const stored = localStorage.getItem('draft-storage');
    if (!stored) return null;

    try {
      const data = JSON.parse(stored);
      return data?.state?.drafts || null;
    } catch {
      return null;
    }
  });

  if (!conversationId) {
    return drafts;
  }

  return drafts && conversationId in drafts ? { [conversationId]: drafts[conversationId] } : null;
}

/**
 * Clear all drafts from localStorage
 */
export async function clearDrafts(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('draft-storage');
  });
}

/**
 * Switch to different conversation
 * TODO: ปรับให้ตรงกับแอพจริง
 */
export async function switchConversation(
  page: Page,
  conversationIndex: number
): Promise<void> {
  const conversations = page.locator('[data-testid="conversation-item"]');
  await conversations.nth(conversationIndex).click();
  await page.waitForTimeout(500);
}

/**
 * Get computed style for selection
 */
export async function getSelectionStyle(page: Page): Promise<{
  backgroundColor: string;
  color: string;
}> {
  return await page.evaluate(() => {
    const style = window.getComputedStyle(document.body, '::selection');
    return {
      backgroundColor: style.backgroundColor,
      color: style.color,
    };
  });
}

/**
 * Measure element height
 */
export async function getElementHeight(locator: Locator): Promise<number> {
  return await locator.evaluate((el) => el.offsetHeight);
}

/**
 * Check if element is focused
 */
export async function isElementFocused(locator: Locator): Promise<boolean> {
  return await locator.evaluate((el) => el === document.activeElement);
}
