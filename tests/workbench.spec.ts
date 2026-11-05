import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import {
  board,
  createPart,
  limits,
  partScale,
  presetCircuit,
  terminals,
} from '../src/circuit/model';
import { legacyStorageKey, storageKey } from '../src/storage';
import {
  humbuckerCircuit,
  legacyCircuit,
  legacyV1,
} from '../src/circuit/testFixtures';
import { migrateCircuit } from '../src/circuit/portable';
import { splitHumbuckerCircuit, varitoneCircuit } from '../src/circuit/library';
import { isCircuit } from '../src/circuit/validation';

async function loadExample(page: Page, id: string) {
  await page.getByLabel('Library', { exact: true }).selectOption(id);
  await page.getByRole('button', { name: 'Load example', exact: true }).click();
}

async function extensionScreenshot(page: Page, name: string) {
  await mkdir('artifacts/component-extensions', { recursive: true });
  await page.screenshot({
    path: `artifacts/component-extensions/${name}.png`,
    fullPage: true,
  });
}

test('extended palette adds distinct pickup skins with unchanged electrical families', async ({
  page,
}) => {
  await page.goto('/');
  await extensionScreenshot(page, 'default');
  await page.getByRole('button', { name: 'Blank build' }).click();
  for (const [label, skin, leads, coils] of [
    ['P90', 'p90', 2, 1],
    ['DynaSonic', 'dynasonic', 2, 1],
    ["Filter'Tron", 'filtertron', 5, 2],
    ['Mini-humbucker', 'mini-humbucker', 5, 2],
  ] as const) {
    await page
      .getByRole('button', { name: `＋ ${label}`, exact: true })
      .click();
    const part = page
      .locator('[data-testid^="part-"]')
      .filter({ has: page.locator(`[data-pickup-skin="${skin}"]`) });
    await expect(part.locator('.terminal')).toHaveCount(leads);
    await expect(part.locator('[data-coil]')).toHaveCount(coils);
    const body = page.getByRole('button', {
      name: `Select ${label}`,
      exact: true,
    });
    const previous = await part.getAttribute('transform');
    await body.focus();
    await page.keyboard.press('ArrowDown');
    await expect(part).not.toHaveAttribute('transform', previous!);
    await page
      .getByLabel('Part label', { exact: true })
      .fill(`${label} custom`);
  }
  await expect(
    page.getByRole('button', { name: '＋ Single coil', exact: true }),
  ).toBeVisible();
  await extensionScreenshot(page, 'skins');
  await page.reload();
  await expect(page.locator('[data-pickup-skin]')).toHaveCount(4);
  await expect(
    page.getByRole('button', { name: 'Select P90 custom', exact: true }),
  ).toBeVisible();
});

for (const [family, skin] of [
  ['pickup', 'p90'],
  ['humbucker', 'filtertron'],
] as const)
  test(`resetting ${family} appearance removes skin, stays live, saves, exports and undoes`, async ({
    page,
  }) => {
    await page.goto('/');
    if (family === 'humbucker') await loadExample(page, 'split-humbuckers');
    await page.getByRole('button', { name: '✎ Edit' }).click();
    const part = page.getByTestId('part-neck');
    await part.locator('.part-body').focus();
    await page.keyboard.press('Enter');
    const appearance = page.getByRole('combobox', {
      name: 'Pickup appearance',
      exact: true,
    });
    await appearance.selectOption(skin);
    await expect(part.locator(`[data-pickup-skin="${skin}"]`)).toHaveCount(1);
    const styled = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      storageKey,
    );
    await appearance.selectOption('');
    await expect(part.locator('[data-pickup-skin]')).toHaveCount(0);
    await expect(page.getByTestId('output-level')).toHaveText('100%');
    await expect(page.locator('.live-badge')).toHaveText('● LIVE');
    await expect(page.locator('.save-status')).toHaveText(
      'Saved on this browser',
    );
    const cleared = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      storageKey,
    );
    expect(isCircuit(cleared)).toBe(true);
    expect(
      Object.hasOwn(
        cleared.parts.find((part: { id: string }) => part.id === 'neck'),
        'skin',
      ),
    ).toBe(false);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(part.locator(`[data-pickup-skin="${skin}"]`)).toHaveCount(1);
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        storageKey,
      ),
    ).toEqual(styled);
    await part.locator('.part-body').focus();
    await page.keyboard.press('Enter');
    await appearance.selectOption('');
    await page.getByText('Diagram & attribution').click();
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export JSON' }).click();
    const download = await downloadEvent;
    const exported = JSON.parse(
      await readFile((await download.path())!, 'utf8'),
    );
    expect(isCircuit(exported)).toBe(true);
    expect(exported).toEqual(cleared);
    expect(
      Object.hasOwn(
        exported.parts.find((part: { id: string }) => part.id === 'neck'),
        'skin',
      ),
    ).toBe(false);
    await page.reload();
    await expect(part.locator('[data-pickup-skin]')).toHaveCount(0);
    await expect(page.getByTestId('output-level')).toHaveText('100%');
    await expect(page.locator('.save-status')).toHaveText(
      'Restored your saved circuit from this browser',
    );
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        storageKey,
      ),
    ).toEqual(cleared);
  });

