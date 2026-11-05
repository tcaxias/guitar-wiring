import { expect, test, type Page } from '@playwright/test';

test.use({ baseURL: 'http://127.0.0.1:4178', reducedMotion: 'reduce' });

test.beforeEach(async ({ page }) => {
  // Preserve the full-wire regression workload; compact mode has its own suite.
  await page.addInitScript(() =>
    localStorage.setItem('pickup-lab:ground-wiring:v1', 'shown'),
  );
});

async function load(page: Page, id: string) {
  await page.getByRole('button', { name: 'Open diagram', exact: true }).click();
  await page.getByLabel('Library', { exact: true }).selectOption(id);
  await page.getByRole('button', { name: 'Load example', exact: true }).click();
  await page.mouse.move(0, 0);
}
const paths = (page: Page) =>
  page
    .locator('.wire-hit')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('d')),
    );
const saved = (page: Page) =>
  page.evaluate(() => localStorage.getItem('pickup-lab:circuit:v2'));

async function crossing(page: Page) {
  return page.locator('.circuit-board').evaluate((element) => {
    const svg = element as SVGSVGElement;
    const wires = [...svg.querySelectorAll<SVGGElement>('.wire')];
    const visuals = [
      ...svg.querySelectorAll<SVGPathElement>('.wire-visuals path'),
    ];
    const lines = wires.map((wire) => {
      const path = wire.querySelector<SVGPathElement>('.wire-hit')!;
      const values = path
        .getAttribute('d')!
        .match(/[-+]?\d*\.?\d+/g)!
        .map(Number);
      const points = Array.from({ length: values.length / 2 }, (_, index) => ({
        x: values[index * 2]!,
        y: values[index * 2 + 1]!,
      }));
      return points.slice(1).map((b, index) => ({ a: points[index]!, b }));
    });
    const visible = (wire: SVGGElement, x: number, y: number) =>
      [...wire.querySelectorAll<SVGPathElement>('.wire-visuals path')].some(
        (path) => path.isPointInStroke(new DOMPoint(x, y)),
      );
    const screen = (x: number, y: number) => {
      const p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()!);
      return { x: p.x, y: p.y };
    };
    for (let i = 0; i < wires.length; i++)
      for (let j = i + 1; j < wires.length; j++)
        for (const a of lines[i]!)
          for (const b of lines[j]!) {
            const horizontal = a.a.y === a.b.y;
            if (horizontal === (b.a.y === b.b.y)) continue;
            const x = horizontal ? b.a.x : a.a.x;
            const y = horizontal ? a.a.y : b.a.y;
            if (
              x < Math.min(a.a.x, a.b.x) ||
              x > Math.max(a.a.x, a.b.x) ||
              y < Math.min(a.a.y, a.b.y) ||
              y > Math.max(a.a.y, a.b.y) ||
              x < Math.min(b.a.x, b.b.x) ||
              x > Math.max(b.a.x, b.b.x) ||
              y < Math.min(b.a.y, b.b.y) ||
              y > Math.max(b.a.y, b.b.y)
            )
              continue;
            if (visible(wires[i]!, x, y) || !visible(wires[j]!, x, y)) continue;
            const near = {
              x: x + (horizontal ? 7 : 0),
              y: y + (horizontal ? 0 : 7),
            };
            const gap = {
              x: x + (horizontal ? 3 : 0),
              y: y + (horizontal ? 0 : 3),
            };
            const blank = { x: x + 3, y: y + 3 };
            if (
              !visible(wires[i]!, near.x, near.y) ||
              visuals.some(
                (path) =>
                  path.isPointInStroke(new DOMPoint(gap.x, gap.y)) ||
                  path.isPointInStroke(new DOMPoint(blank.x, blank.y)),
              )
            )
              continue;
            const center = screen(x, y),
              nearby = screen(near.x, near.y);
            if (
              document
                .elementFromPoint(center.x, center.y)
                ?.closest('.wire') !== wires[j] ||
              document
                .elementFromPoint(nearby.x, nearby.y)
                ?.closest('.wire') !== wires[j]
            )
              continue;
            return {
              lower: wires[i]!.dataset.wireId!,
              upper: wires[j]!.dataset.wireId!,
              center,
              nearby,
              gap: screen(gap.x, gap.y),
              blank: screen(blank.x, blank.y),
            };
          }
    throw new Error(
      'No exposed crossing with the upper hit-region overlapping a visible lower segment',
    );
  });
}

