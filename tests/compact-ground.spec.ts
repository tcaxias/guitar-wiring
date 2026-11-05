import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { analyze } from '../src/circuit/analyze';
import {
  createPart,
  presetCircuit,
  terminalId,
  terminalsFor,
  type Circuit,
} from '../src/circuit/model';
import {
  fourWayTeleCircuit,
  splitHumbuckerCircuit,
  varitoneCircuit,
} from '../src/circuit/library';
import { groundWiringKey } from '../src/groundWiring';
import { storageKey } from '../src/storage';
import { wirePath, wireRoutes } from '../src/components/wireRouting';
import { wireDrawings } from '../src/components/wireGeometry';
import { groundPresentation } from '../src/components/groundPresentation';

test.use({
  baseURL: 'http://127.0.0.1:4178',
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});

async function seed(page: Page, circuit: Circuit) {
  await page.addInitScript(
    ({ circuit, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(circuit));
    },
    { circuit, key: storageKey },
  );
}
const saved = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), storageKey);
async function toggle(page: Page, isShown: boolean) {
  if (
    !(await page.getByLabel('Show ground wiring', { exact: true }).isVisible())
  )
    await page.getByRole('button', { name: 'More options' }).click();
  await page
    .getByLabel('Show ground wiring', { exact: true })
    .setChecked(isShown);
  await page.getByRole('button', { name: 'More options' }).click();
}
async function select(page: Page, id: string) {
  await page.getByTestId(`part-${id}`).locator('.part-body').focus();
  await page.keyboard.press('Enter');
}
async function pin(page: Page, id: string) {
  const circle = page.locator(`[data-terminal-id="${id}"] > circle`).first();
  const point = await circle.evaluate((circle) => {
    const element = circle as SVGCircleElement;
    const point = new DOMPoint(
      element.cx.baseVal.value,
      element.cy.baseVal.value,
    ).matrixTransform(element.getScreenCTM()!);
    return {
      x: point.x,
      y: point.y,
      reachable:
        document.elementFromPoint(point.x, point.y)?.closest('.terminal') ===
        element.parentElement,
    };
  });
  expect(point.reachable).toBe(true);
  await page.mouse.click(point.x, point.y);
}
async function expectCompact(page: Page, circuit: Circuit) {
  const view = groundPresentation(circuit);
  const parts = circuit.parts.filter(
    (part) => part.kind !== 'ground' || !view.hiddenParts.has(part.id),
  );
  const terminals = parts.flatMap((part) =>
    terminalsFor(part).map((terminal) => terminalId(part, terminal.name)),
  );
  const wireIds = circuit.wires
    .filter((wire) => !view.hiddenWires.has(wire.id))
    .map((wire) => wire.id)
    .sort();
  expect(
    await page
      .locator('.wire')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-wire-id')).sort(),
      ),
  ).toEqual(wireIds);
  expect(
    await page
      .locator('[data-ground-terminal]')
      .evaluateAll((elements) =>
        elements
          .map((element) => element.getAttribute('data-ground-terminal'))
          .sort(),
      ),
  ).toEqual(
    [...view.groundedTerminals].filter((id) => terminals.includes(id)).sort(),
  );
  await expect(page.locator('.part-body')).toHaveCount(parts.length);
  for (const id of view.hiddenWires)
    await expect(
      page.locator(`[data-wire-id="${id}"], [data-trace-id="${id}"]`),
    ).toHaveCount(0);
  for (const part of circuit.parts.filter((part) => part.kind === 'ground'))
    await expect(page.getByTestId(`part-${part.id}`)).toHaveCount(
      view.hiddenParts.has(part.id) ? 0 : 1,
    );
}