test('library push-pull splits actual coils independently of volume and round trips credit', async ({
  page,
}) => {
  await page.goto('/');
  await loadExample(page, 'split-humbuckers');
  await expect(page.locator('[data-coil][data-active="true"]')).toHaveCount(4);
  await expect(
    page.getByTestId('part-volume').locator('.terminal'),
  ).toHaveCount(10);
  await expect(
    page.getByRole('button', { name: 'Pushed', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await extensionScreenshot(page, 'split-pushed');
  await page
    .getByRole('slider', { name: 'Split / master volume', exact: true })
    .fill('6');
  await page.getByRole('button', { name: 'Pulled', exact: true }).click();
  await expect(page.getByTestId('output-level')).toHaveText('60%');
  await expect(page.locator('[data-coil="a"][data-active="true"]')).toHaveCount(
    2,
  );
  await expect(page.locator('[data-coil="b"][data-active="true"]')).toHaveCount(
    0,
  );
  await expect(page.getByTestId('pot-cap-volume')).toHaveAttribute(
    'transform',
    'translate(0 -14)',
  );
  await extensionScreenshot(page, 'split-pulled');
  await page.getByRole('button', { name: 'Pushed', exact: true }).click();
  await expect(page.locator('[data-coil][data-active="true"]')).toHaveCount(4);
  await expect(page.getByTestId('output-level')).toHaveText('60%');
  await page.getByRole('button', { name: 'Pulled', exact: true }).click();
  await page.getByText('Diagram & attribution').click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadEvent;
  const json = await readFile((await download.path())!, 'utf8');
  const exported = JSON.parse(json);
  expect(exported.metadata).toEqual(splitHumbuckerCircuit().metadata);
  expect(
    exported.parts.find((part: { id: string }) => part.id === 'volume'),
  ).toMatchObject({ isPulled: true, value: 6 });
  await page.getByRole('button', { name: 'Preset', exact: false }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'split.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });
  await expect(
    page.getByRole('button', { name: 'Pulled', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('output-level')).toHaveText('60%');
  await expect(page.locator('.attribution a')).toHaveAttribute(
    'href',
    exported.metadata.sourceUrl,
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByTestId('circuit-title')).toHaveText(
    presetCircuit().metadata.title,
  );
});

test('4-way library switches neck parallel bridge series while cover lead stays static', async ({
  page,
}) => {
  await page.goto('/');
  await loadExample(page, 'tele-four-way');
  await expect(
    page.getByTestId('part-selector').locator('.terminal'),
  ).toHaveCount(10);
  await expect(page.getByTestId('part-neck').locator('.terminal')).toHaveCount(
    3,
  );
  const angles = new Set<string | null>();
  for (const [position, active, topology] of [
    [1, 1, 'single'],
    [2, 2, 'parallel'],
    [3, 1, 'single'],
    [4, 2, 'series'],
  ] as const) {
    await page
      .getByRole('button', { name: `Position ${position}`, exact: true })
      .click();
    await expect(page.locator('[data-coil][data-active="true"]')).toHaveCount(
      active,
    );
    await expect(page.getByTestId('coil-topology')).toHaveText(
      {
        single: 'Single pickup',
        parallel: 'Parallel pickups',
        series: 'Series pickups',
      }[topology],
    );
    await expect(page.getByTestId('output-level')).toHaveText('100%');
    await expect(page.locator('[data-from="neck:shield"]')).toHaveAttribute(
      'data-ground-level',
      '0',
    );
    angles.add(
      await page.getByTestId('blade-lever-selector').getAttribute('transform'),
    );
  }
  expect(angles.size).toBe(4);
  await extensionScreenshot(page, 'four-way-series');
  const shield = page.locator('[data-from="neck:shield"]');
  await shield.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.trace-status')).toContainText('SHIELD');
  await expect(page.locator('.trace-terminal-ring')).toHaveCount(2);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByTestId('coil-topology')).toHaveText('Single pickup');
});

test('Varitone shows six ideal notch bands separately from volume and tone', async ({
  page,
}) => {
  await page.goto('/');
  await loadExample(page, 'varitone-tele');
  const select = page.getByRole('combobox', { name: 'Varitone position' });
  await expect(select.locator('option')).toHaveCount(6);
  await expect(page.getByTestId('varitone-state')).toHaveText('Bypass');
  await expect(page.locator('.varitone-flow')).toHaveCount(0);
  await extensionScreenshot(page, 'varitone-bypass');
  const positions = new Set<string | null>();
  for (const [value, frequency] of [
    [2, 4109],
    [3, 2373],
    [4, 1299],
    [5, 750],
    [6, 277],
  ]) {
    await select.selectOption(String(value));
    await expect(page.getByTestId('varitone-frequency')).toHaveText(
      `${frequency} Hz`,
    );
    await expect(page.getByTestId('varitone-state')).toHaveText(
      'Filter connected',
    );
    await expect(page.getByTestId('output-level')).toHaveText('100%');
    await expect(page.getByTestId('treble-level')).toHaveText('100%');
    await expect(
      page.locator('[data-wire-id="varitone-ground"]'),
    ).toHaveAttribute('data-varitone-level', '1');
    positions.add(
      await page
        .getByTestId('notch-band')
        .locator('span')
        .getAttribute('style'),
    );
  }
  expect(positions.size).toBe(5);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.varitone-flow').first()).toHaveCSS(
    'animation-name',
    'none',
  );
  await extensionScreenshot(page, 'varitone-filter');
  await page.getByRole('button', { name: '✎ Edit' }).click();
  const wire = page.locator('[data-wire-id="varitone-ground"]');
  await wire.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Remove selected wire' }).click();
  await expect(page.getByTestId('varitone-state')).toHaveText('Disconnected');
  await expect(page.locator('.varitone-flow')).toHaveCount(0);
  await expect(page.getByTestId('output-level')).toHaveText('100%');
});

test('extended authoring flag hides new options but reads saved extended circuits', async ({
  page,
}) => {
  const circuit = splitHumbuckerCircuit();
  circuit.parts.find((part) => part.id === 'volume')!.isPulled = true;
  await page.addInitScript(
    ({ circuit, storageKey }) =>
      localStorage.setItem(storageKey, JSON.stringify(circuit)),
    { circuit, storageKey },
  );
  await page.goto('http://127.0.0.1:4177');
  await expect(page.getByLabel('Library', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Pulled', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-coil][data-active="true"]')).toHaveCount(2);
  await page.getByRole('button', { name: '✎ Edit' }).click();
  for (const name of [
    'P90',
    'DynaSonic',
    "Filter'Tron",
    'Mini-humbucker',
    'Push-pull volume',
    'Push-pull tone',
    '4-way blade',
    'Varitone',
  ])
    await expect(
      page.getByRole('button', { name: `＋ ${name}`, exact: true }),
    ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '＋ Single coil', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Select Neck humbucker', exact: true })
    .click();
  await expect(page.getByLabel('Pickup appearance')).toHaveCount(0);
  await page.getByText('Diagram & attribution').click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'varitone.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(varitoneCircuit())),
  });
  await expect(page.getByTestId('varitone-state')).toHaveText('Bypass');
  await expect(
    page.getByTestId('part-varitone').locator('.terminal'),
  ).toHaveCount(2);
});

test('push-pull tone has ten accessible lugs and independent knob and switch', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Blank build' }).click();
  await page
    .getByRole('button', { name: '＋ Push-pull tone', exact: true })
    .click();
  const part = page.locator('[data-testid^="part-"]');
  await expect(part.locator('.terminal')).toHaveCount(10);
  await expect(part.locator('[data-terminal-id*="switch-"]')).toHaveCount(6);
  for (const terminal of await part.locator('.terminal').all()) {
    const circle = terminal.locator('circle').first();
    const accessible = await circle.evaluate((element) => {
      const circle = element as SVGCircleElement;
      const center = new DOMPoint(
        circle.cx.baseVal.value,
        circle.cy.baseVal.value,
      ).matrixTransform(circle.getScreenCTM()!);
      return (
        document.elementFromPoint(center.x, center.y)?.closest('.terminal') ===
        circle.closest('.terminal')
      );
    });
    expect(accessible).toBe(true);
    await terminal.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Connecting from')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await page
    .getByRole('button', { name: 'Select Push-pull tone', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await page
    .getByRole('slider', { name: 'Push-pull tone', exact: true })
    .fill('3');
  await page.getByRole('button', { name: 'Pulled', exact: true }).click();
  await expect(
    page.getByRole('slider', { name: 'Push-pull tone', exact: true }),
  ).toHaveValue('3');
  await expect(part.locator('[data-contact$="switch-a2"]')).toHaveCount(1);
  await extensionScreenshot(page, 'push-pull-tone');
});

test('extended dense mobile board retains trace and keyboard movement', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await loadExample(page, 'split-humbuckers');
  await page.getByRole('button', { name: '✎ Edit' }).click();
  await page.getByRole('button', { name: '＋ Varitone', exact: true }).click();
  await page
    .getByRole('button', { name: '＋ 4-way blade', exact: true })
    .click();
  const wire = page.locator('[data-to="volume:switch-a-common"]');
  await wire.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.trace-terminal-ring')).toHaveCount(2);
  await page.keyboard.press('Escape');
  const body = page.getByRole('button', {
    name: 'Select 4-way blade',
    exact: true,
  });
  await body.focus();
  await page.keyboard.press('ArrowLeft');
  await extensionScreenshot(page, 'dense-mobile');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test('new control bodies drag and clamp with reachable terminals at compact scale', async ({
  page,
}) => {
  await page.goto('/');
  for (const label of [
    'Push-pull volume',
    'Push-pull tone',
    '4-way blade',
    'Varitone',
  ]) {
    await page.getByRole('button', { name: 'Blank build' }).click();
    await page
      .getByRole('button', { name: `＋ ${label}`, exact: true })
      .click();
    const part = page.locator('[data-testid^="part-"]');
    const initial = await part.getAttribute('transform');
    expect(initial).toContain('scale(0.62)');
    const start = await part.evaluate((element) => {
      const point = new DOMPoint(90, 58).matrixTransform(
        (element as SVGGElement).getScreenCTM()!,
      );
      return { x: point.x, y: point.y };
    });
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 150, start.y + 120, { steps: 5 });
    await page.mouse.up();
    await expect(part).not.toHaveAttribute('transform', initial!);
    const body = page.getByRole('button', {
      name: `Select ${label}`,
      exact: true,
    });
    await body.focus();
    const moved = await part.getAttribute('transform');
    await page.keyboard.press('ArrowRight');
    await expect(part).not.toHaveAttribute('transform', moved!);
    const points = await part.evaluate((element) => {
      const group = element as SVGGElement;
      const matrix = group.getScreenCTM()!;
      const svg = group.ownerSVGElement!;
      const from = new DOMPoint(90, 58).matrixTransform(matrix);
      const to = new DOMPoint(1070, 670).matrixTransform(svg.getScreenCTM()!);
      return { from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y } };
    });
    await page.mouse.move(points.from.x, points.from.y);
    await page.mouse.down();
    await page.mouse.move(points.to.x, points.to.y, { steps: 5 });
    await page.mouse.up();
    const bounds = await part.evaluate((element) => {
      const group = element as SVGGElement;
      const box = group.getBBox();
      const transform = group.transform.baseVal.consolidate()!.matrix;
      const topLeft = new DOMPoint(box.x, box.y).matrixTransform(transform);
      const bottomRight = new DOMPoint(
        box.x + box.width,
        box.y + box.height,
      ).matrixTransform(transform);
      return {
        left: topLeft.x,
        top: topLeft.y,
        right: bottomRight.x,
        bottom: bottomRight.y,
      };
    });
    expect(bounds.left).toBeGreaterThan(0);
    expect(bounds.top).toBeGreaterThan(0);
    expect(bounds.right).toBeLessThan(board.width);
    expect(bounds.bottom).toBeLessThan(board.height);
    for (const terminal of await part.locator('.terminal').all()) {
      await terminal.scrollIntoViewIfNeeded();
      const point = await terminal
        .locator('circle')
        .first()
        .evaluate((element) => {
          const circle = element as SVGCircleElement;
          const center = new DOMPoint(
            circle.cx.baseVal.value,
            circle.cy.baseVal.value,
          ).matrixTransform(circle.getScreenCTM()!);
          return { x: center.x, y: center.y };
        });
      await page.mouse.click(point.x, point.y);
      await expect(page.getByText('Connecting from')).toBeVisible();
      await page.keyboard.press('Escape');
    }
  }
});

test('Play traces only one wire and its exact endpoints without saving or enabling deletion', async ({
  page,
}) => {
  await page.goto('/');
  const saved = await page.evaluate(
    (key) => localStorage.getItem(key),
    storageKey,
  );
  const wire = page.getByRole('button', {
    name: 'Wire Neck pickup · HOT ↔ 3-way blade · A1',
    exact: true,
  });
  const point = await wire.locator('.wire-hit').evaluate((element) => {
    const path = element as SVGPathElement;
    for (
      let distance = 25;
      distance < path.getTotalLength() - 25;
      distance += 10
    ) {
      const point = path
        .getPointAtLength(distance)
        .matrixTransform(path.getScreenCTM()!);
      if (document.elementFromPoint(point.x, point.y) === path)
        return { x: point.x, y: point.y };
    }
    throw new Error('Wire hit path is covered');
  });
  await page.mouse.move(point.x, point.y);
  await expect(wire).toHaveClass(/selected-wire/);
  await expect(page.locator('.selected-wire')).toHaveCount(1);
  await expect(page.locator('.dimmed-wire')).toHaveCount(15);
  await expect(page.locator('.dimmed-wire').first()).toHaveCSS(
    'opacity',
    '0.2',
  );
  await expect(page.locator('.trace-terminal-ring')).toHaveCount(2);
  for (const id of ['neck:hot', 'selector:a1'])
    await expect(
      page.locator(`[data-terminal-id="${id}"] .trace-terminal-ring`),
    ).toHaveCount(1);
  await expect(page.locator('.trace-status')).toHaveText(
    'Neck pickup · HOT ↔ 3-way blade · A1',
  );
  await page.getByRole('button', { name: 'Position 2', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(
    page.locator('.selected-wire, .trace-terminal-ring'),
  ).toHaveCount(0);
  await page.mouse.move(5, 5);
  await expect(
    page.locator('.selected-wire, .trace-terminal-ring, .dimmed-wire'),
  ).toHaveCount(0);
  await page.mouse.click(point.x, point.y);
  await page.mouse.move(5, 5);
  await expect(wire).toHaveAttribute('aria-pressed', 'true');
  await expect(wire).toHaveClass(/selected-wire/);
  await expect(
    page.getByRole('button', { name: 'Remove selected wire' }),
  ).toHaveCount(0);
  await page.keyboard.press('Delete');
  await expect(page.locator('.wire')).toHaveCount(16);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe(saved);
  await page.keyboard.press('Escape');
  await expect(
    page.locator('.selected-wire, .trace-terminal-ring'),
  ).toHaveCount(0);
  await page.keyboard.press('Tab');
  await wire.focus();
  await expect(page.locator('.trace-terminal-ring')).toHaveCount(2);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(wire).toHaveAttribute('aria-pressed', 'true');
  await page
    .locator('.circuit-board > rect')
    .click({ position: { x: 15, y: 220 } });
  await expect(
    page.locator('.selected-wire, .trace-terminal-ring'),
  ).toHaveCount(0);
  await wire.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '✎ Edit' }).click();
  await expect(
    page.locator('.selected-wire, .trace-terminal-ring'),
  ).toHaveCount(0);
  await wire.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Remove selected wire' }).click();
  await expect(wire).toHaveCount(0);
  await expect(page.locator('.trace-terminal-ring')).toHaveCount(0);
});

test('part selection never dims wires and circuit changes clear a pinned trace', async ({
  page,
}) => {
  await page.goto('/');
  const body = page.getByRole('button', {
    name: 'Select Neck pickup',
    exact: true,
  });
  await body.click();
  await expect(page.locator('.dimmed-wire')).toHaveCount(0);
  const wire = page.locator('[data-wire-id="wire-12"]');
  await wire.focus();
  await page.keyboard.press('Enter');
  await body.focus();
  await expect(wire).toHaveClass(/selected-wire/);
  await page.getByRole('button', { name: 'Position 1', exact: true }).click();
  await expect(
    page.locator('.selected-wire, .trace-terminal-ring, .dimmed-wire'),
  ).toHaveCount(0);
});

test('controls expose live selector, volume and independent tone; restore on reload', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('output-level')).toHaveText('100%');
  await page.getByRole('button', { name: 'Position 1', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Position 1', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('part-bridge')).toContainText('INACTIVE');
  await page.getByRole('slider', { name: 'Master volume' }).fill('5');
  await expect(page.getByTestId('output-level')).toHaveText('50%');
  await page.getByRole('slider', { name: 'Master tone' }).fill('0');
  await expect(page.getByTestId('treble-level')).toHaveText('25%');
  await expect(page.getByTestId('output-level')).toHaveText('50%');
  await page.reload();
  await expect(page.getByRole('slider', { name: 'Master volume' })).toHaveValue(
    '5',
  );
  await expect(
    page.getByRole('button', { name: 'Position 1', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('slider', { name: 'Master volume' }).focus();
  await page.keyboard.press('Home');
  await expect(page.getByTestId('output-level')).toHaveText('0%');
});

test('blank build supports adding, wiring, moving, deleting and undo', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Blank build' }).click();
  await expect(page.getByText('Your next circuit starts here.')).toBeVisible();
  await page
    .getByRole('button', { name: '＋ Single coil', exact: true })
    .click();
  await page
    .getByRole('button', { name: '＋ Output jack', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Single coil HOT terminal', exact: true })
    .click();
  await expect(page.getByText('Connecting from')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Connecting from')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Single coil HOT terminal', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Output jack TIP terminal', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Single coil RETURN terminal', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Output jack SLEEVE terminal', exact: true })
    .click();
  await expect(page.getByTestId('output-level')).toHaveText('100%');
  const pickup = page.getByRole('button', {
    name: 'Select Single coil',
    exact: true,
  });
  const initialPosition = await pickup.boundingBox();
  if (!initialPosition) throw new Error('Pickup missing');
  await page.mouse.move(initialPosition.x + 70, initialPosition.y + 55);
  await page.mouse.down();
  await page.mouse.move(initialPosition.x + 140, initialPosition.y + 100, {
    steps: 6,
  });
  await page.mouse.up();
  const moved = await pickup.boundingBox();
  expect(moved!.x).toBeGreaterThan(initialPosition.x + 60);
  await pickup.focus();
  await page.keyboard.press('ArrowRight');
  expect((await pickup.boundingBox())!.x).toBeGreaterThan(moved!.x);
  await page.getByRole('button', { name: 'Remove selected part' }).click();
  await expect(page.getByRole('button', { name: /^Wire / })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Wire / })).toHaveCount(2);
  await page
    .getByRole('button', { name: /^Wire / })
    .first()
    .focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Remove selected wire' }).click();
  await expect(page.getByRole('button', { name: /^Wire / })).toHaveCount(1);
  await expect(page.getByTestId('output-level')).toHaveText('0%');
  await page.getByRole('button', { name: '◉ Play' }).click();
  await expect(
    page.getByRole('button', { name: 'Select Single coil', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '↺ Preset' }).click();
  await expect(page.getByTestId('part-neck')).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Select Single coil', exact: true }),
  ).toBeVisible();
});

test('editor and playground flags gate actual UI', async ({ page }) => {
  await page.goto('http://127.0.0.1:4174');
  await expect(page.getByRole('button', { name: '✎ Edit' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Blank build' })).toHaveCount(
    0,
  );
  await expect(page.getByTestId('output-level')).toHaveText('100%');
  await page.getByText('Diagram & attribution').click();
  await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import JSON' })).toHaveCount(
    0,
  );
  await expect(page.getByLabel('Diagram title')).toHaveCount(0);
  await page.goto('http://127.0.0.1:4176');
  await expect(page.getByText('Diagram & attribution')).toHaveCount(0);
  await expect(page.getByTestId('output-level')).toHaveText('100%');
  await page.goto('http://127.0.0.1:4175');
  await expect(
    page.getByText('The playground is disabled in this build.'),
  ).toBeVisible();
  await expect(page.getByRole('slider')).toHaveCount(0);
  await expect(page.locator('svg')).toHaveCount(0);
});

test('humbucker coils, blade contacts and potentiometer terminals match the circuit', async ({
  page,
}) => {
  await page.goto('/');
  const fixture = humbuckerCircuit();
  await page.getByText('Diagram & attribution').click();
  await page.getByLabel('Import diagram JSON').setInputFiles({
    name: 'previous-humbuckers.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await expect(page.getByTestId('circuit-title')).toHaveText(
    fixture.metadata.title,
  );
  await expect(page.getByTestId('part-ground')).toHaveCount(0);
  await expect(page.getByTestId('part-volume')).toContainText('500 kΩ');
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      storageKey,
    ),
  ).toEqual(fixture);
  await page.reload();
  await expect(page.getByTestId('circuit-title')).toHaveText(
    fixture.metadata.title,
  );
  for (const id of ['neck', 'bridge']) {
    await expect(
      page.getByTestId(`part-${id}`).locator('[data-coil][data-active="true"]'),
    ).toHaveCount(2);
    await expect(
      page.getByTestId(`part-${id}`).locator('[data-coil] circle'),
    ).toHaveCount(12);
    await expect(
      page.getByTestId(`part-${id}`).locator('.terminal'),
    ).toHaveCount(5);
  }
  const blade = page.getByTestId('part-selector');
  await expect(blade.locator('.terminal')).toHaveCount(8);
  await expect(blade.locator('[data-contact]')).toHaveCount(2);
  for (const [position, contact, active, inactive] of [
    ['Position 1', '1', 'neck', 'bridge'],
    ['Position 3', '3', 'bridge', 'neck'],
  ]) {
    await page.getByRole('button', { name: position, exact: true }).click();
    await expect(
      blade.locator(`[data-contact="selector:a-common selector:a${contact}"]`),
    ).toHaveCount(1);
    await expect(
      blade.locator(`[data-contact="selector:b-common selector:b${contact}"]`),
    ).toHaveCount(1);
    await expect(
      page.getByTestId(`part-${active}`).locator('[data-active="true"]'),
    ).toHaveCount(2);
    await expect(
      page.getByTestId(`part-${inactive}`).locator('[data-active="true"]'),
    ).toHaveCount(0);
  }
  await page.getByRole('button', { name: '✎ Edit' }).click();
  for (const id of ['volume', 'tone']) {
    const pot = page.getByTestId(`part-${id}`);
    await expect(pot.locator('.terminal')).toHaveCount(4);
    await expect(
      pot.getByRole('button', { name: /2 WIPER terminal/ }),
    ).toHaveCount(1);
    await expect(
      pot.getByRole('button', { name: /CASE terminal/ }),
    ).toHaveCount(1);
  }
});

test('treble diversion follows the capacitor branch, vanishes when broken and honors reduced motion', async ({
  page,
}) => {
  await page.goto('/');
  const halo = page.getByTestId('capacitor-halo-capacitor');
  const bright = Number(await halo.getAttribute('data-level'));
  await page.getByRole('slider', { name: 'Master tone' }).fill('0');
  expect(Number(await halo.getAttribute('data-level'))).toBeGreaterThan(bright);
  await expect(page.getByTestId('tone-diversion')).toHaveText('100%');
  await expect(page.getByTestId('output-level')).toHaveText('100%');
  const capGround = page.locator(
    '[data-from="capacitor:b"][data-to="ground:common"]',
  );
  await expect(capGround).toHaveAttribute('data-tone-level', '1');
  await expect(capGround.locator('.tone-flow')).toHaveCount(1);
  const otherGround = page.locator(
    '[data-from="volume:ground"][data-to="ground:common"]',
  );
  await expect(otherGround).toHaveAttribute('data-tone-level', '0');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(capGround.locator('.tone-flow')).toHaveCSS(
    'animation-name',
    'none',
  );
  await page.getByRole('button', { name: '✎ Edit' }).click();
  await capGround.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Remove selected wire' }).click();
  await expect(halo).toHaveAttribute('data-level', '0');
  await expect(page.locator('.tone-flow')).toHaveCount(0);
});

test('blade rotates around one pivot with eight fixed, reachable lugs and matching contacts', async ({
  page,
}) => {
  await page.goto('/');
  const blade = page.getByTestId('part-selector');
  const lever = page.getByTestId('blade-lever-selector');
  const lugCoordinates = () =>
    blade.locator('.terminal > circle:first-child').evaluateAll((circles) =>
      circles.map((element) => {
        const circle = element as SVGCircleElement;
        return [circle.cx.baseVal.value, circle.cy.baseVal.value];
      }),
    );
  const expectedLugs = [0, 180].flatMap((x) =>
    [20, 60, 100, 140].map((y) => [x, y]),
  );
  await mkdir('artifacts', { recursive: true });
  let fixedPivot: { x: number; y: number } | undefined;
  for (const [position, angle] of [
    [1, -32],
    [2, 0],
    [3, 32],
  ]) {
    await page
      .getByRole('button', { name: `Position ${position}`, exact: true })
      .click();
    await expect(lever).toHaveAttribute('transform', `rotate(${angle} 90 55)`);
    const pivot = await lever.evaluate((element) => {
      const point = new DOMPoint(90, 55).matrixTransform(
        (element as SVGGraphicsElement).getScreenCTM()!,
      );
      return { x: point.x, y: point.y };
    });
    fixedPivot ??= pivot;
    expect(pivot.x).toBeCloseTo(fixedPivot.x, 6);
    expect(pivot.y).toBeCloseTo(fixedPivot.y, 6);
    expect(await lugCoordinates()).toEqual(expectedLugs);
    await expect(blade.locator('[data-contact]')).toHaveCount(2);
    for (const pole of ['a', 'b']) {
      await expect(
        blade.locator(
          `[data-contact="selector:${pole}-common selector:${pole}${position}"]`,
        ),
      ).toHaveCount(1);
    }
    const title = (await blade.locator('.part-title').boundingBox())!;
    const tip = (await lever.boundingBox())!;
    const surface = (await page.locator('.circuit-board').boundingBox())!;
    expect(tip.y).toBeGreaterThan(title.y + title.height);
    const commonBridge = (await page
      .locator('[data-wire-id="wire-12"] .wire-hit')
      .boundingBox())!;
    expect(commonBridge.y).toBeGreaterThan(title.y + title.height + 6);
    expect(tip.y).toBeGreaterThan(commonBridge.y + 8);
    for (const common of ['a-common', 'b-common']) {
      const label = (await blade
        .locator(`[data-terminal-id="selector:${common}"] text`)
        .boundingBox())!;
      expect(label.y).toBeGreaterThan(commonBridge.y + 8);
    }
    expect(tip.x).toBeGreaterThan(surface.x);
    expect(tip.x + tip.width).toBeLessThan(surface.x + surface.width);
    const bladeBounds = (await blade.boundingBox())!;
    await page.screenshot({
      path: `artifacts/blade-position-${position}.png`,
      clip: {
        x: bladeBounds.x - 65,
        y: bladeBounds.y - 15,
        width: bladeBounds.width + 170,
        height: bladeBounds.height + 110,
      },
    });
  }
  await page.getByRole('button', { name: '✎ Edit' }).click();
  const reachable = await blade.locator('.terminal').evaluateAll((lugs) =>
    lugs.map((lug) => {
      const circle = lug.querySelector('circle')!;
      const center = new DOMPoint(
        circle.cx.baseVal.value,
        circle.cy.baseVal.value,
      ).matrixTransform(circle.getScreenCTM()!);
      return (
        document.elementFromPoint(center.x, center.y)?.closest('.terminal') ===
        lug
      );
    }),
  );
  expect(reachable).toEqual(Array(8).fill(true));
  const original = await blade.getAttribute('transform');
  await blade
    .getByRole('button', { name: 'Select 3-way blade', exact: true })
    .focus();
  await page.keyboard.press('ArrowRight');
  await expect(blade).not.toHaveAttribute('transform', original!);
  expect(await lugCoordinates()).toEqual(expectedLugs);
  const alignment = await page.evaluate(() => {
    const lug = document.querySelector(
      '[aria-label="3-way blade A1 terminal"] circle',
    ) as SVGCircleElement;
    const wire = document.querySelector(
      '[data-from="neck:hot"][data-to="selector:a1"] .wire-hit',
    ) as SVGPathElement;
    const center = new DOMPoint(
      lug.cx.baseVal.value,
      lug.cy.baseVal.value,
    ).matrixTransform(lug.getScreenCTM()!);
    const end = wire
      .getPointAtLength(wire.getTotalLength())
      .matrixTransform(wire.getScreenCTM()!);
    return Math.hypot(center.x - end.x, center.y - end.y);
  });
  expect(alignment).toBeLessThan(0.01);
  await expect(page.getByTestId('output-level')).toHaveText('100%');
});

test('an unwired blade describes only its settled contacts, not pickup contributions', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Blank build' }).click();
  await page
    .getByRole('button', { name: '＋ 3-way blade', exact: true })
    .click();
  for (const position of [2, 1, 3]) {
    await page
      .getByRole('button', { name: `Position ${position}`, exact: true })
      .click();
    await expect(
      page.getByText(
        `Contacts AC–A${position} and BC–B${position} connected.`,
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.locator('.part-state')).toHaveText(
      `POSITION ${position}`,
    );
    await expect(page.locator('.pickup-summary strong')).toHaveText('None');
  }
  await expect(page.getByText('Both pickups, wired in parallel.')).toHaveCount(
    0,
  );
});

test('side-bank hit targets stay separate and every adjacent lug receives real pointer clicks', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '✎ Edit' }).click();
  const blade = page.getByTestId('part-selector');
  const hits = await blade
    .locator('.terminal > circle:first-child')
    .evaluateAll((circles) =>
      circles.map((element) => {
        const circle = element as SVGCircleElement;
        const center = new DOMPoint(
          circle.cx.baseVal.value,
          circle.cy.baseVal.value,
        ).matrixTransform(circle.getScreenCTM()!);
        const radius = circle.r.baseVal.value * circle.getScreenCTM()!.a;
        return { x: center.x, y: center.y, radius };
      }),
    );
  for (const [index, hit] of hits.entries()) {
    for (const other of hits.slice(index + 1))
      expect(Math.hypot(hit.x - other.x, hit.y - other.y)).toBeGreaterThan(
        hit.radius + other.radius,
      );
    const terminal = terminals.blade[index]!;
    // Click near the shared boundary as well as the center, not just keyboard focus.
    for (const offset of [0, -0.8, 0.8]) {
      await page.mouse.move(hit.x, hit.y + offset * hit.radius);
      expect(
        await page.evaluate(
          ({ x, y }) =>
            document
              .elementFromPoint(x, y)
              ?.closest('.terminal')
              ?.getAttribute('data-terminal-id'),
          { x: hit.x, y: hit.y + offset * hit.radius },
        ),
      ).toBe(`selector:${terminal.name}`);
      await page.mouse.click(hit.x, hit.y + offset * hit.radius);
      await expect(
        blade.locator(`[data-terminal-id="selector:${terminal.name}"]`),
      ).toHaveClass(/pending-terminal/);
      await page.keyboard.press('Escape');
    }
  }
  await expect(blade.locator('.wiper-label')).toHaveText(['AC', 'BC']);
  const initialPaths = await page
    .locator('.wire-hit')
    .evaluateAll((paths) => paths.map((path) => path.getAttribute('d')));
  const frame = (await blade.locator('.part-frame').boundingBox())!;
  await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    frame.x + frame.width / 2 + 35,
    frame.y + frame.height / 2 + 20,
    { steps: 6 },
  );
  await page.mouse.up();
  expect(
    await page
      .locator('.wire-hit')
      .evaluateAll((paths) => paths.map((path) => path.getAttribute('d'))),
  ).not.toEqual(initialPaths);
  const errors = await page.locator('.wire').evaluateAll((wires) =>
    wires.flatMap((wire) => {
      const from = wire.getAttribute('data-from')!;
      const to = wire.getAttribute('data-to')!;
      const path = wire.querySelector('.wire-hit') as SVGPathElement;
      return [from, to].map((id, index) => {
        const circle = document.querySelector(
          `[data-terminal-id="${id}"] circle`,
        ) as SVGCircleElement;
        const center = new DOMPoint(
          circle.cx.baseVal.value,
          circle.cy.baseVal.value,
        ).matrixTransform(circle.getScreenCTM()!);
        const endpoint = path
          .getPointAtLength(index ? path.getTotalLength() : 0)
          .matrixTransform(path.getScreenCTM()!);
        return Math.hypot(center.x - endpoint.x, center.y - endpoint.y);
      });
    }),
  );
  expect(Math.max(...errors)).toBeLessThan(0.01);
});

test('material shapes are smaller without cards, while labels, selection and focus remain readable', async ({
  page,
}) => {
  await page.goto('/');
  const frames = page.locator('.part-frame');
  for (const frame of await frames.all()) {
    await expect(frame).toHaveAttribute('fill', 'transparent');
    await expect(frame).toHaveCSS('stroke', 'none');
  }
  const dimensions = await page.getByTestId('part-neck').evaluate((element) => {
    const frame = element.querySelector('.part-frame') as SVGRectElement;
    const label = element.querySelector('.part-title') as SVGTextElement;
    const svg = frame.ownerSVGElement!;
    const toBoard = svg
      .getScreenCTM()!
      .inverse()
      .multiply(frame.getScreenCTM()!);
    const labelToBoard = svg
      .getScreenCTM()!
      .inverse()
      .multiply(label.getScreenCTM()!);
    return {
      width: frame.width.baseVal.value * toBoard.a,
      font: parseFloat(getComputedStyle(label).fontSize) * labelToBoard.a,
    };
  });
  expect(dimensions.width / (174 * 0.78)).toBeCloseTo(0.62 / 0.78);
  expect(dimensions.font).toBeCloseTo(16 * 0.78);
  await page.getByRole('button', { name: '✎ Edit' }).click();
  for (const frame of await frames.all())
    await expect(frame).toHaveCSS('stroke', 'none');
  const body = page.getByRole('button', {
    name: 'Select Neck pickup',
    exact: true,
  });
  await page.keyboard.press('Tab');
  await body.focus();
  await expect(body.locator('.part-frame')).toHaveCSS(
    'stroke',
    'rgb(230, 159, 103)',
  );
  await page.keyboard.press('Enter');
  await expect(body).toHaveClass(/selected-part/);
  await expect(body.locator('.part-frame')).toHaveAttribute(
    'fill',
    'transparent',
  );
  await page.getByRole('button', { name: '◉ Play' }).click();
  await expect(body.locator('.part-frame')).toHaveCSS('stroke', 'none');
});

for (const placement of ['old edge', 'compact neighbors'] as const) {
  test(`side-terminal presentation preserves saved data and readable bounds at ${placement}`, async ({
    page,
  }) => {
    const circuit = presetCircuit();
    const blade = circuit.parts.find((part) => part.id === 'selector')!;
    Object.assign(
      blade,
      placement === 'old edge' ? { x: 900, y: 525 } : { x: 390, y: 210 },
    );
    if (placement === 'old edge') {
      // The factory jack now occupies the bottom row; keep this edge-lug
      // accessibility fixture non-overlapping, as it was before that relayout.
      Object.assign(
        circuit.parts.find((part) => part.id === 'jack')!,
        {
          x: 875,
          y: 210,
        },
      );
      Object.assign(
        circuit.parts.find((part) => part.id === 'ground')!,
        {
          x: 700,
          y: 430,
        },
      );
    }
    if (placement === 'compact neighbors') {
      Object.assign(
        circuit.parts.find((part) => part.id === 'neck')!,
        { x: 230, y: 210 },
      );
      Object.assign(
        circuit.parts.find((part) => part.id === 'volume')!,
        { x: 570, y: 210 },
      );
    }
    const saved = JSON.stringify(circuit);
    await page.addInitScript(
      ({ key, saved }) => localStorage.setItem(key, saved),
      { key: storageKey, saved },
    );
    await page.goto('/');
    expect(
      await page.evaluate((key) => localStorage.getItem(key), storageKey),
    ).toBe(saved);
    const bounds = await page
      .getByTestId('part-selector')
      .locator('text, .terminal > circle:first-child')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const graphic = element as SVGGraphicsElement;
          const matrix = graphic
            .ownerSVGElement!.getScreenCTM()!
            .inverse()
            .multiply(graphic.getScreenCTM()!);
          const box = graphic.getBBox();
          const top = new DOMPoint(box.x, box.y).matrixTransform(matrix);
          const bottom = new DOMPoint(
            box.x + box.width,
            box.y + box.height,
          ).matrixTransform(matrix);
          return { x: top.x, y: top.y, right: bottom.x, bottom: bottom.y };
        }),
      );
    for (const bound of bounds) {
      expect(bound.x).toBeGreaterThan(0);
      expect(bound.y).toBeGreaterThan(0);
      expect(bound.right).toBeLessThan(board.width);
      expect(bound.bottom).toBeLessThan(board.height);
    }
    await page.getByRole('button', { name: '✎ Edit' }).click();
    for (const terminal of terminals.blade) {
      await page
        .locator(
          `[data-terminal-id="selector:${terminal.name}"] > circle:first-child`,
        )
        .click();
      await expect(
        page.locator(`[data-terminal-id="selector:${terminal.name}"]`),
      ).toHaveClass(/pending-terminal/);
      await page.keyboard.press('Escape');
    }
    expect(
      await page.evaluate((key) => localStorage.getItem(key), storageKey),
    ).toBe(saved);
    await page.screenshot({
      path: `artifacts/blade-${placement.replace(' ', '-')}.png`,
      fullPage: true,
    });
  });
}

