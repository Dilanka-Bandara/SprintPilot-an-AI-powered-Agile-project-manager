import { test, expect } from '@playwright/test';
test('signed-out visitors are redirected to login and can still enter the demo', async ({
  page,
}) => {
  await page.goto('/workspaces');
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Welcome back.' }),
  ).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await page
    .getByRole('button', { name: 'New here? Create an account' })
    .click();
  await expect(page.getByLabel('Your name')).toBeVisible();
  await page.getByRole('link', { name: /Explore the local demo/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Sprint board.' }),
  ).toBeVisible();
});
