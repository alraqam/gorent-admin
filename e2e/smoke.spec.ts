import { test, expect } from '@playwright/test';

// End-to-end smoke through the real UI + API: login → dashboard → products →
// user management (create). Requires the full stack running (see README).
test('login, dashboard, products, and user management', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  // 1) Login screen → log in (demo creds are prefilled).
  await page.goto('/');
  await expect(page.getByText('Tizimga kirish')).toBeVisible();
  await page.getByRole('button', { name: 'Kirish' }).click();

  // 2) Dashboard renders with live data.
  await expect(page.getByText('Jami daromad')).toBeVisible();

  // 3) Products table renders and URL updates.
  await page.getByRole('button', { name: 'Mahsulotlar' }).click();
  await expect(page.getByText('ta mahsulot').first()).toBeVisible();
  await expect(page).toHaveURL(/\/products/);

  // 4) Settings → Jamoa lists real users.
  await page.getByRole('button', { name: 'Sozlamalar' }).click();
  await page.getByRole('button', { name: 'Jamoa' }).click();
  await expect(page.getByText('operator@gorent.uz')).toBeVisible();

  // 5) Create a user — unique email so reruns don't collide.
  const email = `uitest+${Date.now()}@gorent.uz`;
  await page.getByRole('button', { name: "A'zo qo'shish" }).click();
  await page.getByPlaceholder('Ism').fill('UI Test User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Parol (kamida 6 belgi)').fill('secret123');
  await page.getByRole('button', { name: "Qo'shish", exact: true }).click();
  await expect(page.getByText(email)).toBeVisible();

  // 6) Audit log tab shows recorded actions.
  await page.getByRole('button', { name: 'Audit jurnali' }).click();
  await expect(page.getByText('Vaqt')).toBeVisible();
  await expect(page.getByText('operator@gorent.uz').first()).toBeVisible();

  expect(errors, 'no console/page errors').toEqual([]);
});