test('JSON export, attribution, validated import and undo round trip', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '✎ Edit' }).click();
  await page.getByText('Diagram & attribution').click();
  await page.getByLabel('Diagram title').fill('My synthetic wiring');
  await page.getByLabel('Creator', { exact: true }).fill('Example Builder');
  await page.getByLabel('Source URL').fill('https://example.com/wiring');
  await page.getByLabel('Permission / license').fill('CC0');
  await page.getByRole('button', { name: 'Save attribution' }).click();
  await expect(page.getByTestId('circuit-title')).toHaveText(
    'My synthetic wiring',
  );
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('my-synthetic-wiring.json');
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(exported.version).toBe(2);
  expect(exported.metadata).toEqual({
    title: 'My synthetic wiring',
    creator: 'Example Builder',
    sourceUrl: 'https://example.com/wiring',
    permission: 'CC0',
  });
  exported.metadata.title = 'Imported diagram';
  const file = {
    name: 'diagram.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported)),
  };
  await page.getByLabel('Import diagram JSON').setInputFiles(file);
  await expect(page.getByLabel('Diagram title')).toHaveValue(
    'Imported diagram',
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByLabel('Diagram title')).toHaveValue(
    'My synthetic wiring',
  );
  // The same filename can be chosen again after undo.
  await page.getByLabel('Import diagram JSON').setInputFiles(file);
  await expect(page.getByLabel('Diagram title')).toHaveValue(
    'Imported diagram',
  );
  await page.getByRole('button', { name: '◉ Play' }).click();
  await expect(
    page.getByRole('link', { name: 'Source', exact: true }),
  ).toHaveAttribute('rel', 'noopener noreferrer');
});

