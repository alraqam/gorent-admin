import { test, expect } from '@playwright/test';

// Plan 1.7: a dead session (expired token, or a password changed elsewhere)
// must land on the login screen with a reason — never a browser alert per
// failing request, which is what an expired token used to produce.
test('a session that dies mid-use returns to the login screen, with no alert', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });

  await page.goto('/');
  await page.locator('input[type="email"]').fill('operator@gorent.uz');
  await page.locator('input[type="password"]').fill('gorent123');
  await page.getByRole('button', { name: 'Kirish' }).click();
  await expect(page.getByText('Tizimga kirish')).toBeHidden();

  // The server stops accepting the token (same effect as expiry or a
  // password change), then the app makes several calls at once.
  await page.evaluate(() => localStorage.setItem('gorent_token', 'expired.token.value'));
  await page.evaluate(() => {
    const api = (window as any).gorentApi;
    for (const p of ['/bookings', '/companies', '/payments', '/debtors']) api.get(p).catch(() => {});
  });

  await expect(page.getByText('Tizimga kirish')).toBeVisible();
  await expect(page.getByText("Sessiya tugadi yoki parol o'zgartirildi")).toBeVisible();
  expect(dialogs).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('gorent_token'))).toBeNull();

  // And signing in again works, without the notice.
  await page.locator('input[type="email"]').fill('operator@gorent.uz');
  await page.locator('input[type="password"]').fill('gorent123');
  await page.getByRole('button', { name: 'Kirish' }).click();
  await expect(page.getByText('Tizimga kirish')).toBeHidden();
});

test('a wrong password is still an error on the login form, not a session end', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="email"]').fill('operator@gorent.uz');
  await page.locator('input[type="password"]').fill('definitely-wrong');
  await page.getByRole('button', { name: 'Kirish' }).click();
  await expect(page.getByText("Email yoki parol noto'g'ri")).toBeVisible();
  await expect(page.getByText('Sessiya tugadi')).toBeHidden();
});