for (const theme of ['light', 'dark']) {
  test(`${theme}: transparent ordinary crossing gaps, precise picks and a continuous pointer-inert top trace`, async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByRole('combobox', { name: 'Theme', exact: true })
      .selectOption(theme);
    await page.getByRole('combobox', { name: 'Theme', exact: true }).blur();
    await page.mouse.move(0, 0);
    const before = await saved(page);
    const original = await paths(page);
    const target = await crossing(page);
    await expect(page.locator('.wire-outline')).toHaveCount(0);
    const screenshot = await page.screenshot({
      path: `artifacts/clear-wiring-after-crossing-${theme}.png`,
      fullPage: true,
    });
    const clip = {
      x: target.center.x - 70,
      y: target.center.y - 70,
      width: 140,
      height: 140,
    };
    await page.screenshot({
      path: `artifacts/clear-wiring-after-crossing-${theme}-closeup.png`,
      clip,
    });
    const pixels = await page.evaluate(
      async ({ image, gap, blank }) => {
        const img = new Image();
        img.src = `data:image/png;base64,${image}`;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(img, 0, 0);
        return [gap, blank].map((point) => [
          ...context.getImageData(
            Math.round(point.x),
            Math.round(point.y),
            1,
            1,
          ).data,
        ]);
      },
      {
        image: screenshot.toString('base64'),
        gap: target.gap,
        blank: target.blank,
      },
    );
    expect(
      Math.max(
        ...pixels[0]!.map((value, index) =>
          Math.abs(value - pixels[1]![index]!),
        ),
      ),
    ).toBeLessThan(12);
    await page.mouse.click(target.center.x, target.center.y);
    await expect(
      page.locator(`[data-wire-id="${target.upper}"]`),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.mouse.click(target.nearby.x, target.nearby.y);
    const lower = page.locator(`[data-wire-id="${target.lower}"]`);
    await expect(lower).toHaveAttribute('aria-pressed', 'true');
    await page.mouse.move(0, 0);
    const overlay = page.locator('.wire-trace-overlay');
    await expect(overlay).toHaveAttribute('data-trace-id', target.lower);
    await expect(page.locator('.trace-terminal-ring')).toHaveCount(2);
    await expect(
      page.locator('.terminal:has(.trace-terminal-ring) .terminal-label'),
    ).toHaveCount(2);
    expect(
      await overlay.evaluate((element) => {
        const all = [...element.parentElement!.children];
        return (
          getComputedStyle(element).pointerEvents === 'none' &&
          [...element.querySelectorAll('path')].every(
            (path) => getComputedStyle(path).pointerEvents === 'none',
          ) &&
          all
            .filter((child) => child.matches('.wire'))
            .every((wire) => all.indexOf(wire) < all.indexOf(element)) &&
          all.indexOf(element) <
            all.findIndex((child) => child.matches('[data-testid^="part-"]'))
        );
      }),
    ).toBe(true);
    await expect(overlay.locator('path').last()).toHaveAttribute(
      'd',
      (await lower.locator('.wire-hit').getAttribute('d'))!,
    );
    await page.screenshot({
      path: `artifacts/clear-wiring-after-traced-${theme}.png`,
      fullPage: true,
    });
    await page.screenshot({
      path: `artifacts/clear-wiring-after-traced-${theme}-closeup.png`,
      clip,
    });
    expect(await paths(page)).toEqual(original);
    expect(await saved(page)).toEqual(before);
    await page.keyboard.press('Escape');
    await expect(overlay).toHaveCount(0);
  });
}

test('separated adjacent lanes pick their own exact logical wires and endpoint labels', async ({
  page,
}) => {
  await page.goto('/');
  const targets = await page.locator('.circuit-board').evaluate((element) => {
    const svg = element as SVGSVGElement;
    const lines = [...svg.querySelectorAll<SVGGElement>('.wire')].flatMap(
      (wire) => {
        const values = wire
          .querySelector('.wire-hit')!
          .getAttribute('d')!
          .match(/[-+]?\d*\.?\d+/g)!
          .map(Number);
        const points = Array.from(
          { length: values.length / 2 },
          (_, index) => ({ x: values[index * 2]!, y: values[index * 2 + 1]! }),
        );
        return points
          .slice(1)
          .map((b, index) => ({ a: points[index]!, b, wire }));
      },
    );
    for (const a of lines)
      for (const b of lines) {
        if (a.wire === b.wire) continue;
        const horizontal = a.a.y === a.b.y;
        if (horizontal !== (b.a.y === b.b.y)) continue;
        const axis = horizontal ? 'x' : 'y';
        const cross = horizontal ? 'y' : 'x';
        const spacing = Math.abs(a.a[cross] - b.a[cross]);
        if (spacing < 16 || spacing > 20) continue;
        const low = Math.max(
          Math.min(a.a[axis], a.b[axis]),
          Math.min(b.a[axis], b.b[axis]),
        );
        const high = Math.min(
          Math.max(a.a[axis], a.b[axis]),
          Math.max(b.a[axis], b.b[axis]),
        );
        if (high - low < 40) continue;
        const targets = [a, b].map((line) => {
          const point = new DOMPoint(
            horizontal ? (low + high) / 2 : line.a.x,
            horizontal ? line.a.y : (low + high) / 2,
          );
          const visible = [
            ...line.wire.querySelectorAll<SVGPathElement>('.wire-visuals path'),
          ].some((path) => path.isPointInStroke(point));
          const screen = point.matrixTransform(svg.getScreenCTM()!);
          return {
            id: line.wire.dataset.wireId!,
            x: screen.x,
            y: screen.y,
            visible,
            reachable:
              document
                .elementFromPoint(screen.x, screen.y)
                ?.closest('.wire') === line.wire,
          };
        });
        if (targets.every((target) => target.visible && target.reachable))
          return targets;
      }
    throw new Error('No separated visible lane pair');
  });
  for (const target of targets) {
    await page.mouse.click(target.x, target.y);
    await expect(page.locator(`[data-wire-id="${target.id}"]`)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('.wire-trace-overlay')).toHaveAttribute(
      'data-trace-id',
      target.id,
    );
    await expect(
      page.locator('.terminal:has(.trace-terminal-ring) .terminal-label'),
    ).toHaveCount(2);
  }
});

