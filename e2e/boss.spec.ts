import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SAMPLE_PAYLOAD } from '../src/mock/sampleData';

const L = SAMPLE_PAYLOAD.levels;

const spell = (page: Page, o: string) =>
  page.locator('[data-testid="spell"][data-option="' + o + '"]');

const key = (i: number) => String(L[i].options.indexOf(L[i].correctAnswer) + 1);

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

test('full demo battle covers all 8 questions', async ({ page }) => {
  await start(page);
  await axe(page);
  expect(await overflow(page)).toBeLessThanOrEqual(0);

  // Level 0: correct answer.
  await spell(page, L[0].correctAnswer).click();
  await expect(page.getByText('Your spell hit! Boss HP is down to 88%.')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Boss HP' })).toHaveAttribute('aria-valuenow', '88');
  await page.getByRole('button', { name: 'Next question' }).click();

  // Level 1: one wrong answer, then the correct one via keyboard.
  const wrong = L[1].options.find(o => o !== L[1].correctAnswer)!;
  await spell(page, wrong).click();
  await expect(page.getByText(/bonks you/)).toBeVisible();
  await expect(page.getByText(L[1].hint)).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Hero HP' })).toHaveAttribute('aria-valuenow', '85');
  await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'spell');
  await axe(page);
  await page.keyboard.press(key(1));
  await page.getByRole('button', { name: 'Next question' }).click();

  // Levels 2..6: alternate mouse and keyboard, all correct.
  for (let i = 2; i <= 6; i++) {
    await expect(page.getByText('Question ' + (i + 1) + '/8')).toBeVisible();
    if (i % 2 === 0) {
      await spell(page, L[i].correctAnswer).click();
    } else {
      await page.keyboard.press(key(i));
    }
    await page.getByRole('button', { name: 'Next question' }).click();
  }
  await expect(page.getByRole('progressbar', { name: 'Boss HP' })).toHaveAttribute('aria-valuenow', '13');

  // Level 7: final blow.
  await spell(page, L[7].correctAnswer).click();
  await expect(page.getByText('Final blow! The Goofy Slime is defeated!')).toBeVisible();
  await page.getByRole('button', { name: 'Claim victory' }).click();

  // Shared victory review screen.
  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
  await expect(page.getByRole('img', { name: '2 of 3 stars' })).toBeVisible();
  await expect(page.getByText('7 of 8 on the first try · Hero HP 85%')).toBeVisible();
  const review = page.getByTestId('review-item');
  await expect(review).toHaveCount(1);
  await expect(review.first()).toContainText('Correct answer: ' + L[1].correctAnswer);
  await expect(review.first()).toContainText(L[1].explanation);
  await axe(page);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Back to games' }).click();
  await expect(page.getByRole('heading', { name: 'Pick another game' })).toBeVisible();
});

test('no game over when hero HP hits 0', async ({ page }) => {
  await start(page);
  for (const lvl of [L[0], L[1]]) {
    for (const o of lvl.options.filter(opt => opt !== lvl.correctAnswer)) {
      await spell(page, o).click();
    }
    await spell(page, lvl.correctAnswer).click();
    await page.getByRole('button', { name: 'Next question' }).click();
  }
  const wrong = L[2].options.find(o => o !== L[2].correctAnswer)!;
  await spell(page, wrong).click();
  await expect(page.getByRole('progressbar', { name: 'Hero HP' })).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByText(/heroes never give up/)).toBeVisible();
  await expect(page.getByText('Question 3/8')).toBeVisible();
  await spell(page, L[2].correctAnswer).click();
  await expect(page.getByText(/Your spell hit!/)).toBeVisible();
});

test('reduced motion: no idle bob or spell burst', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  const boss = page.getByRole('img', { name: /^Goofy Slime/ });
  expect(await boss.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await spell(page, L[0].correctAnswer).click();
  await expect(page.getByText(/Your spell hit!/)).toBeVisible();
  await expect(page.locator('.spell-burst')).toBeHidden();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});
