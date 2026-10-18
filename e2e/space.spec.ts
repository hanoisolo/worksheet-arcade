import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SAMPLE_PAYLOAD } from '../src/mock/sampleData';

const ast = (page: Page, option: string) =>
  page.locator('[data-testid="asteroid"][data-option="' + option.replace(/"/g, '\\"') + '"]');

async function shoot(page: Page, option: string) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(1, 1);
  const field = page.getByTestId('asteroid-field');
  await expect
    .poll(
      async () => {
        const f = await field.boundingBox();
        const b = await ast(page, option).boundingBox();
        if (!f || !b) return false;
        const cy = b.y + b.height / 2;
        return cy > f.y + 24 && cy < f.y + f.height * 0.78;
      },
      { timeout: 25000, intervals: [100] },
    )
    .toBe(true);
  await ast(page, option).click({ force: true });
}

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await page.getByRole('button', { name: /Space Blaster/ }).click();
  await expect(page.getByRole('heading', { name: 'Space Blaster' })).toBeVisible();
}

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
}

test('plays a full demo game with right and wrong answers', async ({ page }) => {
  test.setTimeout(120000);
  await start(page);

  await expectNoViolations(page);
  expect(await overflow(page)).toBeLessThanOrEqual(0);

  const levels = SAMPLE_PAYLOAD.levels;
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    await expect(page.getByText('Question ' + (i + 1) + '/8')).toBeVisible();

    if (i === 0 || i === 3) {
      const wrong = level.options.find(o => o !== level.correctAnswer)!;
      await shoot(page, wrong);
      await expect(page.getByText(/Shield −20/)).toBeVisible();
      await expect(page.getByText(level.hint)).toBeVisible();
      await expect(ast(page, wrong)).toHaveAttribute('data-state', 'tried');
      if (i === 3) {
        await expectNoViolations(page);
      }
    }

    if (i % 2 === 0) {
      await shoot(page, level.correctAnswer);
    } else {
      await page.keyboard.press(String(level.options.indexOf(level.correctAnswer) + 1));
    }
    await expect(page.getByText('Direct hit! +100')).toBeVisible();
    await page.getByRole('button', { name: i === 7 ? 'See results' : 'Next question' }).click();
  }

  await expect(page.getByRole('heading', { name: 'Mission complete!' })).toBeVisible();
  await expect(page.getByText('Score: 800')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByText('6 of 8 on the first try · Shield 60%')).toBeVisible();
  await expectNoViolations(page);
  expect(await overflow(page)).toBeLessThanOrEqual(0);

  await page.getByRole('button', { name: 'Back to games' }).click();
  await expect(page.getByRole('heading', { name: 'Fraction Frenzy' })).toBeVisible();
});

test('reduced motion: asteroids stand still and are clickable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);

  const first = page.getByTestId('asteroid').first();
  const a = await first.boundingBox();
  await page.waitForTimeout(800);
  const b = await first.boundingBox();
  expect(b!.y).toBe(a!.y);
  const animationName = await first.evaluate(el => getComputedStyle(el).animationName);
  expect(animationName).toBe('none');

  await ast(page, SAMPLE_PAYLOAD.levels[0].correctAnswer).click();
  await expect(page.getByText('Direct hit! +100')).toBeVisible();
});

test('asteroids drift and keep cycling (no lost answers)', async ({ page }) => {
  await start(page);

  const first = page.getByTestId('asteroid').first();
  await page.mouse.move(0, 0);
  const y1 = (await first.boundingBox())!.y;
  await page.waitForTimeout(1500);
  const y2 = (await first.boundingBox())!.y;
  expect(y2).not.toBe(y1);

  await page.waitForTimeout(3000);
  const asteroids = page.getByTestId('asteroid');
  await expect(asteroids).toHaveCount(4);
  for (let k = 0; k < 4; k++) {
    await expect(asteroids.nth(k)).toHaveAttribute('data-state', 'live');
  }
});

test('no game over: shield empties and play continues; focus moves after a wrong key', async ({ page }) => {
  test.setTimeout(120000);
  await start(page);

  const level0 = SAMPLE_PAYLOAD.levels[0];
  const wrongs0 = level0.options.filter(o => o !== level0.correctAnswer);
  for (let k = 0; k < wrongs0.length; k++) {
    await page.keyboard.press(String(level0.options.indexOf(wrongs0[k]) + 1));
    if (k === 0) {
      const focused = page.locator(':focus');
      await expect(focused).toHaveAttribute('data-testid', 'asteroid');
      await expect(focused).toHaveAttribute('data-state', 'live');
    }
  }
  await shoot(page, level0.correctAnswer);
  await page.getByRole('button', { name: 'Next question' }).click();

  const level1 = SAMPLE_PAYLOAD.levels[1];
  const wrongs1 = level1.options.filter(o => o !== level1.correctAnswer).slice(0, 2);
  for (const wrong of wrongs1) {
    await shoot(page, wrong);
  }
  await expect(page.getByRole('progressbar', { name: 'Shield' })).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByRole('heading', { name: 'Shields down!' })).toHaveCount(0);
  await expect(page.getByText(/shield is empty/)).toBeVisible();
  await expect(page.getByText('Question 2/8')).toBeVisible();

  await shoot(page, level1.correctAnswer);
  await expect(page.getByText('Direct hit! +100')).toBeVisible();
});
