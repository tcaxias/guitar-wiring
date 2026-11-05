import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  paletteKinds,
  partLabels,
  presetCircuit,
  terminalsFor,
  type Circuit,
} from '../src/circuit/model';
import {
  fourWayTeleCircuit,
  splitHumbuckerCircuit,
  varitoneCircuit,
} from '../src/circuit/library';
import { storageKey } from '../src/storage';

test.use({
  baseURL: 'http://127.0.0.1:4178',
  viewport: { width: 1440, height: 900 },
});

const themeKey = 'pickup-lab:theme:v1';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('pickup-lab:ground-wiring:v1', 'shown'),
  );
});
const controls = (page: Page) =>
  page.getByRole('region', { name: 'Part controls', exact: true });
const savedText = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), storageKey);
const savedCircuit = async (page: Page): Promise<Circuit> =>
  JSON.parse((await savedText(page))!);

async function seed(page: Page, circuit: Circuit) {
  const text = JSON.stringify(circuit, null, 2);
  await page.addInitScript(
    ({ key, text }) => {
      // Reload must restore the app's latest save, not reapply the fixture.
      if (localStorage.getItem(key) === null) localStorage.setItem(key, text);
    },
    { key: storageKey, text },
  );
  return text;
}

async function selectPart(page: Page, id: string) {
  const part = page.getByTestId(`part-${id}`);
  await part.locator('.part-body').scrollIntoViewIfNeeded();
  const target = await part.evaluate((element) => {
    // Compound push-pull bounds include the switch and can center on a real lug.
    const point = new DOMPoint(90, 58).matrixTransform(
      (element as SVGGElement).getScreenCTM()!,
    );
    return {
      x: point.x,
      y: point.y,
      isPartBody:
        document.elementFromPoint(point.x, point.y)?.closest('.part-body') ===
        element.querySelector('.part-body'),
    };
  });
  expect(target.isPartBody).toBe(true);
  await page.mouse.click(target.x, target.y);
  await expect(controls(page)).toBeVisible();
  return controls(page);
}