test('invalid and oversized imports preserve the circuit and saved data; v1 imports migrate', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('slider', { name: 'Master volume' }).fill('6');
  await page.getByText('Diagram & attribution').click();
  const saved = await page.evaluate(
    (key) => localStorage.getItem(key),
    storageKey,
  );
  for (const text of [
    '{broken',
    ' '.repeat(limits.text + 1),
    JSON.stringify({
      ...presetCircuit(),
      metadata: {
        ...presetCircuit().metadata,
        sourceUrl: 'javascript:alert(1)',
      },
    }),
  ]) {
    await page.getByLabel('Import diagram JSON').setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from(text),
    });
    await expect(page.getByText(/Import failed:/)).toBeVisible();
    await expect(page.getByTestId('output-level')).toHaveText('60%');
    expect(
      await page.evaluate((key) => localStorage.getItem(key), storageKey),
    ).toBe(saved);
  }
  const legacy = {
    version: 1,
    parts: [
      createPart('pickup', 'legacy-pickup'),
      createPart('jack', 'legacy-jack', 1),
    ],
    wires: [
      { id: 'legacy-hot', from: 'legacy-pickup:hot', to: 'legacy-jack:tip' },
      {
        id: 'legacy-return',
        from: 'legacy-pickup:return',
        to: 'legacy-jack:sleeve',
      },
    ],
  };
  await page.getByLabel('Import diagram JSON').setInputFiles({
    name: 'legacy.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await expect(page.getByTestId('output-level')).toHaveText('100%');
  await expect(page.getByTestId('part-legacy-pickup')).toBeVisible();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).version,
      storageKey,
    ),
  ).toBe(2);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByTestId('output-level')).toHaveText('60%');
});