for (const theme of ['light', 'dark'])
  test(`fresh compact ${theme} marks every real ground pin, expands to grey, preserves routes/data/history and reloads preference`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByLabel('Theme', { exact: true }).selectOption(theme);
    const circuit = presetCircuit();
    await expectCompact(page, circuit);
    const compactPaths = await page
      .locator('.wire-hit')
      .evaluateAll((elements) =>
        Object.fromEntries(
          elements.map((element) => [
            element.parentElement!.getAttribute('data-wire-id'),
            element.getAttribute('d'),
          ]),
        ),
      );
    await page.screenshot({
      path: `artifacts/compact-ground-default-${theme}.png`,
    });
    const original = await saved(page);
    await page.evaluate((key) => {
      document.documentElement.dataset.circuitWrites = '0';
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (name === key)
          document.documentElement.dataset.circuitWrites = String(
            Number(document.documentElement.dataset.circuitWrites) + 1,
          );
        return setItem.call(this, name, value);
      };
    }, storageKey);
    await toggle(page, true);
    await expect(page.getByTestId('ground-symbol-ground')).toBeVisible();
    expect(
      await page
        .locator('.wire')
        .evaluateAll((elements) =>
          elements
            .map((element) => element.getAttribute('data-wire-id'))
            .sort(),
        ),
    ).toEqual(circuit.wires.map((wire) => wire.id).sort());
    for (const [id, path] of Object.entries(compactPaths))
      await expect(
        page.locator(`[data-wire-id="${id}"] .wire-hit`),
      ).toHaveAttribute('d', path!);
    await expect(page.locator('.terminal-ground')).toHaveCount(0);
    const estimate = analyze(circuit);
    for (const id of estimate.groundWires) {
      const colors = await page
        .locator(`[data-wire-id="${id}"] .wire-visuals .wire-base`)
        .evaluateAll((paths) =>
          paths.map((path) => getComputedStyle(path).stroke),
        );
      expect(colors.length).toBeGreaterThan(0);
      const groundColors =
        theme === 'light'
          ? ['rgb(110, 107, 94)', 'rgb(59, 46, 42)']
          : ['rgb(92, 103, 115)', 'rgb(20, 25, 31)'];
      for (const color of colors) {
        expect(groundColors).toContain(color);
      }
    }
    await page.screenshot({
      path: `artifacts/compact-ground-expanded-${theme}.png`,
    });
    await expect(page.locator('html')).toHaveAttribute(
      'data-circuit-writes',
      '0',
    );
    expect(await saved(page)).toBe(original);
    await expect(
      page.getByRole('button', { name: 'Undo', exact: true }),
    ).toBeDisabled();
    await page.reload();
    await expect(page.getByTestId('part-ground')).toBeVisible();
    await select(page, 'volume');
    await page.getByRole('slider').fill('5');
    await page.getByRole('button', { name: 'Close part controls' }).click();
    const changed = await saved(page);
    await toggle(page, false);
    await toggle(page, true);
    expect(await saved(page)).toBe(changed);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByTestId('output-level')).toHaveText('100%');
    await expect(
      page.getByRole('button', { name: 'Undo', exact: true }),
    ).toBeDisabled();
    const exports: string[] = [];
    for (const isShown of [false, true]) {
      await toggle(page, isShown);
      await page.getByRole('button', { name: 'Open diagram' }).click();
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      exports.push(await readFile((await (await download).path())!, 'utf8'));
      await page.getByRole('button', { name: 'Close dialog' }).click();
    }
    expect(exports[0]).toBe(exports[1]);
    expect(JSON.parse(exports[0]!)).toEqual(circuit);
    await toggle(page, false);
    await page.reload();
    await expectCompact(page, circuit);
  });

test('hidden wires cannot cut gaps, become nearest-path ghosts, or receive keyboard traces', async ({
  page,
}) => {
  const circuit = presetCircuit();
  await page.goto('/');
  const estimate = analyze(circuit);
  const routes = wireRoutes(circuit, [], { clear: true });
  const visible = circuit.wires.filter(
    (wire) => !estimate.groundWires.includes(wire.id),
  );
  const drawings = wireDrawings({ ...circuit, wires: visible }, routes);
  for (const wire of visible) {
    const group = page.locator(`[data-wire-id="${wire.id}"]`);
    await expect(group.locator('.wire-hit')).toHaveAttribute(
      'd',
      wirePath(routes.get(wire.id)!),
    );
    for (const path of await group.locator('.wire-visuals path').all())
      await expect(path).toHaveAttribute('d', drawings.get(wire.id)!.path);
    await group.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.wire-trace-overlay')).toHaveAttribute(
      'data-trace-id',
      wire.id,
    );
  }
  await page.keyboard.press('Escape');
  let samples = 0;
  for (const id of estimate.groundWires) {
    const points = routes.get(id)!;
    for (let index = 1; index < points.length; index++) {
      const a = points[index - 1]!,
        b = points[index]!;
      const target = await page.locator('svg.circuit-board').evaluate(
        (element, point) => {
          const screen = new DOMPoint(point.x, point.y).matrixTransform(
            (element as SVGSVGElement).getScreenCTM()!,
          );
          const hit = document.elementFromPoint(screen.x, screen.y);
          return {
            x: screen.x,
            y: screen.y,
            onCanvas:
              (hit?.tagName === 'rect' && hit.parentElement === element) ||
              !!hit?.closest('.wire'),
          };
        },
        { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      );
      if (!target.onCanvas) continue;
      await page.mouse.click(target.x, target.y);
      const trace = await page
        .locator('.wire-trace-overlay')
        .evaluateAll(
          (elements) => elements[0]?.getAttribute('data-trace-id') ?? null,
        );
      expect(estimate.groundWires).not.toContain(trace);
      samples++;
    }
  }
  expect(samples).toBeGreaterThan(5);
});