async function openManager(page: Page) {
  await page.getByRole('button', { name: 'Open diagram', exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Open diagram',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function loadExample(page: Page, id: string) {
  const manager = await openManager(page);
  await manager.getByLabel('Library', { exact: true }).selectOption(id);
  await manager
    .getByRole('button', { name: 'Load example', exact: true })
    .click();
  await expect(manager).not.toBeVisible();
}

async function openDetails(page: Page) {
  await page.getByRole('button', { name: 'More options', exact: true }).click();
  await page
    .getByRole('button', { name: 'Diagram details', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Diagram details',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function expectInsideViewport(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function expectDialogFocusContained(page: Page, dialog: Locator) {
  await expect
    .poll(() =>
      dialog.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);
  // Cross each end of the focus order rather than assuming the first focus target.
  for (const key of ['Tab', 'Shift+Tab'])
    for (let step = 0; step < 16; step += 1) {
      await page.keyboard.press(key);
      expect(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBe(true);
    }
}

test('first screen is a light, diagram-first Explore workbench', async ({
  page,
}) => {
  await page.goto('/');
  const root = page.getByTestId('workbench-ui');
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(root).toHaveAttribute('data-mode', 'explore');
  await expect(
    page.getByRole('combobox', { name: 'Theme', exact: true }),
  ).toHaveValue('light');
  const canvas = page.getByTestId('workbench-canvas');
  await expectInsideViewport(page, canvas);
  expect((await canvas.boundingBox())!.height).toBeGreaterThanOrEqual(
    900 * 0.7,
  );
  await expect(
    page.getByLabel('Guitar wiring workbench', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('See how your sound connects.', { exact: true }),
  ).not.toBeVisible();
  await expect(controls(page)).not.toBeVisible();
  await expect(page.getByRole('slider')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^＋ / })).toHaveCount(0);
  await expect(page.getByLabel('Diagram title', { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByTestId('treble-level')).not.toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  for (const name of ['Open diagram', 'Edit circuit', 'Undo', 'More options'])
    await expectInsideViewport(
      page,
      page.getByRole('button', { name, exact: true }),
    );
  await expect(page.getByTestId('output-level')).toHaveText('100%');
  await expect(page.locator('.terminal')).toHaveCount(
    presetCircuit().parts.reduce(
      (count, part) => count + terminalsFor(part).length,
      0,
    ),
  );
  await expectInsideViewport(page, page.getByTestId('workbench-status'));
});

test('smaller material keeps fixed pins and readable text in both themes, and loading is the only factory relayout', async ({
  page,
}) => {
  const custom = presetCircuit();
  custom.parts = custom.parts.map((part, index) => ({
    ...part,
    x: 65 + (index % 4) * 230,
    y: 80 + Math.floor(index / 4) * 260,
  }));
  const original = await seed(page, custom);
  await page.goto('/');
  for (const theme of ['dark', 'light']) {
    await page
      .getByRole('combobox', { name: 'Theme', exact: true })
      .selectOption(theme);
    expect(await savedText(page)).toBe(original);
    for (const part of custom.parts)
      await expect(page.getByTestId(`part-${part.id}`)).toHaveAttribute(
        'transform',
        `translate(${part.x} ${part.y}) scale(0.62)`,
      );
  }
  await page.reload();
  expect(await savedText(page)).toBe(original);
  await loadExample(page, 'standard-tele');
  expect(await savedCircuit(page)).toEqual(presetCircuit());
  const dimensions = await page.getByTestId('part-neck').evaluate((element) => {
    const material = element.querySelector(
      '[data-material="pickup"] rect',
    ) as SVGGraphicsElement;
    const pin = element.querySelector(
      '[data-terminal-id="neck:hot"] circle',
    ) as SVGCircleElement;
    const title = element.querySelector('.part-title') as SVGGraphicsElement;
    const board = element.closest('svg')!.getScreenCTM()!.a;
    return {
      materialWidth: material.getBoundingClientRect().width / board,
      pinDiameter: pin.getBoundingClientRect().width / board,
      textScale: title.getScreenCTM()!.a / board,
    };
  });
  expect(dimensions.materialWidth).toBeCloseTo(78);
  expect(dimensions.materialWidth / (156 * 0.62)).toBeCloseTo(0.5 / 0.62);
  expect(dimensions.pinDiameter).toBeCloseTo(22);
  expect(dimensions.textScale).toBeCloseTo(0.78);
  await expect(
    page.locator('[data-terminal-id="jack:tip"] > path'),
  ).toHaveAttribute('fill', 'none');
  for (const theme of ['dark', 'light']) {
    await page
      .getByRole('combobox', { name: 'Theme', exact: true })
      .selectOption(theme);
    await selectPart(page, 'neck');
    await controls(page)
      .getByRole('button', { name: 'Close part controls', exact: true })
      .click();
  }
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await savedCircuit(page)).toEqual(custom);
});

test('theme and mode changes preserve exact saved data and undo history while SVG colors change', async ({
  page,
}) => {
  const circuit = presetCircuit();
  circuit.metadata.title = 'Synthetic preserved diagram';
  const text = await seed(page, circuit);
  await page.addInitScript((key) => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key && document.documentElement)
        document.documentElement.dataset.circuitWrites = String(
          Number(document.documentElement.dataset.circuitWrites ?? 0) + 1,
        );
      return setItem.call(this, name, value);
    };
  }, storageKey);
  await page.goto('/');
  await expect(page.getByTestId('workbench-ui')).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.dataset.circuitWrites = '0';
  });
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  const colors = async () => ({
    surfaces: await page
      .getByTestId('workbench-ui')
      .evaluate((root) =>
        [
          document.body,
          root,
          root.querySelector('[data-testid="workbench-canvas"]')!,
          root.querySelector('svg')!,
        ].map((element) => getComputedStyle(element).backgroundColor),
      ),
    label: await page
      .getByTestId('part-volume')
      .locator('.part-title')
      .evaluate((element) => getComputedStyle(element).fill),
  });
  const light = await colors();
  await theme.selectOption('dark');
  await expect(page.getByTestId('workbench-ui')).toHaveAttribute(
    'data-theme',
    'dark',
  );
  const dark = await colors();
  expect(dark.surfaces).not.toEqual(light.surfaces);
  expect(dark.label).not.toBe(light.label);
  for (const color of [light.label, dark.label])
    expect(color).not.toMatch(/^(none|transparent|rgba\(0, 0, 0, 0\))$/);
  await page.getByRole('button', { name: 'Edit circuit', exact: true }).click();
  await expect(page.getByTestId('workbench-ui')).toHaveAttribute(
    'data-mode',
    'edit',
  );
  await page
    .getByRole('button', { name: 'Finish editing', exact: true })
    .click();
  expect(await savedText(page)).toBe(text);
  await expect(page.locator('html')).toHaveAttribute(
    'data-circuit-writes',
    '0',
  );
  await expect(
    page.getByRole('button', { name: 'Undo', exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), themeKey),
  ).toBe('dark');
  await page.reload();
  await expect(theme).toHaveValue('dark');
  expect(await savedText(page)).toBe(text);
  await selectPart(page, 'volume');
  await controls(page)
    .getByRole('slider', { name: 'Master volume', exact: true })
    .fill('5');
  const changed = await savedText(page);
  await theme.selectOption('light');
  await page.getByRole('button', { name: 'Edit circuit', exact: true }).click();
  await page
    .getByRole('button', { name: 'Finish editing', exact: true })
    .click();
  expect(await savedText(page)).toBe(changed);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await savedCircuit(page)).toEqual(circuit);
  await expect(
    page.getByRole('button', { name: 'Undo', exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(theme).toHaveValue('light');
});

test('invalid stored theme falls back to light without rewriting the circuit', async ({
  page,
}) => {
  const text = await seed(page, presetCircuit());
  await page.addInitScript(
    (key) => localStorage.setItem(key, 'unexpected-theme'),
    themeKey,
  );
  await page.goto('/');
  await expect(page.getByTestId('workbench-ui')).toHaveAttribute(
    'data-theme',
    'light',
  );
  await expect(page.getByTestId('output-level')).toHaveText('100%');
  expect(await savedText(page)).toBe(text);
});

test('Explore controls are contextual, persist real settings and restore keyboard focus', async ({
  page,
}) => {
  await page.goto('/');
  const canvas = page.getByTestId('workbench-canvas');
  const before = await canvas.boundingBox();
  const volume = page.getByTestId('part-volume').locator('.part-body');
  const volumePosition = await page
    .getByTestId('part-volume')
    .getAttribute('transform');
  await volume.focus();
  await page.keyboard.press('Enter');
  await expect(controls(page)).toBeVisible();
  expect(await canvas.boundingBox()).toEqual(before);
  await expect(
    controls(page).getByLabel('Part label', { exact: true }),
  ).toHaveCount(0);
  await controls(page)
    .getByRole('slider', { name: 'Master volume', exact: true })
    .fill('5');
  await expect(page.getByTestId('output-level')).toHaveText('50%');
  await expect(page.getByTestId('part-volume')).toHaveAttribute(
    'transform',
    volumePosition!,
  );
  expect(
    (await savedCircuit(page)).parts.find((part) => part.id === 'volume')!
      .value,
  ).toBe(5);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await expect(controls(page)).not.toBeVisible();
  await expect(volume).toBeFocused();
  await selectPart(page, 'selector');
  await controls(page)
    .getByRole('button', { name: 'Position 1', exact: true })
    .click();
  await expect(
    page.getByTestId('part-bridge').locator('[data-coil][data-active="true"]'),
  ).toHaveCount(0);
  await selectPart(page, 'tone');
  await expect(
    controls(page).getByRole('slider', { name: 'Master volume', exact: true }),
  ).toHaveCount(0);
  await controls(page)
    .getByRole('slider', { name: 'Master tone', exact: true })
    .fill('0');
  await controls(page)
    .getByRole('button', { name: 'Close part controls', exact: true })
    .click();
  await expect(
    page.getByTestId('part-tone').locator('.part-body'),
  ).toBeFocused();
  const details = await openDetails(page);
  await expect(details.getByTestId('treble-level')).toHaveText('25%');
  await expect(
    page.getByTestId('workbench-status').getByTestId('output-level'),
  ).toHaveText('50%');
  await details
    .getByRole('button', { name: 'Close dialog', exact: true })
    .click();
  await page.reload();
  await selectPart(page, 'volume');
  await expect(
    controls(page).getByRole('slider', { name: 'Master volume', exact: true }),
  ).toHaveValue('5');
  await controls(page)
    .getByRole('button', { name: 'Close part controls', exact: true })
    .click();
  const saved = await savedText(page);
  const wire = page.locator('[data-wire-id="wire-0"]');
  await wire.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.trace-terminal-ring')).toHaveCount(2);
  await expect(
    page.getByRole('button', { name: 'Remove selected wire', exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press('Delete');
  await expect(wire).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.trace-terminal-ring')).toHaveCount(0);
  expect(await savedText(page)).toBe(saved);
});

test('Edit supports adding, wiring, movement, removal and undo without an obstructing inspector', async ({
  page,
}) => {
  await page.goto('/');
  const manager = await openManager(page);
  await manager
    .getByRole('button', { name: 'New circuit', exact: true })
    .click();
  await expect(manager).not.toBeVisible();
  await expect(page.getByTestId('workbench-ui')).toHaveAttribute(
    'data-mode',
    'edit',
  );
  for (const name of ['Single coil', 'Output jack']) {
    await page.getByRole('button', { name: 'Add part', exact: true }).click();
    const palette = page.getByRole('dialog', { name: 'Add part', exact: true });
    if (name === 'Single coil')
      for (const label of [
        ...paletteKinds.map((kind) => partLabels[kind]),
        'P90',
        'DynaSonic',
        "Filter'Tron",
        'Mini-humbucker',
      ])
        await expect(
          palette.getByRole('button', { name: `＋ ${label}`, exact: true }),
        ).toBeVisible();
    await palette
      .getByRole('button', { name: `＋ ${name}`, exact: true })
      .click();
    await expect(palette).not.toBeVisible();
    await expect(controls(page)).toBeVisible();
  }
  const hot = page.getByRole('button', {
    name: 'Single coil HOT terminal',
    exact: true,
  });
  await hot.click();
  await expect(
    page.getByRole('button', { name: 'Cancel connection', exact: true }),
  ).toBeVisible();
  const savedBeforeDialog = await savedText(page);
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const wasUndoEnabled = await undo.isEnabled();
  const pendingManager = await openManager(page);
  await expectDialogFocusContained(page, pendingManager);
  await page.keyboard.press('Escape');
  await expect(pendingManager).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Open diagram', exact: true }),
  ).toBeFocused();
  await expect(page.locator('.pending-terminal')).toHaveCount(1);
  expect(await savedText(page)).toBe(savedBeforeDialog);
  expect(await undo.isEnabled()).toBe(wasUndoEnabled);
  await page.keyboard.press('Escape');
  await expect(page.locator('.pending-terminal')).toHaveCount(0);
  await hot.click();
  await page
    .getByRole('button', { name: 'Cancel connection', exact: true })
    .click();
  await expect(page.locator('.pending-terminal')).toHaveCount(0);
  for (const [from, to] of [
    ['HOT', 'TIP'],
    ['RETURN', 'SLEEVE'],
  ]) {
    for (const name of [
      `Single coil ${from} terminal`,
      `Output jack ${to} terminal`,
    ]) {
      const terminal = page.getByRole('button', { name, exact: true });
      if (from === 'HOT') {
        await terminal.focus();
        await page.keyboard.press('Enter');
      } else await terminal.click();
    }
  }
  await expect(page.getByTestId('output-level')).toHaveText('100%');
  const pickup = page.getByRole('button', {
    name: 'Select Single coil',
    exact: true,
  });
  await pickup.click();
  const part = page.locator('[data-testid^="part-"]').filter({ has: pickup });
  const original = await part.getAttribute('transform');
  const start = await part.evaluate((element) => {
    const point = new DOMPoint(90, 58).matrixTransform(
      (element as SVGGElement).getScreenCTM()!,
    );
    return { x: point.x, y: point.y };
  });
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 110, start.y + 90, { steps: 5 });
  await page.mouse.up();
  await expect(part).not.toHaveAttribute('transform', original!);
  const dragged = await part.getAttribute('transform');
  await pickup.focus();
  await page.keyboard.press('ArrowRight');
  await expect(part).not.toHaveAttribute('transform', dragged!);
  const endpointDistance = await hot.evaluate((terminal) => {
    const circle = terminal.querySelector('circle')!;
    const center = new DOMPoint(
      circle.cx.baseVal.value,
      circle.cy.baseVal.value,
    ).matrixTransform(circle.getScreenCTM()!);
    const wire = document.querySelector(
      `[data-from="${terminal.getAttribute('data-terminal-id')}"] .wire-hit`,
    ) as SVGPathElement;
    const end = wire.getPointAtLength(0).matrixTransform(wire.getScreenCTM()!);
    return Math.hypot(center.x - end.x, center.y - end.y);
  });
  expect(endpointDistance).toBeLessThan(0.1);
  const saved = await savedCircuit(page);
  await controls(page)
    .getByRole('button', { name: 'Remove selected part', exact: true })
    .click();
  await expect(page.getByRole('button', { name: /^Wire / })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await savedCircuit(page)).toEqual(saved);
  const wire = page.getByRole('button', { name: /^Wire / }).first();
  await wire.focus();
  await page.keyboard.press('Enter');
  await page
    .getByRole('button', { name: 'Remove selected wire', exact: true })
    .click();
  await expect(page.getByRole('button', { name: /^Wire / })).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await savedCircuit(page)).toEqual(saved);
  await page
    .getByRole('button', { name: 'Finish editing', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Add part', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^＋ / })).toHaveCount(0);
  await pickup.click();
  await expect(controls(page)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Remove selected part', exact: true }),
  ).toHaveCount(0);
});

test('library replacement undoes exactly and extended controls retain their electrical behavior', async ({
  page,
}) => {
  const prior = presetCircuit();
  prior.metadata.title = 'Synthetic prior work';
  prior.parts.find((part) => part.id === 'volume')!.value = 7;
  await seed(page, prior);
  await page.goto('/');
  await loadExample(page, 'split-humbuckers');
  expect(await savedCircuit(page)).toEqual(splitHumbuckerCircuit());
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await savedCircuit(page)).toEqual(prior);
  await loadExample(page, 'split-humbuckers');
  await selectPart(page, 'volume');
  await expect(page.locator('[data-coil][data-active="true"]')).toHaveCount(4);
  await controls(page)
    .getByRole('slider', { name: 'Split / master volume', exact: true })
    .fill('6');
  await controls(page)
    .getByRole('button', { name: 'Pulled', exact: true })
    .click();
  await expect(page.locator('[data-coil="a"][data-active="true"]')).toHaveCount(
    2,
  );
  await expect(page.locator('[data-coil="b"][data-active="true"]')).toHaveCount(
    0,
  );
  await expect(page.getByTestId('output-level')).toHaveText('60%');
  await controls(page)
    .getByRole('button', { name: 'Pushed', exact: true })
    .click();
  await expect(page.locator('[data-coil][data-active="true"]')).toHaveCount(4);
  await expect(page.getByTestId('output-level')).toHaveText('60%');
  await page.getByRole('button', { name: 'Edit circuit', exact: true }).click();
  await selectPart(page, 'volume');
  const reachable = await page.locator('.terminal').evaluateAll((terminals) =>
    terminals.map((terminal) => {
      const circle = terminal.querySelector('circle')!;
      const center = new DOMPoint(
        circle.cx.baseVal.value,
        circle.cy.baseVal.value,
      ).matrixTransform(circle.getScreenCTM()!);
      return (
        document.elementFromPoint(center.x, center.y)?.closest('.terminal') ===
        terminal
      );
    }),
  );
  expect(reachable.length).toBeGreaterThan(10);
  expect(reachable.every(Boolean)).toBe(true);
  const positionBeforeControl = await page
    .getByTestId('part-volume')
    .getAttribute('transform');
  const volumeControl = controls(page).getByRole('slider', {
    name: 'Split / master volume',
    exact: true,
  });
  await volumeControl.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(volumeControl).toHaveValue('5');
  const sliderBounds = (await volumeControl.boundingBox())!;
  const sliderY = sliderBounds.y + sliderBounds.height / 2;
  await page.mouse.move(sliderBounds.x + sliderBounds.width * 0.4, sliderY);
  await page.mouse.down();
  await page.mouse.move(sliderBounds.x + sliderBounds.width * 0.7, sliderY, {
    steps: 4,
  });
  await page.mouse.up();
  await expect(page.getByTestId('part-volume')).toHaveAttribute(
    'transform',
    positionBeforeControl!,
  );
  await page
    .getByRole('button', { name: 'Finish editing', exact: true })
    .click();
  await loadExample(page, 'tele-four-way');
  expect(await savedCircuit(page)).toEqual(fourWayTeleCircuit());
  await selectPart(page, 'selector');
  await controls(page)
    .getByRole('button', { name: 'Position 4', exact: true })
    .click();
  await expect(page.locator('[data-coil][data-active="true"]')).toHaveCount(2);
  await expect(page.locator('[data-from="neck:shield"]')).toHaveAttribute(
    'data-ground-level',
    '0',
  );
  let details = await openDetails(page);
  await expect(details.getByTestId('coil-topology')).toHaveText(
    'Series pickups',
  );
  await details
    .getByRole('button', { name: 'Close dialog', exact: true })
    .click();
  await loadExample(page, 'varitone-tele');
  expect(await savedCircuit(page)).toEqual(varitoneCircuit());
  await selectPart(page, 'varitone');
  const position = controls(page).getByRole('combobox', {
    name: 'Varitone position',
    exact: true,
  });
  await expect(position).toHaveValue('1');
  await expect(page.locator('.varitone-flow')).toHaveCount(0);
  await position.selectOption('6');
  await expect(
    page.locator('[data-wire-id="varitone-ground"]'),
  ).toHaveAttribute('data-varitone-level', '1');
  details = await openDetails(page);
  await expect(details.getByTestId('varitone-state')).toHaveText(
    'Filter connected',
  );
  await expect(details.getByTestId('varitone-frequency')).toHaveText('277 Hz');
  await expect(details.getByTestId('treble-level')).toHaveText('100%');
  await details
    .getByRole('button', { name: 'Close dialog', exact: true })
    .click();
  await selectPart(page, 'varitone');
  await position.selectOption('1');
  await expect(page.locator('.varitone-flow')).toHaveCount(0);
  await expect(page.getByTestId('output-level')).toHaveText('100%');
});

test('diagram manager exposes metadata and files directly, preserves invalid imports and supports same-file retry', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit circuit', exact: true }).click();
  let manager = await openManager(page);
  await expect(
    manager.getByRole('button', { name: 'Import JSON', exact: true }),
  ).toBeVisible();
  await manager
    .getByLabel('Diagram title', { exact: true })
    .fill('Synthetic wiring');
  await manager.getByLabel('Creator', { exact: true }).fill('Example Builder');
  await manager
    .getByLabel('Source URL', { exact: true })
    .fill('https://example.com/wiring');
  await manager.getByLabel('Permission / license', { exact: true }).fill('CC0');
  await manager
    .getByRole('button', { name: 'Save attribution', exact: true })
    .click();
  const expected = presetCircuit();
  expected.metadata = {
    title: 'Synthetic wiring',
    creator: 'Example Builder',
    sourceUrl: 'https://example.com/wiring',
    permission: 'CC0',
  };
  await expect.poll(() => savedCircuit(page)).toEqual(expected);
  // Metadata save may leave the manager open or close it; replacement must close it.
  if (!(await manager.isVisible())) manager = await openManager(page);
  const downloadEvent = page.waitForEvent('download');
  await manager
    .getByRole('button', { name: 'Export JSON', exact: true })
    .click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('synthetic-wiring.json');
  expect(JSON.parse(await readFile((await download.path())!, 'utf8'))).toEqual(
    expected,
  );
  const saved = await savedText(page);
  await manager
    .getByLabel('Import diagram JSON', { exact: true })
    .setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{broken'),
    });
  await expect(manager.getByText(/Import failed:/)).toBeVisible();
  await manager
    .getByRole('button', { name: 'Close dialog', exact: true })
    .click();
  await expect(page.getByTestId('workbench-status')).toContainText(
    /Import failed:/,
  );
  await page
    .getByRole('button', { name: 'Finish editing', exact: true })
    .click();
  await expect(page.getByTestId('workbench-status')).toContainText(
    /Import failed:/,
  );
  expect(await savedText(page)).toBe(saved);
  const incoming = splitHumbuckerCircuit();
  const file = {
    name: 'split.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(incoming)),
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    manager = await openManager(page);
    await manager
      .getByLabel('Import diagram JSON', { exact: true })
      .setInputFiles(file);
    await expect(manager).not.toBeVisible();
    expect(await savedCircuit(page)).toEqual(incoming);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect(await savedCircuit(page)).toEqual(expected);
  }
});

test('closing the manager cancels an in-flight read before it can replace subsequent work', async ({
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
  for (const shouldEdit of [false, true]) {
    await page.evaluate(() => {
      delete document.documentElement.dataset.importPending;
    });
    const manager = await openManager(page);
    await manager
      .getByLabel('Import diagram JSON', { exact: true })
      .setInputFiles({
        name: 'pending.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(varitoneCircuit())),
      });
    await expect(page.locator('html')).toHaveAttribute(
      'data-import-pending',
      'true',
    );
    await manager
      .getByRole('button', { name: 'Close dialog', exact: true })
      .click();
    if (shouldEdit) {
      await selectPart(page, 'volume');
      await controls(page)
        .getByRole('slider', { name: 'Master volume', exact: true })
        .fill('4');
    }
    const saved = await savedText(page);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          window.dispatchEvent(new Event('release-import'));
          // Drain the File.text continuation and React commit, not a guessed read delay.
          window.setTimeout(resolve, 0);
        }),
    );
    await expect(page.getByTestId('output-level')).toHaveText(
      shouldEdit ? '40%' : '100%',
    );
    await expect(page.getByTestId('part-varitone')).toHaveCount(0);
    expect(await savedText(page)).toBe(saved);
    if (shouldEdit) {
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      expect(await savedCircuit(page)).toEqual(presetCircuit());
    }
    await expect(
      page.getByRole('button', { name: 'Undo', exact: true }),
    ).toBeDisabled();
  }
});

