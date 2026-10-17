import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const cards = (page: Page) => page.getByTestId('memory-card');

const pair = (page: Page, id: string) =>
  page.locator('[data-testid="memory-card"][data-pair="' + id + '"]');

async function solve(page: Page) {
  const ids = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'];
  for (const [i, id] of ids.entries()) {
    await pair(page, id).nth(0).click();
    await pair(page, id).nth(1).click();
    // The last match unmounts the board for the completion screen.
    if (i < ids.length - 1) {
      await expect(pair(page, id).nth(0)).toHaveAttribute('data-state', 'matched');
    }
  }
}

async function startGame(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByRole('heading', { name: 'Fraction Frenzy' })).toBeVisible();
  await page.getByRole('button', { name: /Memory Match/ }).click();
  await expect(page.getByRole('heading', { name: 'Memory Match' })).toBeVisible();
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
}

test('plays a full demo game of Memory Match', async ({ page }) => {
  await startGame(page);

  await expect(cards(page)).toHaveCount(12);
  await expectNoAxeViolations(page);

  // Mismatched cards flip back after 900 ms.
  await pair(page, 'p0').nth(0).click();
  await pair(page, 'p1').nth(0).click();
  await expect(pair(page, 'p0').nth(0)).toHaveAttribute('data-state', 'up');
  await expect(pair(page, 'p1').nth(0)).toHaveAttribute('data-state', 'up');
  await expect(pair(page, 'p0').nth(0)).toHaveAttribute('data-state', 'down', { timeout: 3000 });
  await expect(pair(page, 'p1').nth(0)).toHaveAttribute('data-state', 'down', { timeout: 3000 });
  await expect(page.getByText('Moves: 1')).toBeVisible();

  await solve(page);

  await expect(page.getByRole('heading', { name: 'You matched them all!' })).toBeVisible();
  await expect(page.getByText(/7 moves · \d+:\d\d/)).toBeVisible();
  await expect(page.getByTestId('confetti')).toBeAttached();
  await expectNoAxeViolations(page);

  await page.getByRole('button', { name: 'Back to games' }).click();
  await expect(page.getByRole('heading', { name: 'Fraction Frenzy' })).toBeVisible();
});

test('respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startGame(page);

  await solve(page);

  await expect(page.getByRole('heading', { name: 'You matched them all!' })).toBeVisible();
  await expect(page.getByTestId('confetti')).toHaveCount(0);

  await page.getByRole('button', { name: 'Play again' }).click();
  const dur = await cards(page).first().evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(parseFloat(dur)).toBeLessThan(0.01);
});

test('mute toggle persists', async ({ page }) => {
  await page.goto('/');
  const mute = page.getByRole('button', { name: 'Mute sound' });
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Mute sound' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});

test('no horizontal overflow on home or board', async ({ page }) => {
  await page.goto('/');
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);
  await startGame(page);
  expect(await overflow()).toBeLessThanOrEqual(0);
});
