import { expect, it } from 'vitest';
import { createPart, type Part } from '../circuit/model';
import { mergePartUpdates } from './partUpdates';

for (const [kind, skin] of [
  ['pickup', 'p90'],
  ['humbucker', 'filtertron'],
] as const)
  it(`removes ${skin} without mutating the styled ${kind} or unrelated properties`, () => {
    const part: Part = {
      ...createPart(kind, 'pickup'),
      skin,
      ...(kind === 'pickup' ? { hasSeparateShield: true } : {}),
    };
    const previous = structuredClone(part);
    const next = mergePartUpdates(part, { skin: undefined });
    expect(Object.hasOwn(next, 'skin')).toBe(false);
    expect(part).toEqual(previous);
    expect(mergePartUpdates(next, { skin })).toEqual(previous);
    expect(
      Object.fromEntries(
        Object.entries(part).filter(([key]) => key !== 'skin'),
      ),
    ).toEqual(next);
  });

it('preserves unrelated optional metadata and does not clear an omitted skin update', () => {
  const pickup: Part = {
    ...createPart('pickup', 'pickup'),
    skin: 'p90',
    hasSeparateShield: false,
  };
  expect(mergePartUpdates(pickup, { label: 'Custom label' })).toEqual({
    ...pickup,
    label: 'Custom label',
  });
  const pot: Part = {
    ...createPart('push-pull-volume', 'pot'),
    resistanceKOhms: 250,
    isPulled: false,
  };
  expect(mergePartUpdates(pot, { value: 0 })).toEqual({ ...pot, value: 0 });
});
