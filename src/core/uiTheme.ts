export type UiTheme = 'dark' | 'light'

export const DEFAULT_UI_THEME: UiTheme = 'dark'
export const UI_THEME_STORAGE_KEY = 'raaka.ui-theme.v1'

interface ThemeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function readUiTheme(storage: ThemeStorage): UiTheme {
  try {
    return storage.getItem(UI_THEME_STORAGE_KEY) === 'light'
      ? 'light'
      : DEFAULT_UI_THEME
  } catch {
    return DEFAULT_UI_THEME
  }
}

export function writeUiTheme(
  storage: ThemeStorage,
  theme: UiTheme,
): boolean {
  try {
    storage.setItem(UI_THEME_STORAGE_KEY, theme)
    return true
  } catch {
    return false
  }
}