test('collapsing clears hidden wire/part selection and pending ground but retains visible pending terminals', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit circuit' }).click();
  const original = await saved(page);
  await toggle(page, true);
  const id = analyze(presetCircuit()).groundWires[0]!;
  await page.locator(`[data-wire-id="${id}"]`).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Remove selected wire' }),
  ).toBeVisible();
  await toggle(page, false);
  await expect(
    page.locator('.bench-inspector, .wire-trace-overlay, .trace-terminal-ring'),
  ).toHaveCount(0);
  await toggle(page, true);
  await select(page, 'ground');
  await toggle(page, false);
  await expect(page.locator('.bench-inspector')).toHaveCount(0);
  await toggle(page, true);
  await pin(page, 'ground:common');
  await toggle(page, false);
  await expect(page.locator('.pending-terminal')).toHaveCount(0);
  await toggle(page, true);
  await pin(page, 'volume:ground');
  await toggle(page, false);
  await expect(page.locator('.pending-terminal')).toHaveAttribute(
    'data-terminal-id',
    'volume:ground',
  );
  expect(await saved(page)).toBe(original);
  await expect(
    page.getByRole('button', { name: 'Undo', exact: true }),
  ).toBeDisabled();
});

test('keyboard collapse while hovering ground does not mask a remaining wire keyboard trace', async ({
  page,
}) => {
  await page.goto('/');
  await toggle(page, true);
  const groundIds = analyze(presetCircuit()).groundWires;
  const target = await page
    .locator('svg.circuit-board')
    .evaluate((element, ids) => {
      for (const id of ids) {
        const wire = element.querySelector<SVGGElement>(
          `[data-wire-id="${id}"]`,
        )!;
        const path = wire.querySelector<SVGPathElement>('.wire-hit')!;
        for (
          let offset = 20;
          offset < path.getTotalLength() - 20;
          offset += 12
        ) {
          const point = path.getPointAtLength(offset);
          const screen = point.matrixTransform(path.getScreenCTM()!);
          if (
            document.elementFromPoint(screen.x, screen.y)?.closest('.wire') !==
            wire
          )
            continue;
          if (
            ![
              ...wire.querySelectorAll<SVGPathElement>('.wire-visuals path'),
            ].some((path) => path.isPointInStroke(point))
          )
            continue;
          return { id, x: screen.x, y: screen.y };
        }
      }
      throw new Error('No reachable ground trace');
    }, groundIds);
  await page.mouse.move(target.x, target.y);
  await expect(page.locator('.wire-trace-overlay')).toHaveAttribute(
    'data-trace-id',
    target.id,
  );
  // Keep the pointer stationary: removing a hovered SVG group need not fire leave.
  await page.getByRole('button', { name: 'More options' }).focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Show ground wiring', { exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.locator(`[data-wire-id="${target.id}"]`)).toHaveCount(0);
  const wire = page.locator('.wire').first();
  const id = await wire.getAttribute('data-wire-id');
  await wire.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.wire-trace-overlay')).toHaveAttribute(
    'data-trace-id',
    id!,
  );
  await expect(wire).toHaveAttribute('aria-pressed', 'true');
});

