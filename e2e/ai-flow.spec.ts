import { test, expect, type Request } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { GEMINI_ROUTE, geminiBody, withKey, uploadPng } from './fixtures';

test('AI flow builds games from mocked Gemini', async ({ page }) => {
  let captured: Request | undefined;
  await page.route(GEMINI_ROUTE, async route => {
    captured = route.request();
    await new Promise(r => setTimeout(r, 1500));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(geminiBody()),
    });
  });

  await withKey(page);
  await page.goto('/');
  await uploadPng(page);

  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations).toEqual([]);

  await page.getByRole('button', { name: 'Make my games' }).click();
  await expect(page.getByRole('heading', { name: 'Building your games…' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Water Cycle Quest' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Demo', { exact: true })).toHaveCount(0);

  expect(captured!.headers()['x-goog-api-key']).toBe('test-key');
  expect(captured!.url()).not.toContain('key=');
});
