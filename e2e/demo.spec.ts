import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { uploadPng } from './fixtures';

test('demo flow with axe scan on the ready screen', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Try the demo' }).click();

  await expect(page.getByRole('heading', { name: 'Fraction Frenzy' })).toBeVisible();
  await expect(page.getByText('Demo', { exact: true })).toBeVisible();
  const gameButtons = page.getByRole('button', { name: /Space Blaster|Memory Match|Boss Quest/ });
  await expect(gameButtons).toHaveCount(3);

  const axeResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axeResults.violations).toEqual([]);

  await page.getByRole('button', { name: /Boss Quest/ }).click();
  await expect(page.getByText('Coming soon!')).toBeVisible();

  await page.getByRole('button', { name: 'Back to games' }).click();
  await expect(page.getByRole('heading', { name: 'Fraction Frenzy' })).toBeVisible();

  await page.getByRole('button', { name: 'New worksheet' }).click();
  await expect(page.getByRole('heading', { name: 'Turn any worksheet into games' })).toBeVisible();
});

test('uploader rejects .txt and .heic', async ({ page }) => {
  await page.goto('/');

  const fileInput = page.getByTestId('file-input');
  await fileInput.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
  await expect(page.getByRole('alert')).toContainText('Please upload');

  await fileInput.setInputFiles({ name: 'photo.heic', mimeType: 'image/heic', buffer: Buffer.from('x') });
  await expect(page.getByRole('alert')).toContainText('HEIC');
});

test('no key: upload enables Make my games and opens the key dialog', async ({ page }) => {
  await page.goto('/');

  await uploadPng(page);
  await expect(page.getByText('sheet.jpg')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Make my games' })).toBeEnabled();

  await page.getByRole('button', { name: 'Make my games' }).click();
  await expect(page.getByRole('dialog', { name: 'AI provider & key' })).toBeVisible();
});
