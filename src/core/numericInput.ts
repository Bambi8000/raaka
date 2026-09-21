export interface NumericInputSpec {
  readonly minimum: number
  readonly maximum: number
  readonly inputStep: number
  readonly displayScale: number
  readonly unit: string
}

export type NumericInputResult =
  | { readonly ok: true; readonly value: number; readonly draft: string }
  | { readonly ok: false; readonly reason: string }

function decimalPlaces(value: number): number {
  for (let places = 0; places <= 8; places += 1) {
    const scale = 10 ** places
    if (Math.abs(Math.round(value * scale) - value * scale) < 1e-8) {
      return places
    }
  }
  return 8
}

function displayStep(spec: NumericInputSpec): number {
  return numericInputDisplayValue(spec.inputStep, spec)
}

export function numericInputDisplayValue(
  value: number,
  spec: Pick<NumericInputSpec, 'displayScale'>,
): number {
  return Number((value * spec.displayScale).toFixed(8))
}

/** Format project truth for an editable display-unit value. */
export function formatNumericInputValue(
  value: number,
  spec: NumericInputSpec,
): string {
  return numericInputDisplayValue(value, spec).toFixed(decimalPlaces(displayStep(spec)))
}

/** Parse and validate one explicit numeric edit without mutating model truth. */
export function parseNumericInput(
  draft: string,
  spec: NumericInputSpec,
): NumericInputResult {
  const normalizedDraft = draft.trim().replace(',', '.')
  if (normalizedDraft.length === 0) {
    return { ok: false, reason: 'ENTER A NUMBER' }
  }
  const displayValue = Number(normalizedDraft)
  if (!Number.isFinite(displayValue)) {
    return { ok: false, reason: 'ENTER A FINITE NUMBER' }
  }

  const displayMinimum = numericInputDisplayValue(spec.minimum, spec)
  const displayMaximum = numericInputDisplayValue(spec.maximum, spec)
  const step = displayStep(spec)
  const displayMinimumText = formatNumericInputValue(spec.minimum, spec)
  const displayMaximumText = formatNumericInputValue(spec.maximum, spec)
  if (displayValue < displayMinimum || displayValue > displayMaximum) {
    return {
      ok: false,
      reason: `ENTER ${displayMinimumText}–${displayMaximumText}${spec.unit}`,
    }
  }

  const stepOffset = (displayValue - displayMinimum) / step
  if (Math.abs(stepOffset - Math.round(stepOffset)) > 1e-8) {
    return {
      ok: false,
      reason: `USE ${step.toFixed(decimalPlaces(step))}${spec.unit} INCREMENTS`,
    }
  }

  const value = Number((displayValue / spec.displayScale).toFixed(8))
  return {
    ok: true,
    value: Object.is(value, -0) ? 0 : value,
    draft: formatNumericInputValue(value, spec),
  }
}