for (const theme of ['light', 'dark'])
  test(`split and blade banks keep exact reachable pin centers and connectivity markers in ${theme}`, async ({
    page,
  }) => {
    const circuit = splitHumbuckerCircuit();
    await seed(page, circuit);
    await page.goto('/');
    await page.getByLabel('Theme', { exact: true }).selectOption(theme);
    await select(page, 'volume');
    for (const isPulled of [true, false, true]) {
      await page
        .getByRole('button', {
          name: isPulled ? 'Pulled' : 'Pushed',
          exact: true,
        })
        .click();
      circuit.parts.find((part) => part.id === 'volume')!.isPulled = isPulled;
      await expectCompact(page, circuit);
      await expect(page.locator('[data-coil][data-active="true"]')).toHaveCount(
        isPulled ? 2 : 4,
      );
    }
    await page.getByRole('button', { name: 'Close part controls' }).click();
    await page.screenshot({
      path: `artifacts/compact-ground-split-${theme}.png`,
    });
    await page.getByRole('button', { name: 'Edit circuit' }).click();
    for (const part of circuit.parts.filter((part) =>
      ['neck', 'bridge', 'selector', 'volume'].includes(part.id),
    )) {
      await select(page, part.id);
      for (const terminal of terminalsFor(part)) {
        await pin(page, terminalId(part, terminal.name));
        await expect(page.locator('.pending-terminal')).toHaveAttribute(
          'data-terminal-id',
          terminalId(part, terminal.name),
        );
        await page.getByRole('button', { name: 'Cancel connection' }).click();
      }
    }
    const markers = page.locator('.terminal-ground');
    expect(await markers.count()).toBe(11);
    for (const marker of await markers.all()) {
      expect(
        await marker.evaluate(
          (element) => getComputedStyle(element).pointerEvents,
        ),
      ).toBe('none');
      const size = await marker.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const scale = element.closest('svg')!.getScreenCTM()!.a;
        return { width: bounds.width / scale, height: bounds.height / scale };
      });
      expect(size.width).toBeLessThanOrEqual(10);
      expect(size.height).toBeLessThanOrEqual(10);
      const overlapsLabel = await marker.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return [
          ...element
            .closest('[data-testid]')!
            .querySelectorAll('.terminal-label'),
        ].some((label) => {
          const other = label.getBoundingClientRect();
          return (
            bounds.left < other.right &&
            bounds.right > other.left &&
            bounds.top < other.bottom &&
            bounds.bottom > other.top
          );
        });
      });
      expect(overlapsLabel).toBe(false);
    }
    await page.getByRole('button', { name: 'Close part controls' }).click();
    await page.screenshot({
      path: `artifacts/compact-ground-split-edit-${theme}.png`,
    });
    await page
      .getByTestId('part-neck')
      .screenshot({ path: `artifacts/compact-ground-markers-${theme}.png` });
  });

test('four-way physical RETURN stays visible in all positions while electrical ground changes', async ({
  page,
}) => {
  const circuit = fourWayTeleCircuit();
  await seed(page, circuit);
  await page.goto('/');
  await select(page, 'selector');
  for (const value of [1, 2, 3, 4, 1, 4]) {
    await page
      .getByRole('button', { name: `Position ${value}`, exact: true })
      .click();
    circuit.parts.find((part) => part.id === 'selector')!.value = value;
    await expectCompact(page, circuit);
    await expect(page.locator('[data-to="neck:return"]')).toBeVisible();
    await expect(
      page.locator(
        '[data-ground-terminal="neck:return"], [data-ground-terminal="selector:b-common"]',
      ),
    ).toHaveCount(0);
    if (value === 4) {
      await expect(page.locator('[data-to="neck:return"]')).toBeVisible();
      await expect(
        page.locator('[data-ground-terminal="neck:return"]'),
      ).toHaveCount(0);
      await expect(page.getByTestId('coil-topology')).toHaveText(
        'Series pickups',
      );
    }
  }
  await page.getByRole('button', { name: 'Close part controls' }).click();
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('Theme', { exact: true }).selectOption(theme);
    await page.screenshot({
      path: `artifacts/compact-ground-four-way-${theme}.png`,
    });
  }
});