test('new file selections win over pending imports and read failures leave the circuit intact', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const read = File.prototype.text;
    let finishSlow: (() => void) | undefined;
    File.prototype.text = async function () {
      if (this.name === 'failure.json')
        throw new Error('Synthetic read failure');
      if (this.name === 'slow.json')
        await new Promise<void>((resolve) => {
          finishSlow = resolve;
        });
      if (this.name === 'latest.json') finishSlow?.();
      return read.call(this);
    };
  });
  await page.goto('/');
  await page.getByText('Diagram & attribution').click();
  for (const [name, title] of [
    ['slow.json', 'Stale diagram'],
    ['latest.json', 'Latest diagram'],
    ['failure.json', 'Unreadable diagram'],
  ]) {
    const circuit = presetCircuit();
    circuit.metadata.title = title!;
    await page.getByLabel('Import diagram JSON').setInputFiles({
      name: name!,
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(circuit)),
    });
    if (name === 'latest.json')
      await expect(page.locator('.diagram-files summary')).toContainText(
        'Latest diagram',
      );
  }
  await expect(page.getByText(/Synthetic read failure/)).toBeVisible();
  await expect(page.locator('.diagram-files summary')).toContainText(
    'Latest diagram',
  );
});

for (const change of [
  'blank build and new part',
  'volume edit',
  'undo',
  'preset',
]) {
  test(`pending file import cannot overwrite a newer ${change}`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const read = File.prototype.text;
      File.prototype.text = async function () {
        const text = await read.call(this);
        await new Promise<void>((resolve) => {
          window.addEventListener('release-import', () => resolve(), {
            once: true,
          });
          document.documentElement.dataset.importPending = 'true';
        });
        return text;
      };
    });
    await page.goto('/');
    await page.getByRole('slider', { name: 'Master volume' }).fill('6');
    await page.getByText('Diagram & attribution').click();
    const incoming = presetCircuit();
    incoming.metadata.title = 'Stale incoming diagram';
    await page.getByLabel('Import diagram JSON').setInputFiles({
      name: 'pending.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(incoming)),
    });
    await expect(page.locator('html')).toHaveAttribute(
      'data-import-pending',
      'true',
    );
    if (change === 'blank build and new part') {
      await page.getByRole('button', { name: 'Blank build' }).click();
      await page
        .getByRole('button', { name: '＋ Single coil', exact: true })
        .click();
    } else if (change === 'volume edit') {
      await page.getByRole('slider', { name: 'Master volume' }).fill('4');
    } else {
      await page
        .getByRole('button', {
          name: change === 'undo' ? 'Undo' : '↺ Preset',
          exact: true,
        })
        .click();
    }
    const saved = await page.evaluate(
      (key) => localStorage.getItem(key),
      storageKey,
    );
    const heading = await page.locator('.diagram-files summary').textContent();
    const output = await page.getByTestId('output-level').textContent();
    const parts = await page.locator('.part-body').count();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          window.dispatchEvent(new Event('release-import'));
          // Drain the read continuation and any React commit before inspecting state.
          window.setTimeout(resolve, 0);
        }),
    );
    await expect(page.locator('.diagram-files summary')).toHaveText(heading!);
    await expect(page.getByTestId('output-level')).toHaveText(output!);
    await expect(page.locator('.part-body')).toHaveCount(parts);
    expect(
      await page.evaluate((key) => localStorage.getItem(key), storageKey),
    ).toBe(saved);
    await expect(
      page.getByText('Diagram imported. Undo restores the previous diagram.', {
        exact: true,
      }),
    ).toHaveCount(0);
  });
}

