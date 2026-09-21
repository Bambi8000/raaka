import { describe, expect, it } from 'vitest'
import { formatNumericInputValue, parseNumericInput } from './numericInput'

describe('numeric inspector input', () => {
  it('formats design millimetres at one-millimetre input precision', () => {
    const spec = {
      minimum: -400, maximum: 400, inputStep: 1, displayScale: 1, unit: ' mm',
    }
    expect(formatNumericInputValue(-35, spec)).toBe('-35')
    expect(parseNumericInput(' 127 ', spec)).toEqual({
      ok: true, value: 127, draft: '127',
    })
    expect(parseNumericInput('127.5', spec)).toEqual({
      ok: false, reason: 'USE 1 mm INCREMENTS',
    })
  })

  it('maps percentage display values back to stored ratios', () => {
    const spec = {
      minimum: 0.4, maximum: 1.1, inputStep: 0.01, displayScale: 100, unit: '%',
    }
    expect(formatNumericInputValue(0.72, spec)).toBe('72')
    expect(parseNumericInput('85', spec)).toEqual({
      ok: true, value: 0.85, draft: '85',
    })
    expect(parseNumericInput('85,0', spec)).toEqual({
      ok: true, value: 0.85, draft: '85',
    })
  })

  it('explains empty, non-finite, out-of-range and off-step values', () => {
    const spec = {
      minimum: 1, maximum: 6, inputStep: 1, displayScale: 1, unit: '',
    }
    expect(parseNumericInput('', spec)).toEqual({
      ok: false, reason: 'ENTER A NUMBER',
    })
    expect(parseNumericInput('Infinity', spec)).toEqual({
      ok: false, reason: 'ENTER A FINITE NUMBER',
    })
    expect(parseNumericInput('7', spec)).toEqual({
      ok: false, reason: 'ENTER 1–6',
    })
    expect(parseNumericInput('2.5', spec)).toEqual({
      ok: false, reason: 'USE 1 INCREMENTS',
    })
  })
})