for (const failure of ['getter', 'setter'] as const)
  test(`storage ${failure} failure keeps theme and circuit controls usable with a visible warning`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((failure) => {
      if (failure === 'getter') {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          get() {
            throw new Error('Synthetic storage access denied');
          },
        });
      } else {
        Storage.prototype.setItem = function () {
          throw new Error('Synthetic storage quota exceeded');
        };
      }
    }, failure);
    await page.goto('/');
    await expect(page.getByTestId('workbench-ui')).toHaveAttribute(
      'data-theme',
      'light',
    );
    await page
      .getByRole('combobox', { name: 'Theme', exact: true })
      .selectOption('dark');
    await expect(page.getByTestId('workbench-ui')).toHaveAttribute(
      'data-theme',
      'dark',
    );
    await expect(page.getByTestId('workbench-status')).toContainText(
      /storage|could not|unavailable|cannot|couldn't/i,
    );
    await selectPart(page, 'volume');
    await controls(page)
      .getByRole('slider', { name: 'Master volume', exact: true })
      .fill('5');
    await controls(page)
      .getByRole('button', { name: 'Close part controls', exact: true })
      .click();
    await expect(page.getByTestId('output-level')).toHaveText('50%');
    await expect(page.getByTestId('workbench-status')).toContainText(
      /storage|could not|unavailable|cannot|couldn't/i,
    );
    expect(errors).toEqual([]);
  });

