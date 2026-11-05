import { expect, it, vi } from 'vitest';
import { loadTheme, saveTheme, themeKey } from './theme';

it.each([null, '', 'LIGHT', 'invalid', 'light', 'dark'])(
  'reads only supported theme values: %s',
  (value) => {
    const storage = { getItem: vi.fn(() => value), setItem: vi.fn() };
    expect(loadTheme(storage)).toBe(value === 'dark' ? 'dark' : 'light');
    expect(storage.getItem).toHaveBeenCalledWith(themeKey);
    expect(storage.setItem).not.toHaveBeenCalled();
  },
);

it('writes the raw preference without touching circuit storage', () => {
  const storage = { getItem: vi.fn(), setItem: vi.fn() };
  expect(saveTheme(storage, 'dark')).toBe(true);
  expect(storage.setItem.mock.calls).toEqual([[themeKey, 'dark']]);
  expect(storage.getItem).not.toHaveBeenCalled();
});

it('survives restricted storage reads and writes', () => {
  const fail = () => {
    throw new Error('Storage unavailable');
  };
  const storage = { getItem: fail, setItem: fail };
  expect(loadTheme(storage)).toBe('light');
  expect(saveTheme(storage, 'dark')).toBe(false);
});
