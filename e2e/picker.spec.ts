import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SAMPLE_PAYLOAD } from '../src/mock/sampleData';

const L = SAMPLE_PAYLOAD.levels;
const key = (i: number) => String(L[i].options.indexOf(L[i].correctAnswer) + 1);
const wrongKey = (i: number) => String(L[i].options.findIndex(o => o !== L[i].correctAnswer) + 1);
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations).toEqual([]);
}

async function playAll(page: Page, lastButton: string, wrongOn?: number) {
  for (let i = 0; i < 8; i++) {
    await expect(page.getByText('Question ' + (i + 1) + '/8')).toBeVisible();
    if (i === wrongOn) {
      await page.keyboard.press(wrongKey(i));
      await expect(page.getByText('Hint:')).toBeVisible();
    }
    await page.keyboard.press(key(i));
    await page.getByRole('button', { name: i === 7 ? lastButton : 'Next question' }).click();
  }
}

test('review screens and play-another-game flow', async ({ page }) => {
  test.setTimeout(90000);

  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByRole('heading', { name: 'Pick a game' })).toBeVisible();

  await page.getByRole('button', { name: /Space Blaster/ }).click();
  await playAll(page, 'See results', 0);
  await expect(page.getByRole('heading', { name: 'Mission complete!' })).toBeVisible();
  await expect(page.getByText('Score: 800')).toBeVisible();
  const items = page.getByTestId('review-item');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('Correct answer: ' + L[0].correctAnswer);
  await expect(items.first()).toContainText(L[0].explanation);
  await axe(page);
  expect(await overflow(page)).toBeLessThanOrEqual(0);

  await page.getByRole('button', { name: 'Back to games' }).click();
  await expect(page.getByRole('heading', { name: 'Pick another game' })).toBeVisible();
  await expect(page.getByText('Played 1 of 3')).toBeVisible();
  await expect(page.getByRole('button', { name: /Space Blaster/ })).toContainText('Played · Score 800');

  await page.getByRole('button', { name: /Boss Quest/ }).click();
  await playAll(page, 'Claim victory');
  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
  await expect(page.getByText('Perfect run: no mistakes to review!')).toBeVisible();
  await expect(page.getByRole('img', { name: '3 of 3 stars' })).toBeVisible();
  await axe(page);

  await page.getByRole('button', { name: 'Back to games' }).click();
  await expect(page.getByText('Played 2 of 3')).toBeVisible();
  await expect(page.getByRole('button', { name: /Boss Quest/ })).toContainText('Played · 3 of 3 stars');
  await axe(page);
  expect(await overflow(page)).toBeLessThanOrEqual(0);

  await page.getByRole('button', { name: 'New worksheet' }).click();
  await expect(page.getByRole('heading', { name: 'Turn any worksheet into games' })).toBeVisible();
});
