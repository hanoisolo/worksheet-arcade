import { expect, test } from '@playwright/test';

test('home page renders without console errors', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => {
    errors.push(String(error));
  });

  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Turn any worksheet into games' })
  ).toBeVisible();

  expect(errors, `Console errors: ${errors.join('\n')}`).toEqual([]);
});