test('compact parts only move in Edit and wire endpoints follow scaled terminals', async ({
  page,
}) => {
  await page.goto('/');
  const part = page.getByTestId('part-neck');
  const body = page.getByRole('button', {
    name: 'Select Neck pickup',
    exact: true,
  });
  const original = await part.getAttribute('transform');
  expect(original).toContain(`scale(${partScale})`);
  await body.focus();
  await page.keyboard.press('ArrowRight');
  await expect(part).toHaveAttribute('transform', original!);
  await page.getByRole('button', { name: '✎ Edit' }).click();
  await body.focus();
  await page.keyboard.press('ArrowRight');
  await expect(part).not.toHaveAttribute('transform', original!);
  const alignment = await page.evaluate(() => {
    const terminal = document.querySelector(
      '[aria-label="Neck pickup HOT terminal"] circle',
    ) as SVGCircleElement;
    const wire = document.querySelector(
      '[data-from="neck:hot"][data-to="selector:a1"] .wire-hit',
    ) as SVGPathElement;
    const terminalPoint = new DOMPoint(
      terminal.cx.baseVal.value,
      terminal.cy.baseVal.value,
    ).matrixTransform(terminal.getScreenCTM()!);
    const start = wire
      .getPointAtLength(0)
      .matrixTransform(wire.getScreenCTM()!);
    return Math.hypot(terminalPoint.x - start.x, terminalPoint.y - start.y);
  });
  expect(alignment).toBeLessThan(0.01);
  const start = (await body.boundingBox())!;
  const surface = (await page.locator('.circuit-board').boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    surface.x + surface.width + 50,
    start.y + start.height / 2,
    { steps: 6 },
  );
  await page.mouse.up();
  await expect(page.getByTestId('output-level')).toHaveText('100%');
  await expect(page.getByText('Saved on this browser')).toBeVisible();
  const savedPosition = await part.getAttribute('transform');
  await page.reload();
  await expect(part).toHaveAttribute('transform', savedPosition!);
});