test('a restored broken ground is explained in compact status with all panels closed', async ({
  page,
}) => {
  const circuit = presetCircuit();
  circuit.wires = circuit.wires.filter(
    (wire) => !(wire.from === 'ground:common' && wire.to === 'jack:sleeve'),
  );
  const text = await seed(page, circuit);
  await page.goto('/');
  await expect(controls(page)).not.toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('workbench-status')).toContainText(
    /ground|return|unavailable|unestimated/i,
  );
  await expectInsideViewport(page, page.getByTestId('workbench-status'));
  expect(await savedText(page)).toBe(text);
});

test('editor and file flags gate manager actions without removing library exploration', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:4179');
  await expect(page.getByTestId('workbench-ui')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Edit circuit', exact: true }),
  ).toHaveCount(0);
  let manager = await openManager(page);
  for (const name of ['New circuit', 'Import JSON'])
    await expect(
      manager.getByRole('button', { name, exact: true }),
    ).toHaveCount(0);
  await expect(
    manager.getByLabel('Diagram title', { exact: true }),
  ).toHaveCount(0);
  const downloadEvent = page.waitForEvent('download');
  await manager
    .getByRole('button', { name: 'Export JSON', exact: true })
    .click();
  expect(
    JSON.parse(await readFile((await (await downloadEvent).path())!, 'utf8')),
  ).toEqual(presetCircuit());
  await manager
    .getByLabel('Library', { exact: true })
    .selectOption('split-humbuckers');
  await manager
    .getByRole('button', { name: 'Load example', exact: true })
    .click();
  await expect(manager).not.toBeVisible();
  await selectPart(page, 'volume');
  await controls(page)
    .getByRole('button', { name: 'Pulled', exact: true })
    .click();
  await expect(page.locator('[data-coil][data-active="true"]')).toHaveCount(2);
  await page.goto('http://127.0.0.1:4181');
  await page.getByRole('button', { name: 'Edit circuit', exact: true }).click();
  manager = await openManager(page);
  for (const name of ['Import JSON', 'Export JSON', 'Save attribution'])
    await expect(
      manager.getByRole('button', { name, exact: true }),
    ).toHaveCount(0);
  for (const name of [
    'Diagram title',
    'Creator',
    'Source URL',
    'Permission / license',
  ])
    await expect(manager.getByLabel(name, { exact: true })).toHaveCount(0);
  await manager
    .getByLabel('Library', { exact: true })
    .selectOption('tele-four-way');
  await manager
    .getByRole('button', { name: 'Load example', exact: true })
    .click();
  await expect(manager).not.toBeVisible();
  expect(await savedCircuit(page)).toEqual(fourWayTeleCircuit());
});

