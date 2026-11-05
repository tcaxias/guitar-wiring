import { expect, test, type Page } from '@playwright/test';
import { analyze } from '../src/circuit/analyze';
import { fourWayTeleCircuit, varitoneCircuit } from '../src/circuit/library';
import type { Circuit } from '../src/circuit/model';
import { groundPresentation } from '../src/components/groundPresentation';
import { signalFlowDirections } from '../src/components/signalPresentation';
import { storageKey } from '../src/storage';

test.use({
  baseURL: process.env.SIGNAL_FLOW_PREVIEW_URL ?? 'http://127.0.0.1:4178',
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'no-preference',
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
async function select(page: Page, id: string) {
  await page.getByTestId(`part-${id}`).locator('.part-body').focus();
  await page.keyboard.press('Enter');
}
async function expand(page: Page, isShown: boolean) {
  await page.getByRole('button', { name: 'More options' }).click();
  await page
    .getByLabel('Show ground wiring', { exact: true })
    .setChecked(isShown);
  await page.getByRole('button', { name: 'More options' }).click();
}
const stroke = (page: Page, id: string) =>
  page
    .locator(`[data-wire-id="${id}"] .wire-base`)
    .evaluate((path) => getComputedStyle(path).stroke);
const offset = (page: Page, selector: string) =>
  page
    .locator(selector)
    .evaluate((path) => getComputedStyle(path).strokeDashoffset);

for (const theme of ['light', 'dark'])
  test(`${theme}: both HOT leads stay orange, series RETURN stays muted green, actual flow moves toward jack`, async ({
    page,
  }) => {
    const circuit = fourWayTeleCircuit();
    circuit.parts.find((part) => part.id === 'tone')!.value = 0;
    await seed(page, circuit);
    await page.goto('/');
    await page.getByLabel('Theme', { exact: true }).selectOption(theme);
    const orange = theme === 'light' ? 'rgb(38, 38, 37)' : 'rgb(0, 150, 207)';
    const green =
      theme === 'light' ? 'rgb(230, 159, 103)' : 'rgb(255, 180, 84)';
    for (const position of [1, 2, 3, 4]) {
      await select(page, 'selector');
      await page
        .getByRole('button', { name: `Position ${position}`, exact: true })
        .click();
      await page.getByRole('button', { name: 'Close part controls' }).click();
      circuit.parts.find((part) => part.id === 'selector')!.value = position;
      for (const isShown of [false, true]) {
        await expand(page, isShown);
        expect(await stroke(page, 'wire-0')).toBe(orange);
        expect(await stroke(page, 'wire-2')).toBe(orange);
        expect(await stroke(page, 'wire-3')).toBe(green);
        await expect(
          page.locator('[data-ground-terminal="neck:return"]'),
        ).toHaveCount(0);
        const directions = signalFlowDirections(circuit, analyze(circuit));
        const actual = await page
          .locator('.signal-flow')
          .evaluateAll((paths) =>
            Object.fromEntries(
              paths.map((path) => [
                path.closest('.wire')!.getAttribute('data-wire-id'),
                getComputedStyle(path).animationDirection,
              ]),
            ),
          );
        expect(Object.keys(actual).sort()).toEqual(
          Object.keys(directions).sort(),
        );
        for (const [id, direction] of Object.entries(directions))
          expect(actual[id]).toBe(
            direction === 'reverse' ? 'reverse' : 'normal',
          );
        if (isShown)
          for (const id of groundPresentation(circuit).groundWires) {
            const groundColor =
              theme === 'light' ? 'rgb(110, 107, 94)' : 'rgb(92, 103, 115)';
            const groundActive =
              theme === 'light' ? 'rgb(59, 46, 42)' : 'rgb(20, 25, 31)';
            expect([groundColor, groundActive]).toContain(
              await stroke(page, id),
            );
          }
        const roles = await page
          .locator('.signal-flow')
          .evaluateAll((paths) =>
            paths.map((path) =>
              path.closest('.wire')!.getAttribute('data-wire-role'),
            ),
          );
        expect(roles.every((role) => role === 'hot' || role === 'return')).toBe(
          true,
        );
        if (position === 1 || position === 4)
          await page.screenshot({
            path: `artifacts/signal-flow-${theme}-${position}-${isShown ? 'expanded' : 'compact'}.png`,
          });
      }
    }
    const flow = '[data-wire-id="wire-3"] .signal-flow';
    expect(
      await page
        .locator(flow)
        .evaluate((path) => getComputedStyle(path).stroke),
    ).toBe(green);
    expect(
      await page
        .locator(flow)
        .evaluate((path) => getComputedStyle(path).pointerEvents),
    ).toBe('none');
    const before = await offset(page, flow);
    await expect.poll(() => offset(page, flow)).not.toBe(before);
    const tone = page.locator('.tone-flow').first();
    const toneBefore = await tone.evaluate(
      (path) => getComputedStyle(path).strokeDashoffset,
    );
    expect(
      await tone.evaluate((path) => getComputedStyle(path).animationName),
    ).toBe('treble-flow');
    await expect
      .poll(() =>
        tone.evaluate((path) => getComputedStyle(path).strokeDashoffset),
      )
      .not.toBe(toneBefore);
    await page.locator('[data-wire-id="wire-3"]').focus();
    await page.keyboard.press('Enter');
    expect(
      await page
        .locator('.wire-trace-overlay path:last-child')
        .evaluate((path) => getComputedStyle(path).stroke),
    ).toBe(green);
    await expect(page.locator('.wire-trace-overlay')).toHaveAttribute(
      'pointer-events',
      'none',
    );
    await page.keyboard.press('Escape');
    // Paused phase captures make the direction and bright-segment contrast inspectable.
    for (const phase of [0, 450]) {
      await page.locator('.signal-flow, .tone-flow').evaluateAll(
        (paths, phase) =>
          paths.forEach((path) =>
            path.getAnimations().forEach((animation) => {
              animation.pause();
              animation.currentTime = phase;
            }),
          ),
        phase,
      );
      await page.screenshot({
        path: `artifacts/signal-flow-${theme}-phase-${phase}.png`,
      });
    }
  });

test('volume zero preserves orange roles and input activity but stops jack flow; reduced motion is static', async ({
  page,
}) => {
  const circuit = fourWayTeleCircuit();
  await seed(page, circuit);
  await page.goto('/');
  const output = circuit.wires.find((wire) => wire.to === 'jack:tip')!.id;
  const before = await stroke(page, output);
  await select(page, 'volume');
  await page.getByRole('slider').fill('0');
  await expect(
    page.locator(`[data-wire-id="${output}"] .signal-flow`),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-wire-id="wire-0"] .signal-flow'),
  ).toHaveCount(1);
  expect(await stroke(page, output)).toBe(before);
  expect(
    await page
      .locator(`[data-wire-id="${output}"] .wire-base`)
      .getAttribute('opacity'),
  ).toBe('0.35');
  await page.getByRole('slider').fill('5');
  expect(
    await page
      .locator(`[data-wire-id="${output}"] .signal-flow`)
      .getAttribute('opacity'),
  ).toBe('0.625');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of await page.locator('.signal-flow').all()) {
    expect(
      await path.evaluate((path) => getComputedStyle(path).animationName),
    ).toBe('none');
    expect(Number(await path.getAttribute('opacity'))).toBeGreaterThan(0);
  }
  const input = '[data-wire-id="wire-0"] .signal-flow';
  const initial = await offset(page, input);
  await page.screenshot({ path: 'artifacts/signal-flow-reduced-motion.png' });
  expect(await offset(page, input)).toBe(initial);
});