for (const theme of ['light', 'dark'])
  test(`four-way return keeps its route, blue role and editing in ${theme}`, async ({
    page,
  }) => {
    const circuit = fourWayTeleCircuit();
    await seed(page, circuit);
    await page.goto('/');
    await page.getByLabel('Theme', { exact: true }).selectOption(theme);
    const lead = page.locator('[data-wire-id="wire-3"]');
    const originalPath = await lead.locator('.wire-hit').getAttribute('d');
    for (const value of [1, 2, 3, 4, 1]) {
      await select(page, 'selector');
      await page
        .getByRole('button', { name: `Position ${value}`, exact: true })
        .click();
      await page.getByRole('button', { name: 'Close part controls' }).click();
      const stored = await saved(page);
      for (const isShown of [false, true]) {
        await toggle(page, isShown);
        await expect(lead).toHaveAttribute('data-from', 'selector:b-common');
        await expect(lead).toHaveAttribute('data-to', 'neck:return');
        await expect(lead.locator('.wire-hit')).toHaveAttribute(
          'd',
          originalPath!,
        );
        await expect(
          page.locator(
            '[data-ground-terminal="neck:return"], [data-ground-terminal="selector:b-common"]',
          ),
        ).toHaveCount(0);
        const colors = await lead
          .locator('.wire-visuals path')
          .evaluateAll((paths) =>
            paths.map((path) => ({
              color: getComputedStyle(path).stroke,
              dash: getComputedStyle(path).strokeDasharray,
            })),
          );
        expect(colors.length).toBeGreaterThan(0);
        for (const { color, dash } of colors) {
          expect(color).toBe(
            theme === 'light' ? 'rgb(230, 159, 103)' : 'rgb(255, 180, 84)',
          );
          expect(['none', '4px, 13px']).toContain(dash);
        }
        if (!isShown) {
          await expect(
            page.locator('[data-ground-terminal="neck:shield"]'),
          ).toHaveCount(1);
          const color = await page
            .locator('[data-ground-terminal="neck:shield"] path')
            .evaluate((path) => getComputedStyle(path).stroke);
          expect(color).toBe(
            theme === 'light' ? 'rgb(110, 107, 94)' : 'rgb(92, 103, 115)',
          );
        }
        expect(await saved(page)).toBe(stored);
      }
    }
    await page.getByRole('button', { name: 'Edit circuit' }).click();
    await lead.focus();
    await page.keyboard.press('Enter');
    await toggle(page, false);
    await expect(lead).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.wire-trace-overlay')).toHaveAttribute(
      'data-trace-id',
      'wire-3',
    );
    await expect(page.locator('.trace-terminal-ring')).toHaveCount(2);
    await expect(page.getByTestId('workbench-status')).toContainText(
      '4-way blade · BC ↔ Neck pickup · RETURN',
    );
    await expect(
      page.getByRole('button', { name: 'Remove selected wire' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Remove selected wire' }).click();
    await expect(lead).toHaveCount(0);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(lead).toBeVisible();
    await pin(page, 'neck:return');
    await toggle(page, true);
    await toggle(page, false);
    await expect(page.locator('.pending-terminal')).toHaveAttribute(
      'data-terminal-id',
      'neck:return',
    );
  });

for (const theme of ['light', 'dark'])
  test(`split links stay visible and colored, not permanent ground, in ${theme}`, async ({
    page,
  }) => {
    const circuit = splitHumbuckerCircuit();
    await seed(page, circuit);
    await page.goto('/');
    await page.getByLabel('Theme', { exact: true }).selectOption(theme);
    for (const isPulled of [false, true, false]) {
      await select(page, 'volume');
      await page
        .getByRole('button', {
          name: isPulled ? 'Pulled' : 'Pushed',
          exact: true,
        })
        .click();
      await page.getByRole('button', { name: 'Close part controls' }).click();
      for (const isShown of [false, true]) {
        await toggle(page, isShown);
        await expect(
          page.locator(
            '[data-ground-terminal="neck:a-finish"], [data-ground-terminal="neck:b-start"], [data-ground-terminal="volume:switch-a-common"]',
          ),
        ).toHaveCount(0);
        for (const wire of circuit.wires.filter(
          (wire) => wire.from === 'neck:a-finish',
        )) {
          const lead = page.locator(`[data-wire-id="${wire.id}"]`);
          await expect(lead).toBeVisible();
          const colors = await lead
            .locator('.wire-visuals path')
            .evaluateAll((paths) =>
              paths.map((path) => getComputedStyle(path).stroke),
            );
          for (const color of colors)
            expect(new Set(color.match(/\d+/g)).size).toBeGreaterThan(1);
          await expect(lead.locator('[stroke-dasharray="7 5"]')).toHaveCount(0);
        }
      }
    }
  });

test('multiple connected junctions hide, floating junctions stay visible and remain editable through sleeve', async ({
  page,
}) => {
  const circuit = presetCircuit();
  circuit.parts.push(
    { ...createPart('ground', 'second'), x: 700, y: 430 },
    { ...createPart('ground', 'floating'), x: 430, y: 430 },
  );
  circuit.wires.push({
    id: 'second-return',
    from: 'second:common',
    to: 'jack:sleeve',
  });
  await seed(page, circuit);
  await page.goto('/');
  await expectCompact(page, circuit);
  await expect(page.getByTestId('part-floating')).toContainText('FLOATING');
  await page.screenshot({ path: 'artifacts/compact-ground-floating.png' });
  await page.getByRole('button', { name: 'Edit circuit' }).click();
  await select(page, 'floating');
  await pin(page, 'floating:common');
  await pin(page, 'jack:sleeve');
  await expect(page.getByTestId('part-floating')).toHaveCount(0);
  await expect(page.locator('.bench-inspector, .pending-terminal')).toHaveCount(
    0,
  );
  await expect(page.getByTestId('workbench-status')).toContainText(
    'Show ground wiring',
  );
  await toggle(page, true);
  await expect(page.getByTestId('part-floating')).toBeVisible();
  await expect(page.locator('[data-from="floating:common"]')).toHaveCount(1);
  await toggle(page, false);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expectCompact(page, circuit);
});

test('a switch-routed ground junction keeps its selection and pending terminal on collapse', async ({
  page,
}) => {
  const circuit = fourWayTeleCircuit();
  circuit.parts.push({ ...createPart('ground', 'switched'), x: 450, y: 450 });
  circuit.wires.push({
    id: 'switched-ground',
    from: 'switched:common',
    to: 'selector:b-common',
  });
  await seed(page, circuit);
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit circuit' }).click();
  await toggle(page, true);
  await select(page, 'switched');
  await toggle(page, false);
  await expect(page.getByTestId('part-switched')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Remove selected part' }),
  ).toBeVisible();
  await pin(page, 'switched:common');
  await toggle(page, true);
  await toggle(page, false);
  await expect(page.locator('.pending-terminal')).toHaveAttribute(
    'data-terminal-id',
    'switched:common',
  );
  await expect(page.locator('[data-wire-id="switched-ground"]')).toBeVisible();
});

test('shorted output interconnect stays visible, grey and traceable in compact view', async ({
  page,
}) => {
  const circuit = presetCircuit();
  circuit.wires.push({ id: 'short', from: 'jack:tip', to: 'jack:sleeve' });
  await seed(page, circuit);
  await page.goto('/');
  const wire = page.locator('[data-wire-id="wire-3"]');
  await expect(wire).toBeVisible();
  await wire.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.wire-trace-overlay')).toHaveAttribute(
    'data-trace-id',
    'wire-3',
  );
  const colors = await page
    .locator(
      '[data-wire-id="wire-3"] .wire-visuals .wire-base, .wire-trace-overlay path:last-child, .trace-terminal-ring',
    )
    .evaluateAll((paths) => paths.map((path) => getComputedStyle(path).stroke));
  for (const color of colors) expect(color).toBe('rgb(110, 107, 94)');
  await expect(page.getByTestId('workbench-status')).toContainText(
    'Output shorted to ground.',
  );
});

test('four-way return uses the same blue role with old routing, full ground and sidebar layouts', async ({
  page,
}) => {
  await seed(page, fourWayTeleCircuit());
  for (const port of [4184, 4186, 4173]) {
    await page.goto(`http://127.0.0.1:${port}`);
    const lead = page.locator('[data-wire-id="wire-3"]');
    await expect(lead).toBeVisible();
    const color = await lead
      .locator('.wire-visuals path')
      .last()
      .evaluate((path) => getComputedStyle(path).stroke);
    expect(new Set(color.match(/\d+/g)).size).toBe(3);
    await expect(
      page.locator('[data-ground-terminal="neck:return"]'),
    ).toHaveCount(0);
    await expect(page.locator('.wire')).toHaveCount(port === 4184 ? 9 : 18);
  }
});

test('visible RETURN can be connected to visible sleeve without showing ground wires', async ({
  page,
}) => {
  const circuit = presetCircuit();
  circuit.wires = circuit.wires.filter((wire) => wire.from !== 'neck:return');
  await seed(page, circuit);
  await page.goto('/');
  await expect(
    page.locator('[data-ground-terminal="neck:return"]'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit circuit' }).click();
  await pin(page, 'neck:return');
  await pin(page, 'jack:sleeve');
  await expect(
    page.locator('[data-ground-terminal="neck:return"]'),
  ).toHaveCount(1);
  await expect(page.locator('[data-from="neck:return"]')).toHaveCount(0);
  await toggle(page, true);
  await expect(
    page.locator('[data-from="neck:return"][data-to="jack:sleeve"]'),
  ).toHaveCount(1);
});

for (const condition of ['broken', 'multiple', 'short'] as const)
  test(`compact ${condition} ground retains warnings without false certainty`, async ({
    page,
  }) => {
    const circuit = presetCircuit();
    if (condition === 'broken')
      circuit.wires = circuit.wires.filter((wire) => wire.to !== 'jack:sleeve');
    if (condition === 'multiple')
      circuit.parts.push({
        ...createPart('jack', 'second-jack'),
        x: 700,
        y: 430,
      });
    if (condition === 'short')
      circuit.wires.push({ id: 'short', from: 'jack:tip', to: 'jack:sleeve' });
    await seed(page, circuit);
    await page.goto('/');
    await expectCompact(page, circuit);
    await expect(page.getByTestId('workbench-status')).toContainText(
      condition === 'short' ? 'Output shorted to ground.' : 'unavailable',
    );
    if (condition !== 'short')
      await expect(page.getByTestId('part-ground')).toContainText(
        condition === 'multiple' ? 'UNKNOWN RETURN' : 'FLOATING',
      );
  });

test('tone and LC retain readouts and body activity while only return overlays become grey or disappear', async ({
  page,
}) => {
  const circuit = varitoneCircuit();
  circuit.parts.find((part) => part.id === 'tone')!.value = 0;
  circuit.parts.find((part) => part.id === 'varitone')!.value = 6;
  await seed(page, circuit);
  await page.goto('/');
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('Theme', { exact: true }).selectOption(theme);
    for (const isShown of [false, true]) {
      await toggle(page, isShown);
      await expect(
        page.getByTestId('capacitor-halo-capacitor'),
      ).toHaveAttribute('data-level', '1');
      await expect(page.getByTestId('output-level')).toHaveText('100%');
      if (!isShown) await expectCompact(page, circuit);
      const groundIds = analyze(circuit).groundWires;
      const colors = await page
        .locator('.tone-flow, .varitone-flow')
        .evaluateAll(
          (paths, groundIds) =>
            paths.map((path) => ({
              ground: groundIds.includes(
                path.closest('.wire')!.getAttribute('data-wire-id')!,
              ),
              color: getComputedStyle(path).stroke,
            })),
          groundIds,
        );
      expect(colors.some((path) => !path.ground)).toBe(true);
      expect(colors.some((path) => path.ground)).toBe(isShown);
      for (const { ground, color } of colors) {
        if (ground) {
          // Active ground wires render --wire-ground-active, not --wire-ground.
          expect(color).toBe(
            theme === 'light' ? 'rgb(59, 46, 42)' : 'rgb(20, 25, 31)',
          );
        } else expect(new Set(color.match(/\d+/g)!).size).toBeGreaterThan(1);
      }
      await page.getByRole('button', { name: 'More options' }).click();
      await page.getByRole('button', { name: 'Diagram details' }).click();
      await expect(page.getByTestId('treble-level')).toHaveText('25%');
      await expect(page.getByTestId('tone-diversion')).toHaveText('100%');
      await expect(page.getByTestId('varitone-frequency')).toHaveText('277 Hz');
      await page.getByRole('button', { name: 'Close dialog' }).click();
    }
  }
});

for (const value of ['shown', 'hidden', 'invalid'])
  test(`loads independent ${value} preference`, async ({ page }) => {
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: groundWiringKey, value },
    );
    await page.goto('/');
    await expect(page.getByTestId('part-ground')).toHaveCount(
      value === 'shown' ? 1 : 0,
    );
    await page.getByRole('button', { name: 'More options' }).click();
    expect(
      await page.getByLabel('Show ground wiring', { exact: true }).isChecked(),
    ).toBe(value === 'shown');
  });

