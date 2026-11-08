import { expect, test } from '@playwright/test';

test.use({
  baseURL: 'http://127.0.0.1:4178',
});

test('truth table dialog opens and shows switch positions', async ({ page }) => {
  await page.goto('/');

  // Truth table button should be visible in the toolbar
  await expect(
    page.getByRole('button', { name: 'Truth table', exact: true }),
  ).toBeVisible();

  // Open the dialog
  await page.getByRole('button', { name: 'Truth table', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Truth table', exact: true });
  await expect(dialog).toBeVisible();

  // The preset circuit has a 3-way blade switch → 3 positions
  await expect(dialog.getByRole('table')).toBeVisible();
  const rows = dialog.getByRole('row');
  // Header row + 3 data rows = 4 rows total
  await expect(rows).toHaveCount(4);

  // Column headers should be present
  await expect(dialog.getByRole('columnheader', { name: 'Position' })).toBeVisible();
  await expect(dialog.getByRole('columnheader', { name: 'Pickups' })).toBeVisible();
  await expect(dialog.getByRole('columnheader', { name: 'Volume' })).toBeVisible();
  await expect(dialog.getByRole('columnheader', { name: 'Tone' })).toBeVisible();
  await expect(dialog.getByRole('columnheader', { name: 'Output' })).toBeVisible();
  await expect(dialog.getByRole('columnheader', { name: 'Status' })).toBeVisible();

  // Close the dialog
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test('truth table shows position labels for blade switch', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Truth table', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Truth table', exact: true });
  await expect(dialog).toBeVisible();

  // 3-way blade shows Position 1, 2, 3
  await expect(
    dialog.getByRole('cell', { name: 'Position 1', exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('cell', { name: 'Position 2', exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('cell', { name: 'Position 3', exact: true }),
  ).toBeVisible();

  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
});

test('truth table dialog closes with Escape', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Truth table', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Truth table', exact: true });
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