test('reversed serialization changes CSS direction, not the physical path toward output', async ({
  page,
}) => {
  const circuit = fourWayTeleCircuit();
  circuit.parts.find((part) => part.id === 'selector')!.value = 4;
  circuit.wires = circuit.wires.map((wire) => ({
    ...wire,
    from: wire.to,
    to: wire.from,
  }));
  await seed(page, circuit);
  await page.goto('/');
  for (const [id, direction] of Object.entries(
    signalFlowDirections(circuit, analyze(circuit)),
  )) {
    const flow = page.locator(`[data-wire-id="${id}"] .signal-flow`);
    await expect(flow).toHaveClass(new RegExp(`signal-flow-${direction}`));
    // Sample an actual running timeline rather than claiming motion from a still.
    const values = await flow.evaluate((path) => {
      const animation = path.getAnimations()[0]!;
      animation.pause();
      animation.currentTime = 100;
      const first = parseFloat(getComputedStyle(path).strokeDashoffset);
      animation.currentTime = 200;
      return [first, parseFloat(getComputedStyle(path).strokeDashoffset)];
    });
    expect(Math.sign(values[1]! - values[0]!)).toBe(
      direction === 'reverse' ? 1 : -1,
    );
  }
});

test('tone and LC layers retain their own color and exact crossing cuts beside HOT flow', async ({
  page,
}) => {
  const circuit = varitoneCircuit();
  circuit.parts.find((part) => part.id === 'tone')!.value = 0;
  circuit.parts.find((part) => part.id === 'varitone')!.value = 6;
  await seed(page, circuit);
  await page.goto('/');
  await expect(
    page.locator('[data-wire-id="varitone-signal"]'),
  ).toHaveAttribute('data-wire-role', 'lc');
  await expect(
    page.locator(
      '[data-wire-role="tone"] .signal-flow, [data-wire-role="lc"] .signal-flow',
    ),
  ).toHaveCount(0);
  await expect(page.locator('.tone-flow').first()).toBeVisible();
  await expect(page.locator('.varitone-flow').first()).toBeVisible();
  const geometry = await page
    .locator('.wire')
    .evaluateAll((wires) =>
      wires.map(
        (wire) =>
          new Set(
            [...wire.querySelectorAll('.wire-visuals path')].map((path) =>
              path.getAttribute('d'),
            ),
          ).size,
      ),
    );
  expect(geometry.every((count) => count === 1)).toBe(true);
  await page.screenshot({ path: 'artifacts/signal-flow-tone-lc.png' });
});

