import { test, expect } from '@playwright/test';
import { GEMINI_ROUTE, withKey, uploadPng } from './fixtures';

test('bad key shows auth error and demo fallback', async ({ page }) => {
  await page.route(GEMINI_ROUTE, route =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'API key not valid' } }),
    })
  );

  await withKey(page);
  await page.goto('/');
  await uploadPng(page);

  await page.getByRole('button', { name: 'Make my games' }).click();
  await expect(page.getByRole('heading', { name: "That key didn't work" })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check my key' })).toBeVisible();

  await page.getByRole('button', { name: 'Play the demo instead' }).click();
  await expect(page.getByRole('heading', { name: 'Fraction Frenzy' })).toBeVisible();
});

test('cancel returns to setup with the file kept', async ({ page }) => {
  await page.route(GEMINI_ROUTE, async route => {
    await new Promise(r => setTimeout(r, 10000));
    try {
      await route.abort();
    } catch {
      /* page moved on */
    }
  });

  await withKey(page);
  await page.goto('/');
  await uploadPng(page);

  await page.getByRole('button', { name: 'Make my games' }).click();
  await expect(page.getByRole('heading', { name: 'Building your games…' })).toBeVisible();

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { name: 'Turn any worksheet into games' })).toBeVisible();
  await expect(page.getByText('sheet.jpg')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Make my games' })).toBeEnabled();
});