for (const failure of ['getter', 'setter'])
  test(`storage ${failure} failure leaves compact default and toggling usable with a status warning`, async ({
    page,
  }) => {
    await page.addInitScript((failure) => {
      if (failure === 'getter')
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new Error('Synthetic access denied');
          },
        });
      else
        Storage.prototype.setItem = () => {
          throw new Error('Synthetic quota exceeded');
        };
    }, failure);
    await page.goto('/');
    await expect(page.getByTestId('part-ground')).toHaveCount(0);
    await toggle(page, true);
    await expect(page.getByTestId('part-ground')).toBeVisible();
    await expect(page.getByTestId('workbench-status')).toContainText(
      'Ground view could not be saved',
    );
    await toggle(page, false);
    await expect(page.getByTestId('part-ground')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Undo', exact: true }),
    ).toBeDisabled();
  });

test('flag-off and original sidebar always show full grey ground without a hidden expansion control', async ({
  page,
}) => {
  for (const port of [4186, 4173]) {
    await page.goto(`http://127.0.0.1:${port}`);
    await expect(page.getByTestId('part-ground')).toBeVisible();
    await expect(page.locator('.wire')).toHaveCount(
      presetCircuit().wires.length,
    );
    await expect(page.locator('.terminal-ground')).toHaveCount(0);
    if (port === 4186)
      await page.getByRole('button', { name: 'More options' }).click();
    await expect(
      page.getByLabel('Show ground wiring', { exact: true }),
    ).toHaveCount(0);
    const id = analyze(presetCircuit()).groundWires[0]!;
    const colors = await page
      .locator(`[data-wire-id="${id}"] .wire-visuals .wire-base`)
      .evaluateAll((paths) =>
        paths.map((path) => getComputedStyle(path).stroke),
      );
    for (const color of colors) {
      expect(color).toBe('rgb(110, 107, 94)');
    }
  }
});

