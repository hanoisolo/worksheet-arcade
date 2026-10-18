import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SAMPLE_PAYLOAD } from '../src/mock/sampleData';

const L = SAMPLE_PAYLOAD.levels;

const spell = (page: Page, o: string) =>
  page.locator('[data-testid="spell"][data-option="' + o + '"]');

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await page.getByRole('button', { name: /Boss Quest/ }).click();
  await expect(page.getByRole('heading', { name: 'Boss Quest' })).toBeVisible();
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations).toEqual([]);
}

test('plays a full demo battle to victory', async ({ page }) => {
  await start(page);
  await axe(page);
  expect(await overflow(page)).toBeLessThanOrEqual(0);

  // Level 0: correct answer on the first try.
  await spell(page, L[0].correctAnswer).click();
  await expect(page.getByText('Your spell hit! −25 boss HP')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Boss HP' })).toHaveAttribute('aria-valuenow', '75');
  await page.getByRole('button', { name: 'Next question' }).click();

  // Level 1: a wrong answer reveals the hint, then the correct key lands the hit.
  const wrong = L[1].options.find(o => o !== L[1].correctAnswer)!;
  await spell(page, wrong).click();
  await expect(page.getByText(/bonks you/)).toBeVisible();
  await expect(page.getByText(L[1].hint)).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Hero HP' })).toHaveAttribute('aria-valuenow', '85');
  await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'spell');
  await axe(page);
  await page.keyboard.press(String(L[1].options.indexOf(L[1].correctAnswer) + 1));
  await expect(page.getByText('Your spell hit! −25 boss HP')).toBeVisible();
  await page.getByRole('button', { name: 'Next question' }).click();

  // Level 2: keyboard-only correct answer.
  await page.keyboard.press(String(L[2].options.indexOf(L[2].correctAnswer) + 1));
  await expect(page.getByText('Your spell hit! −25 boss HP')).toBeVisible();
  await page.getByRole('button', { name: 'Next question' }).click();

  // Level 3: the final blow.
  await spell(page, L[3].correctAnswer).click();
  await expect(page.getByText('Final blow! The Goofy Slime is defeated!')).toBeVisible();
  await page.getByRole('button', { name: 'Claim victory' }).click();

  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
  await expect(page.getByRole('img', { name: '2 of 3 stars' })).toBeVisible();
  await expect(page.getByText('3 of 4 on the first try · Hero HP 85%')).toBeVisible();
  await axe(page);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Back to games' }).click();
  await expect(page.getByRole('heading', { name: 'Fraction Frenzy' })).toBeVisible();
});

test('no game over when hero HP hits 0', async ({ page }) => {
  await start(page);

  // Level 0: three wrong answers, then the correct one.
  for (const o of L[0].options.filter(opt => opt !== L[0].correctAnswer)) {
    await spell(page, o).click();
  }
  await spell(page, L[0].correctAnswer).click();
  await page.getByRole('button', { name: 'Next question' }).click();

  // Level 1: three wrong answers, then the correct one.
  for (const o of L[1].options.filter(opt => opt !== L[1].correctAnswer)) {
    await spell(page, o).click();
  }
  await spell(page, L[1].correctAnswer).click();
  await page.getByRole('button', { name: 'Next question' }).click();

  // Level 2: one more wrong answer floors hero HP at 0.
  const wrong = L[2].options.find(o => o !== L[2].correctAnswer)!;
  await spell(page, wrong).click();
  await expect(page.getByRole('progressbar', { name: 'Hero HP' })).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByText(/heroes never give up/)).toBeVisible();
  await expect(page.getByText('Question 3/8')).toBeVisible();
  await spell(page, L[2].correctAnswer).click();
  await expect(page.getByText('Your spell hit! −25 boss HP')).toBeVisible();
});

test('reduced motion: no idle bob or spell burst', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  const boss = page.getByRole('img', { name: /^Goofy Slime/ });
  expect(await boss.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await spell(page, L[0].correctAnswer).click();
  await expect(page.getByText('Your spell hit! −25 boss HP')).toBeVisible();
  await expect(page.locator('.spell-burst')).toBeHidden();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});
