import { test, expect } from '@playwright/test';
test('create an issue, move it, reload, search and delete it', async ({
  page,
}) => {
  await page.goto('/board');
  await expect(
    page.getByRole('heading', { name: 'Sprint board.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Create issue', exact: true }).click();
  const title = `E2E story ${Date.now()}`;
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create issue', exact: true })
    .click();
  await page.getByRole('button', { name: title, exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Status', exact: true })
    .selectOption('DONE');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.reload();
  await expect(
    page
      .getByRole('region', { name: 'Done', exact: true })
      .getByRole('button', { name: title }),
  ).toBeVisible();
  await page.getByRole('link', { name: /^Backlog/ }).click();
  await page.getByLabel('Search issues').fill(title);
  await page.getByRole('button').filter({ hasText: title }).click();
  await page.getByRole('button', { name: 'Delete issue', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByText('No issues found')).toBeVisible();
});
test('mobile navigation, standup save, and honest AI placeholder work', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/board');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Standups', exact: true }).click();
  await page
    .getByLabel('What did you work on yesterday?')
    .fill('Tested the board');
  await page.getByLabel('What’s your focus today?').fill('Ship the foundation');
  await page
    .getByRole('button', { name: /Post standup|Update standup/ })
    .click();
  await expect(
    page.getByText('Your standup is saved. You’re all caught up!'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: /AI assistant/ }).click();
  await expect(page.getByText(/Gemini is not connected yet/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('board supports pointer dragging and fits mobile screens', async ({
  page,
}, testInfo) => {
  await page.goto('/board');
  await expect(
    page.getByRole('button', { name: 'Move SP-1', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('board-desktop.png'),
    fullPage: true,
  });
  const handle = await page
    .getByRole('button', { name: 'Move SP-1', exact: true })
    .boundingBox();
  const target = await page
    .getByRole('region', { name: 'In progress', exact: true })
    .boundingBox();
  if (!handle || !target) throw new Error('Drag target is missing');
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handle.x + 10, handle.y + 10, { steps: 3 });
  await page.mouse.move(target.x + target.width / 2, target.y + 100, {
    steps: 20,
  });
  await page.mouse.up();
  await expect(
    page
      .getByRole('region', { name: 'In progress', exact: true })
      .getByRole('button', { name: 'Move SP-1', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole('region', { name: 'In progress', exact: true })
      .getByRole('button', { name: 'Move SP-1', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: 'Build the workspace onboarding flow',
      exact: true,
    })
    .click();
  await page
    .getByRole('combobox', { name: 'Status', exact: true })
    .selectOption('TODO');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({
    path: testInfo.outputPath('board-mobile.png'),
    animations: 'disabled',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