test('extended-authoring flag hides new choices but saved extended controls remain operable', async ({
  page,
}) => {
  const circuit = splitHumbuckerCircuit();
  circuit.parts.find((part) => part.id === 'volume')!.isPulled = true;
  const text = await seed(page, circuit);
  await page.goto('http://127.0.0.1:4182');
  await expect(page.locator('[data-coil][data-active="true"]')).toHaveCount(2);
  expect(await savedText(page)).toBe(text);
  const manager = await openManager(page);
  await expect(manager.getByLabel('Library', { exact: true })).toHaveCount(0);
  await manager
    .getByRole('button', { name: 'Close dialog', exact: true })
    .click();
  await selectPart(page, 'volume');
  await expect(
    controls(page).getByRole('button', { name: 'Pulled', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await controls(page)
    .getByRole('button', { name: 'Pushed', exact: true })
    .click();
  await controls(page)
    .getByRole('slider', { name: 'Split / master volume', exact: true })
    .fill('6');
  await expect(page.getByTestId('output-level')).toHaveText('60%');
  await expect(page.locator('[data-coil][data-active="true"]')).toHaveCount(4);
  await page.getByRole('button', { name: 'Edit circuit', exact: true }).click();
  await selectPart(page, 'neck');
  await expect(
    controls(page).getByLabel('Pickup appearance', { exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Add part', exact: true }).click();
  const palette = page.getByRole('dialog', { name: 'Add part', exact: true });
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
      palette.getByRole('button', { name: `＋ ${name}`, exact: true }),
    ).toHaveCount(0);
  await expect(
    palette.getByRole('button', { name: '＋ Single coil', exact: true }),
  ).toBeVisible();
});

for (const theme of ['light', 'dark'])
  test(`mobile ${theme} keeps the diagram large and contextual controls and dialogs within the viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      ({ key, theme }) => localStorage.setItem(key, theme),
      { key: themeKey, theme },
    );
    await page.goto('/');
    await expect(page.getByTestId('workbench-ui')).toHaveAttribute(
      'data-theme',
      theme,
    );
    const canvas = page.getByTestId('workbench-canvas');
    await expectInsideViewport(page, canvas);
    expect((await canvas.boundingBox())!.height).toBeGreaterThanOrEqual(
      844 * 0.6,
    );
    const noOverflow = async () =>
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(390);
    await noOverflow();
    for (const name of ['Open diagram', 'Edit circuit', 'More options'])
      await expectInsideViewport(
        page,
        page.getByRole('button', { name, exact: true }),
      );
    await expectInsideViewport(page, page.getByTestId('workbench-status'));
    await selectPart(page, 'volume');
    await expectInsideViewport(page, controls(page));
    await expectInsideViewport(
      page,
      controls(page).getByRole('button', {
        name: 'Close part controls',
        exact: true,
      }),
    );
    await controls(page)
      .getByRole('slider', { name: 'Master volume', exact: true })
      .fill('5');
    await expect(page.getByTestId('output-level')).toHaveText('50%');
    await noOverflow();
    const saved = await savedText(page);
    await page
      .getByRole('button', { name: 'More options', exact: true })
      .click();
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    const help = page.getByRole('dialog', { name: 'Help', exact: true });
    await expectInsideViewport(page, help);
    await expectInsideViewport(
      page,
      help.getByRole('button', { name: 'Close dialog', exact: true }),
    );
    await page.keyboard.press('Escape');
    await expect(help).not.toBeVisible();
    await expect(controls(page)).toBeVisible();
    expect(await savedText(page)).toBe(saved);
    await controls(page)
      .getByRole('button', { name: 'Close part controls', exact: true })
      .click();
    const manager = await openManager(page);
    await expectInsideViewport(page, manager);
    await expectInsideViewport(
      page,
      manager.getByRole('button', { name: 'Close dialog', exact: true }),
    );
    await expect(
      manager.getByRole('button', { name: 'Import JSON', exact: true }),
    ).toBeVisible();
    await noOverflow();
    await page.keyboard.press('Escape');
    await expect(manager).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Open diagram', exact: true }),
    ).toBeFocused();
    expect(await savedText(page)).toBe(saved);
  });

test('mobile More menu keeps every action reachable in Edit and Explore in both themes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const more = page.getByRole('button', { name: 'More options', exact: true });
  const menu = page.locator('.bench-menu');
  for (const theme of ['light', 'dark']) {
    await page
      .getByRole('combobox', { name: 'Theme', exact: true })
      .selectOption(theme);
    for (const mode of ['edit', 'explore']) {
      await page
        .getByRole('button', {
          name: mode === 'edit' ? 'Edit circuit' : 'Finish editing',
          exact: true,
        })
        .click();
      await expect(page.getByTestId('workbench-ui')).toHaveAttribute(
        'data-mode',
        mode,
      );
      await more.click();
      await expectInsideViewport(page, menu);
      for (const name of ['Help', 'Diagram details'])
        await expectInsideViewport(
          page,
          menu.getByRole('button', { name, exact: true }),
        );
      const labels = menu.getByRole('checkbox', {
        name: 'Show wiring labels',
        exact: true,
      });
      await expectInsideViewport(page, labels);
      await expectInsideViewport(
        page,
        menu.getByText('Show wiring labels', { exact: true }),
      );
      const wereLabelsChecked = await labels.isChecked();
      await labels.setChecked(!wereLabelsChecked);
      expect(await labels.isChecked()).toBe(!wereLabelsChecked);
      await labels.setChecked(wereLabelsChecked);
      await menu
        .getByRole('button', { name: 'Diagram details', exact: true })
        .click();
      const details = page.getByRole('dialog', {
        name: 'Diagram details',
        exact: true,
      });
      await expect(details).toBeVisible();
      await details
        .getByRole('button', { name: 'Close dialog', exact: true })
        .click();
      await expect(details).not.toBeVisible();
      await more.click();
      await menu.getByRole('button', { name: 'Help', exact: true }).click();
      const help = page.getByRole('dialog', { name: 'Help', exact: true });
      await expect(help).toBeVisible();
      await help
        .getByRole('button', { name: 'Close dialog', exact: true })
        .click();
      await expect(help).not.toBeVisible();
      await expect(more).toBeFocused();
    }
  }
});

test('Escape closes Help before clearing a pinned Explore trace from the More trigger', async ({
  page,
}) => {
  const circuit = presetCircuit();
  circuit.metadata.title = 'Synthetic pinned trace';
  circuit.parts.find((part) => part.id === 'volume')!.value = 6;
  const saved = await seed(page, circuit);
  await page.goto('/');
  const status = page.getByTestId('workbench-status');
  await expect(status).toBeVisible();
  const guidance = status.locator('.bench-guidance');
  const normalGuidance = await guidance.textContent();
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await expect(undo).toBeDisabled();
  const wire = page.locator('[data-wire-id="wire-0"]');
  await wire.focus();
  await page.keyboard.press('Enter');
  await expect(wire).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.trace-terminal-ring')).toHaveCount(2);
  const more = page.getByRole('button', { name: 'More options', exact: true });
  await more.click();
  await page
    .locator('.bench-menu')
    .getByRole('button', { name: 'Help', exact: true })
    .click();
  const help = page.getByRole('dialog', { name: 'Help', exact: true });
  await expect(help).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(help).not.toBeVisible();
  await expect(more).toBeFocused();
  await expect(wire).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.trace-terminal-ring')).toHaveCount(2);
  expect(await savedText(page)).toBe(saved);
  await expect(undo).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(more).toBeFocused();
  await expect(wire).toHaveAttribute('aria-pressed', 'false');
  await expect(
    page.locator('.trace-terminal-ring, .selected-wire, .dimmed-wire'),
  ).toHaveCount(0);
  await expect(guidance).toHaveText(normalGuidance!);
  await expect(status.getByTestId('output-level')).toHaveText('60%');
  expect(await savedText(page)).toBe(saved);
  await expect(undo).toBeDisabled();
});
