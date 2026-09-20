import { describe, expect, it } from 'vitest'
import {
  DEFAULT_UI_THEME,
  readUiTheme,
  UI_THEME_STORAGE_KEY,
  writeUiTheme,
} from './uiTheme'

function memoryStorage(initial?: string) {
  let value = initial ?? null
  return {
    getItem: (key: string) =>
      key === UI_THEME_STORAGE_KEY ? value : null,
    setItem: (key: string, next: string) => {
      if (key === UI_THEME_STORAGE_KEY) value = next
    },
    value: () => value,
  }
}

describe('UI theme preference', () => {
  it('defaults to dark when no recognised preference exists', () => {
    expect(readUiTheme(memoryStorage())).toBe(DEFAULT_UI_THEME)
    expect(readUiTheme(memoryStorage('unknown'))).toBe(DEFAULT_UI_THEME)
  })

  it('restores and writes an explicit light preference', () => {
    const storage = memoryStorage()

    expect(writeUiTheme(storage, 'light')).toBe(true)
    expect(storage.value()).toBe('light')
    expect(readUiTheme(storage)).toBe('light')
  })

  it('falls back without breaking startup when storage is unavailable', () => {
    const unavailable = {
      getItem: () => {
        throw new Error('unavailable')
      },
      setItem: () => {
        throw new Error('unavailable')
      },
    }

    expect(readUiTheme(unavailable)).toBe('dark')
    expect(writeUiTheme(unavailable, 'light')).toBe(false)
  })
})
