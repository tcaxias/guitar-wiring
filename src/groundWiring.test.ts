import { expect, it, vi } from 'vitest';
import {
  groundWiringKey,
  loadGroundWiring,
  saveGroundWiring,
} from './groundWiring';

it.each([null, '', 'invalid', 'SHOWN', 'hidden', 'shown'])(
  'defaults to compact unless the raw preference is shown: %s',
  (value) => {
    const storage = { getItem: vi.fn(() => value), setItem: vi.fn() };
    expect(loadGroundWiring(storage)).toBe(value === 'shown');
    expect(storage.getItem).toHaveBeenCalledWith(groundWiringKey);
    expect(storage.setItem).not.toHaveBeenCalled();
  },
);

it.each([true, false])(
  'writes only the independent preference: %s',
  (isShown) => {
    const storage = { getItem: vi.fn(), setItem: vi.fn() };
    expect(saveGroundWiring(storage, isShown)).toBe(true);
    expect(storage.setItem.mock.calls).toEqual([
      [groundWiringKey, isShown ? 'shown' : 'hidden'],
    ]);
    expect(storage.getItem).not.toHaveBeenCalled();
  },
);

it('survives restricted storage and reports failed writes', () => {
  const fail = () => {
    throw new Error('Storage unavailable');
  };
  const storage = { getItem: fail, setItem: fail };
  expect(loadGroundWiring(storage)).toBe(false);
  expect(saveGroundWiring(storage, true)).toBe(false);
});