test('bottom-edge dragging and legacy saved positions keep paths and labels inside the board', async ({
  page,
}) => {
  const legacyCircuit = presetCircuit();
  legacyCircuit.parts = legacyCircuit.parts.map((part) =>
    part.id === 'bridge' ? { ...part, y: 525 } : part,
  );
  await page.addInitScript(
    ({ key, circuit }) =>
      window.localStorage.setItem(key, JSON.stringify(circuit)),
    { key: storageKey, circuit: legacyCircuit },
  );
  await page.goto('/');
  await expect(
    page.getByText('Restored your saved circuit from this browser'),
  ).toBeVisible();

  const expectGeometryInside = async () => {
    const bounds = await page
      .locator('.circuit-board .wire path, .circuit-board [data-testid] text')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const graphic = element as SVGGraphicsElement;
          const svg = graphic.ownerSVGElement!;
          const transform = svg
            .getScreenCTM()!
            .inverse()
            .multiply(graphic.getScreenCTM()!);
          const box = graphic.getBBox();
          const top = new DOMPoint(box.x, box.y).matrixTransform(transform);
          const bottom = new DOMPoint(
            box.x + box.width,
            box.y + box.height,
          ).matrixTransform(transform);
          const padding =
            Number(getComputedStyle(graphic).strokeWidth.replace('px', '')) / 2;
          return { top: top.y - padding, bottom: bottom.y + padding };
        }),
      );
    expect(bounds.length).toBeGreaterThan(30);
    for (const bound of bounds) {
      expect(bound.top).toBeGreaterThanOrEqual(0);
      expect(bound.bottom).toBeLessThanOrEqual(board.height);
    }
  };
  await expectGeometryInside();
  expect(
    await page.evaluate(
      (key) =>
        JSON.parse(window.localStorage.getItem(key)!).parts.find(
          (part: { id: string }) => part.id === 'bridge',
        ).y,
      storageKey,
    ),
  ).toBe(525);

  await page.getByRole('button', { name: '✎ Edit' }).click();
  const pickup = page.getByRole('button', {
    name: 'Select Neck pickup',
    exact: true,
  });
  const start = (await pickup.boundingBox())!;
  const surface = (await page.locator('.circuit-board').boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    start.x + start.width / 2,
    surface.y + surface.height + 30,
    { steps: 8 },
  );
  await expectGeometryInside();
  await page.mouse.up();
  await expectGeometryInside();
  expect((await pickup.boundingBox())!.y).toBeGreaterThan(start.y + 200);
  await pickup.focus();
  await page.keyboard.press('ArrowDown');
  await expectGeometryInside();
});

test('corrupt storage recovers and unavailable storage keeps controls usable', async ({
  page,
}) => {
  await page.addInitScript(() =>
    window.localStorage.setItem('pickup-lab:circuit:v1', '{broken'),
  );
  await page.goto('/');
  await expect(page.getByText(/Saved work could not be read/)).toBeVisible();
  await expect(page.getByTestId('output-level')).toHaveText('100%');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Unavailable');
    };
  });
  await page.getByRole('slider', { name: 'Master volume' }).fill('4');
  await expect(page.getByTestId('output-level')).toHaveText('40%');
  await expect(page.getByText(/Browser storage unavailable/)).toBeVisible();
});

test('desktop and mobile layouts render without browser errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'See how your sound connects.' }),
  ).toBeVisible();
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({
    path: 'artifacts/workbench-desktop.png',
    fullPage: true,
  });
  await page.getByRole('slider', { name: 'Master tone' }).fill('0');
  await page.screenshot({
    path: 'artifacts/workbench-treble-diversion.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '✎ Edit' }).click();
  await page.getByText('Diagram & attribution').click();
  await page.screenshot({
    path: 'artifacts/workbench-edit-attribution.png',
    fullPage: true,
  });
  await page.getByText('Diagram & attribution').click();
  await page.getByRole('button', { name: '◉ Play' }).click();
  await page.getByRole('slider', { name: 'Master tone' }).fill('10');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Blank build' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: 'artifacts/workbench-mobile.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('named single-coil default exports exact title, component values and one row per pickup', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('circuit-title')).toHaveText(
    '2 single-coils, 3-way blade, 1 volume, 1 tone',
  );
  for (const id of ['neck', 'bridge']) {
    await expect(
      page.getByTestId(`part-${id}`).locator('[data-coil]'),
    ).toHaveCount(1);
    await expect(
      page.getByTestId(`part-${id}`).locator('[data-coil] circle'),
    ).toHaveCount(6);
    await expect(
      page.getByTestId(`part-${id}`).locator('.terminal'),
    ).toHaveCount(2);
  }
  await expect(page.getByTestId('part-volume')).toContainText('250 kΩ');
  await expect(page.getByTestId('part-tone')).toContainText('250 kΩ');
  await expect(page.getByTestId('part-capacitor')).toContainText('47 nF');
  await page.getByText('Diagram & attribution').click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(
    '2-single-coils-3-way-blade-1-volume-1-tone.json',
  );
  expect(JSON.parse(await readFile((await download.path())!, 'utf8'))).toEqual(
    presetCircuit(),
  );
  await page.getByRole('button', { name: '✎ Edit' }).click();
  await page.getByLabel('Diagram title').fill('My named Tele');
  await page.getByRole('button', { name: 'Save attribution' }).click();
  await page.reload();
  await expect(page.getByTestId('circuit-title')).toHaveText('My named Tele');
});

