export type Theme = 'light' | 'dark';
export const themeKey = 'pickup-lab:theme:v1';
type ThemeStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function loadTheme(storage: ThemeStorage): Theme {
  try {
    return storage.getItem(themeKey) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveTheme(storage: ThemeStorage, theme: Theme): boolean {
  try {
    storage.setItem(themeKey, theme);
    return true;
  } catch {
    return false;
  }
}