test('closed blade contacts without external wires do not receive permanent ground markers', async ({
  page,
}) => {
  const blade = {
    ...createPart('blade', 'selector'),
    x: 500,
    y: 140,
    value: 2,
  };
  const circuit: Circuit = {
    ...presetCircuit(),
    parts: [blade, { ...createPart('jack', 'jack'), x: 800, y: 430 }],
    wires: [
      { id: 'a-ground', from: 'selector:a-common', to: 'jack:sleeve' },
      { id: 'b-ground', from: 'selector:b-common', to: 'jack:sleeve' },
    ],
  };
  await seed(page, circuit);
  await page.goto('/');
  await expect(page.locator('.wire')).toHaveCount(0);
  for (const pole of ['a', 'b']) {
    for (const contact of ['common', '2']) {
      const id = `selector:${pole}${contact === 'common' ? '-common' : contact}`;
      await expect(page.locator(`[data-ground-terminal="${id}"]`)).toHaveCount(
        contact === 'common' ? 1 : 0,
      );
    }
    await expect(
      page.locator(`[data-ground-terminal="selector:${pole}3"]`),
    ).toHaveCount(0);
    await expect(
      page.locator(`[data-ground-terminal="selector:${pole}1"]`),
    ).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Edit circuit' }).click();
  for (const terminal of terminalsFor(blade)) {
    await pin(page, terminalId(blade, terminal.name));
    await page.getByRole('button', { name: 'Cancel connection' }).click();
  }
});

test('mobile compact Edit keeps the More toggle and ground-edit guidance reachable in both themes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit circuit' }).click();
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('Theme', { exact: true }).selectOption(theme);
    await expect(page.getByTestId('workbench-status')).toContainText(
      'Show ground wiring',
    );
    await page.getByRole('button', { name: 'More options' }).click();
    const toggle = page.getByLabel('Show ground wiring', { exact: true });
    await expect(toggle).toBeVisible();
    const bounds = (await toggle.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
    await toggle.check();
    await expect(page.getByTestId('part-ground')).toHaveCount(1);
    await toggle.uncheck();
    await expect(page.getByTestId('part-ground')).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    await page.screenshot({
      path: `artifacts/compact-ground-mobile-${theme}.png`,
    });
    await page.getByRole('button', { name: 'More options' }).click();
  }
});