test('Ground shows only selected return paths and floats when its explicit sleeve link is removed', async ({
  page,
}) => {
  await page.goto('/');
  const ground = page.getByTestId('part-ground');
  const symbol = page.getByTestId('ground-symbol-ground');
  await expect(ground).toContainText('Ground');
  await expect(ground).toContainText('GND');
  await expect(ground).toContainText('ACTIVE RETURN');
  await expect(symbol).toHaveAttribute('data-active', 'true');
  for (const [position, active, inactive] of [
    [1, '8', '9'],
    [3, '9', '8'],
  ] as const) {
    await page
      .getByRole('button', { name: `Position ${position}`, exact: true })
      .click();
    await expect(
      page.locator(`[data-wire-id="wire-${active}"]`),
    ).toHaveAttribute('data-ground-level', '1');
    await expect(
      page.locator(`[data-wire-id="wire-${inactive}"]`),
    ).toHaveAttribute('data-ground-level', '0');
    await expect(
      page.locator(`[data-wire-id="wire-${inactive}"] .ground-glow`),
    ).toHaveCount(0);
  }
  for (const id of ['13', '14'])
    await expect(page.locator(`[data-wire-id="wire-${id}"]`)).toHaveAttribute(
      'data-ground-level',
      '0',
    );
  await page.getByRole('slider', { name: 'Master tone' }).fill('0');
  await expect(
    page.locator('[data-from="capacitor:b"][data-to="ground:common"]'),
  ).toHaveAttribute('data-tone-level', '1');
  const sleeve = page.locator(
    '[data-from="ground:common"][data-to="jack:sleeve"]',
  );
  await expect(sleeve).toHaveAttribute('data-tone-level', '1');
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({
    path: 'artifacts/workbench-ground-active.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '✎ Edit' }).click();
  const body = page.getByRole('button', { name: 'Select Ground', exact: true });
  const original = await ground.getAttribute('transform');
  const bounds = (await body.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 - 35,
    bounds.y + bounds.height / 2 - 20,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(ground).not.toHaveAttribute('transform', original!);
  const alignment = await page.evaluate(() => {
    const lug = document.querySelector(
      '[aria-label="Ground GND terminal"] circle',
    ) as SVGCircleElement;
    const wire = document.querySelector(
      '[data-from="ground:common"][data-to="jack:sleeve"] .wire-hit',
    ) as SVGPathElement;
    const center = new DOMPoint(
      lug.cx.baseVal.value,
      lug.cy.baseVal.value,
    ).matrixTransform(lug.getScreenCTM()!);
    const start = wire
      .getPointAtLength(0)
      .matrixTransform(wire.getScreenCTM()!);
    return Math.hypot(center.x - start.x, center.y - start.y);
  });
  expect(alignment).toBeLessThan(0.01);
  await sleeve.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Remove selected wire' }).click();
  await expect(ground).toContainText('FLOATING');
  await expect(symbol).toHaveAttribute('data-active', 'false');
  await expect(page.locator('.ground-glow, .tone-flow')).toHaveCount(0);
  await expect(page.getByTestId('output-level')).toHaveText('—');
  await page.screenshot({
    path: 'artifacts/workbench-ground-floating.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(ground).toContainText('ACTIVE RETURN');
});

test('Ground palette nodes are independent explicit junctions with deletion and undo', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Blank build' }).click();
  await page.getByRole('button', { name: '＋ Ground', exact: true }).click();
  await page
    .getByRole('button', { name: '＋ Output jack', exact: true })
    .click();
  await expect(
    page.locator('.part-state').filter({ hasText: 'FLOATING' }),
  ).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Ground GND terminal', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Output jack SLEEVE terminal', exact: true })
    .click();
  await expect(
    page.locator('.part-state').filter({ hasText: 'CONNECTED / IDLE' }),
  ).toHaveCount(1);
  await page.getByRole('button', { name: '＋ Ground', exact: true }).click();
  await expect(
    page.locator('.part-state').filter({ hasText: 'FLOATING' }),
  ).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Select Ground', exact: true })
    .first()
    .focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Remove selected part' }).click();
  await expect(page.getByRole('button', { name: /^Wire / })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Wire / })).toHaveCount(1);
  await expect(
    page.locator('.part-state').filter({ hasText: 'CONNECTED / IDLE' }),
  ).toHaveCount(1);
});

for (const savedFormat of [
  'v1',
  'previously migrated v2',
  'custom named v2',
] as const) {
  test(`restored ${savedFormat} offers the standard Tele without replacing saved work until requested`, async ({
    page,
  }) => {
    const previous = legacyCircuit();
    previous.metadata.title =
      savedFormat === 'custom named v2'
        ? 'My own wiring'
        : 'Imported legacy build';
    const saved = savedFormat === 'v1' ? legacyV1() : previous;
    const key = savedFormat === 'v1' ? legacyStorageKey : storageKey;
    const text = JSON.stringify(saved);
    await page.addInitScript(
      ({ key, text }) => localStorage.setItem(key, text),
      { key, text },
    );
    await page.goto('/');
    const title =
      savedFormat === 'custom named v2' ? 'My own wiring' : 'Restored circuit';
    await expect(page.getByTestId('circuit-title')).toHaveText(title);
    await expect(
      page.getByTestId('part-selector').locator('.terminal'),
    ).toHaveCount(3);
    await expect(page.getByTestId('blade-lever-selector')).toHaveCount(0);
    await expect(page.getByTestId('part-ground')).toHaveCount(0);
    const action = page.getByRole('button', {
      name: 'Load standard Tele',
      exact: true,
    });
    await expect(action).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/legacy/i);
    expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
      text,
    );
    if (savedFormat === 'v1') {
      expect(
        await page.evaluate((key) => localStorage.getItem(key), storageKey),
      ).toBeNull();
      await mkdir('artifacts', { recursive: true });
      await page.screenshot({
        path: 'artifacts/workbench-restored-circuit.png',
        fullPage: true,
      });
    }
    await page.getByRole('button', { name: '✎ Edit' }).click();
    await page.getByText('Diagram & attribution').click();
    await expect(page.getByLabel('Diagram title')).toHaveValue(title);
    await action.click();
    await expect(action).toHaveCount(0);
    await expect(page.getByTestId('circuit-title')).toHaveText(
      presetCircuit().metadata.title,
    );
    await expect(page.getByTestId('blade-lever-selector')).toBeVisible();
    await expect(
      page.getByTestId('part-selector').locator('.terminal'),
    ).toHaveCount(8);
    await expect(page.getByTestId('part-ground')).toBeVisible();
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        storageKey,
      ),
    ).toEqual(presetCircuit());
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByTestId('circuit-title')).toHaveText(title);
    await expect(page.getByLabel('Diagram title')).toHaveValue(title);
    await expect(action).toBeVisible();
    await expect(
      page.getByTestId('part-selector').locator('.terminal'),
    ).toHaveCount(3);
    await expect(page.getByTestId('part-ground')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/legacy/i);
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        storageKey,
      ),
    ).toEqual(migrateCircuit(saved));
    if (savedFormat === 'v1')
      expect(
        await page.evaluate(
          (key) => localStorage.getItem(key),
          legacyStorageKey,
        ),
      ).toBe(text);
  });
}
