/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const keyDialogName = 'AI provider & key';

async function openKeyDialog(page: Page): Promise<void> {
  await page.getByRole('button', { name: /AI key settings/ }).click();
  await expect(page.getByRole('dialog', { name: keyDialogName })).toBeVisible();
}

test('CSP allows Mistral API calls and nothing is blocked while the app runs', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.addInitScript(() => {
    const win = window as unknown as { __csp: string[] };
    win.__csp = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      const violation = event as SecurityPolicyViolationEvent;
      win.__csp.push(`${violation.violatedDirective} ${violation.blockedURI}`);
    });
  });

  await page.goto('/');

  const policy = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  expect(policy).toContain('connect-src https://api.mistral.ai');

  await openKeyDialog(page);

  expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp.length)).toBe(0);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('home page and key dialog pass wcag2a/wcag2aa accessibility audits', async ({ page }) => {
  await page.goto('/');

  const homeScan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(homeScan.violations).toEqual([]);

  await openKeyDialog(page);

  const dialogScan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(dialogScan.violations).toEqual([]);
});

test('saving a key stores it in sessionStorage only and updates the header chip', async ({ page }) => {
  await page.goto('/');

  await openKeyDialog(page);
  await page.getByLabel('API key').fill('test-key-123');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Key ✓')).toBeVisible();

  expect(await page.evaluate(() => sessionStorage.getItem('wa.key.gemini'))).toBe('test-key-123');
  expect(await page.evaluate(() => localStorage.getItem('wa.key.gemini'))).toBeNull();
});
