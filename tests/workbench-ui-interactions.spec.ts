import { expect, test } from '@playwright/test';

test.use({
  baseURL: 'http://127.0.0.1:4178',
  viewport: { width: 1440, height: 900 },
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('pickup-lab:ground-wiring:v1', 'shown'),
  );
});

test('top-layer Escape preserves pending wiring and label presentation preserves endpoint markers', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit circuit' }).click();
  await page
    .getByRole('button', {
      name: 'Master volume 2 WIPER terminal',
      exact: true,
    })
    .click();
  await expect(page.locator('.pending-terminal')).toHaveCount(1);
  await page.getByRole('button', { name: 'Open diagram', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.pending-terminal')).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Open diagram', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pending-terminal')).toHaveCount(0);
  await page.getByRole('button', { name: 'Finish editing' }).click();
  await expect(page.locator('.terminal-label')).toHaveCount(0);
  const wire = page.getByRole('button', { name: /^Wire / }).first();
  await wire.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.trace-terminal-ring')).toHaveCount(2);
  await expect(page.locator('.terminal-label')).toHaveCount(2);
  await page.getByRole('button', { name: 'More options' }).click();
  await page.getByRole('checkbox', { name: 'Show wiring labels' }).check();
  expect(await page.locator('.terminal-label').count()).toBeGreaterThan(2);
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.trace-terminal-ring')).toHaveCount(2);
  await page.getByLabel('Theme', { exact: true }).selectOption('dark');
  await expect(page.locator('.trace-terminal-ring')).toHaveCount(2);
});

test('pointer drag selects without moving focus to the inspector', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit circuit' }).click();
  const part = page.getByTestId('part-volume');
  const point = await part.evaluate((element) => {
    const point = new DOMPoint(90, 58).matrixTransform(
      (element as SVGGElement).getScreenCTM()!,
    );
    return { x: point.x, y: point.y };
  });
  const before = await part.getAttribute('transform');
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  expect(
    await page
      .getByRole('region', { name: 'Part controls' })
      .evaluate((element) => element.contains(document.activeElement)),
  ).toBe(false);
  await page.mouse.move(point.x + 40, point.y + 40, { steps: 8 });
  await page.mouse.up();
  await expect(part).not.toHaveAttribute('transform', before!);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(part).toHaveAttribute('transform', before!);
  await expect(page.getByRole('region', { name: 'Part controls' })).toHaveCount(
    0,
  );
});

test('Edit push-pull controls leave real pins reachable and do not move the part', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open diagram', exact: true }).click();
  await page
    .getByLabel('Library', { exact: true })
    .selectOption('split-humbuckers');
  await page.getByRole('button', { name: 'Load example' }).click();
  await page.getByRole('button', { name: 'Edit circuit' }).click();
  const part = page.getByTestId('part-volume');
  await part.locator('.part-body').focus();
  await page.keyboard.press('Enter');
  const position = await part.getAttribute('transform');
  expect(
    await page.locator('.terminal').evaluateAll((terminals) =>
      terminals.every((terminal) => {
        const circle = terminal.querySelector('circle')!;
        const point = new DOMPoint(
          circle.cx.baseVal.value,
          circle.cy.baseVal.value,
        ).matrixTransform(circle.getScreenCTM()!);
        return (
          document.elementFromPoint(point.x, point.y)?.closest('.terminal') ===
          terminal
        );
      }),
    ),
  ).toBe(true);
  const controls = page.getByRole('region', { name: 'Part controls' });
  await controls
    .getByRole('slider', { name: 'Split / master volume', exact: true })
    .fill('5');
  await controls.getByRole('button', { name: 'Pulled', exact: true }).click();
  await expect(page.getByTestId('output-level')).toHaveText('50%');
  await expect(page.locator('[data-coil][data-active="true"]')).toHaveCount(2);
  await expect(part).toHaveAttribute('transform', position!);
});