test('all logical wire keyboard targets remain exact, and Edit deletes only the pinned wire', async ({
  page,
}) => {
  await page.goto('/');
  const ids = await page
    .locator('.wire')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-wire-id')!),
    );
  for (const [index, id] of ids.entries()) {
    const wire = page.locator(`[data-wire-id="${id}"]`);
    await wire.focus();
    await expect(page.locator('.wire-trace-overlay')).toHaveAttribute(
      'data-trace-id',
      id,
    );
    await page.keyboard.press(index % 2 ? 'Space' : 'Enter');
    await expect(wire).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.trace-terminal-ring')).toHaveCount(2);
  }
  await page.getByRole('button', { name: 'Edit circuit', exact: true }).click();
  const id = ids[3]!;
  await page.locator(`[data-wire-id="${id}"]`).focus();
  await page.keyboard.press('Enter');
  await page
    .getByRole('button', { name: 'Remove selected wire', exact: true })
    .click();
  await expect(page.locator(`[data-wire-id="${id}"]`)).toHaveCount(0);
  await expect(page.locator('.wire')).toHaveCount(ids.length - 1);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.wire')).toHaveCount(ids.length);
});

test('all switch, split, volume, tone and six LC states preserve routes and consistent gaps in every visual pass', async ({
  page,
}) => {
  await page.goto('/');
  for (const id of [
    'standard-tele',
    'split-humbuckers',
    'tele-four-way',
    'varitone-tele',
  ]) {
    await load(page, id);
    const original = await paths(page);
    await page.getByTestId('part-selector').click();
    for (
      let position = 1;
      position <= (id === 'tele-four-way' ? 4 : 3);
      position++
    ) {
      await page
        .getByRole('button', { name: `Position ${position}`, exact: true })
        .click();
      expect(await paths(page)).toEqual(original);
    }
    await page.keyboard.press('Escape');
    await page.getByTestId('part-volume').click();
    if (id === 'split-humbuckers')
      for (const name of ['Pulled', 'Pushed']) {
        await page.getByRole('button', { name, exact: true }).click();
        expect(await paths(page)).toEqual(original);
      }
    const volume = page.locator(
      '.context-controls input[type="range"], .bench-controls input[type="range"]',
    );
    // The accessible slider is shared by both contextual desktop/mobile panels.
    const slider = (await volume.count())
      ? volume.first()
      : page.getByRole('slider').first();
    await slider.fill('0');
    expect(await paths(page)).toEqual(original);
    await slider.fill('10');
    await page.keyboard.press('Escape');
    await page.getByTestId('part-tone').click();
    await page.getByRole('slider').first().fill('0');
    expect(await paths(page)).toEqual(original);
    await expect(page.locator('.tone-flow').first()).toBeVisible();
    await page.keyboard.press('Escape');
    if (id === 'varitone-tele') {
      await page.getByTestId('part-varitone').click();
      for (let position = 1; position <= 6; position++) {
        await page
          .getByLabel('Varitone position', { exact: true })
          .selectOption(String(position));
        expect(await paths(page)).toEqual(original);
        if (position > 1)
          await expect(page.locator('.varitone-flow').first()).toBeVisible();
      }
      await page.keyboard.press('Escape');
    }
    expect(
      await page.locator('.wire').evaluateAll((wires) =>
        wires.every((wire) => {
          const visuals = [...wire.querySelectorAll(' .wire-visuals path')];
          return visuals.every(
            (path) => path.getAttribute('d') === visuals[0]!.getAttribute('d'),
          );
        }),
      ),
    ).toBe(true);
    expect(
      await page
        .locator('.tone-flow, .varitone-flow')
        .evaluateAll((elements) =>
          elements.every(
            (element) => getComputedStyle(element).animationName === 'none',
          ),
        ),
    ).toBe(true);
  }
});

test('clear-wiring off uses actual legacy routes and outlines, not hidden compatibility paths', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:4184');
  await expect(page.locator('.circuit-board')).not.toHaveClass(/clear-wiring/);
  await expect(page.locator('.wire-outline')).toHaveCount(16);
  const original = await paths(page);
  await page.locator('.wire').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.wire-trace-overlay')).toHaveCount(0);
  await expect(page.locator('.trace-terminal-ring')).toHaveCount(2);
  expect(await paths(page)).toEqual(original);
});