test('signal flag off restores published activity colors and no signal overlay', async ({
  page,
}) => {
  await seed(page, fourWayTeleCircuit());
  await page.goto('http://127.0.0.1:4187');
  await expect(page.locator('.signal-flow')).toHaveCount(0);
  expect(await stroke(page, 'wire-2')).toBe('rgb(230, 159, 103)');
  expect(await stroke(page, 'wire-3')).toBe('rgb(230, 159, 103)');
  await select(page, 'selector');
  await page.getByRole('button', { name: 'Position 4', exact: true }).click();
  expect(await stroke(page, 'wire-3')).toBe('rgb(38, 38, 37)');
  await expect(page.locator('.signal-flow')).toHaveCount(0);
});

for (const filter of ['lc', 'tone'] as const)
  for (const isReversed of [false, true])
    test(`relocated ${filter} tap preserves orange HOT flow with ${isReversed ? 'reversed/shuffled' : 'original'} endpoints`, async ({
      page,
    }) => {
      const circuit = varitoneCircuit();
      const feed = circuit.wires.find((wire) =>
        filter === 'lc'
          ? wire.id === 'varitone-signal'
          : wire.to === 'tone:input',
      )!;
      feed.from = 'selector:a-common';
      if (isReversed) {
        circuit.parts.reverse();
        circuit.wires = circuit.wires
          .reverse()
          .map((wire) => ({ ...wire, from: wire.to, to: wire.from }));
      }
      await seed(page, circuit);
      await page.goto('/');
      for (const value of [filter === 'lc' ? 1 : 10, filter === 'lc' ? 6 : 0]) {
        await select(page, filter === 'lc' ? 'varitone' : 'tone');
        if (filter === 'lc')
          await page
            .getByLabel('Varitone position')
            .selectOption(String(value));
        else await page.getByRole('slider').fill(String(value));
        await page.getByRole('button', { name: 'Close part controls' }).click();
        for (const theme of ['light', 'dark']) {
          await page.getByLabel('Theme', { exact: true }).selectOption(theme);
          const orange =
            theme === 'light' ? 'rgb(38, 38, 37)' : 'rgb(0, 150, 207)';
          for (const id of ['wire-2', 'wire-12']) {
            const wire = page.locator(`[data-wire-id="${id}"]`);
            await expect(wire).toHaveAttribute('data-wire-role', 'hot');
            await expect(wire.locator('.signal-flow')).toHaveCount(1);
            const colors = await wire
              .locator('.wire-visuals path')
              .evaluateAll((paths) =>
                paths.map((path) => getComputedStyle(path).stroke),
              );
            expect(colors.every((color) => color === orange)).toBe(true);
            await expect(
              wire.locator('.tone-flow, .varitone-flow'),
            ).toHaveCount(0);
            const selector = `[data-wire-id="${id}"] .signal-flow`;
            const initial = await offset(page, selector);
            await expect.poll(() => offset(page, selector)).not.toBe(initial);
          }
          await expect(
            page.locator(`[data-wire-id="${feed.id}"]`),
          ).toHaveAttribute('data-wire-role', filter);
          await expect(
            page.locator(`[data-wire-id="${feed.id}"] .signal-flow`),
          ).toHaveCount(0);
          await expect(
            page.locator(
              `[data-wire-id="${feed.id}"] .${filter === 'lc' ? 'varitone' : 'tone'}-flow`,
            ),
          ).toHaveCount(value === (filter === 'lc' ? 1 : 10) ? 0 : 1);
          await expect(page.getByTestId('output-level')).toHaveText('100%');
          await page.screenshot({
            path: `artifacts/signal-flow-relocated-${filter}-${isReversed ? 'reversed' : 'original'}-${value}-${theme}.png`,
          });
        }
      }
    });
