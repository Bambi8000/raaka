import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  formatNumericInputValue,
  numericInputDisplayValue,
  parseNumericInput,
  type NumericInputSpec,
} from '../core/numericInput'

const ShowAllControls = createContext(true)

/** Filtering is workspace UI state, never geometry or project history. */
export function InspectorControls({ showAll, children }: { showAll: boolean; children: ReactNode }) {
  return <ShowAllControls value={showAll}>{children}</ShowAllControls>
}

export function ControlGroup({ visible, children }: { visible: boolean; children: ReactNode }) {
  return visible ? children : null
}

/** Native disclosure state is local to the workspace, never a study edit. */
export function InspectorSection({
  title, description, defaultOpen = false, visible = true, children,
}: {
  title: string
  description?: string
  defaultOpen?: boolean
  visible?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (!visible) return null
  return <details className="inspector-section" open={open}
    onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>
      <span className="inspector-section-heading">{title}</span>
      {description ? <span className="inspector-section-description">{description}</span> : null}
    </summary>
    <div className="inspector-section-content">{children}</div>
  </details>
}

interface RangeFieldProps {
  readonly label: string
  readonly value: number
  readonly minimum: number
  readonly maximum: number
  readonly step: number
  readonly suffix?: string
  readonly display?: 'raw' | 'percent'
  readonly affected: boolean
  /** Keep a contextual field visible without claiming that it reshapes the selection. */
  readonly visible?: boolean
  readonly ariaDescription?: string
  readonly presentation?: 'slider' | 'number' | 'choices'
  readonly onChange: (value: number) => void
  readonly onInteractionStart: () => void
  readonly onInteractionEnd: () => void
}

const RANGE_KEYS = new Set([
  'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp',
])

export function RangeField({
  affected,
  visible = affected,
  ...props
}: RangeFieldProps) {
  const showAll = useContext(ShowAllControls)
  if (!showAll && !visible) return null
  if (props.presentation === 'choices') return <ChoiceField affected={affected} {...props} />
  return <VisibleRangeField affected={affected} {...props} />
}

function fieldDescription(affected: boolean, description?: string): string {
  return description ?? (affected
    ? 'Affects the selected part or its live Fuse sources.'
    : 'Does not affect the selected part in the current study.')
}

function ChoiceField({
  label, value, minimum, maximum, step, affected, ariaDescription,
  onChange, onInteractionStart, onInteractionEnd,
}: RangeFieldProps) {
  const choices = Array.from({ length: Math.floor((maximum - minimum) / step) + 1 },
    (_, index) => minimum + index * step)
  return <div className={`range-field control-choices ${affected ? 'affects-selection' : 'other-controls'}`}
    role="group" aria-label={label} aria-description={fieldDescription(affected, ariaDescription)}>
    <span className="field-heading">
      <span>{label}</span>
      {affected ? <small className="field-impact" aria-hidden="true">SELECTED</small> : null}
    </span>
    <div className="field-choices">
      {choices.map((choice) => <button key={choice} type="button"
        aria-label={`${label}: ${choice}`} aria-pressed={choice === value}
        onClick={() => {
          if (choice === value) return
          onInteractionStart()
          onChange(choice)
          onInteractionEnd()
        }}>{choice}</button>)}
    </div>
  </div>
}

function VisibleRangeField({
  label, value, minimum, maximum, step, suffix = '', display = 'raw', affected,
  ariaDescription, presentation = 'slider',
  onChange, onInteractionStart, onInteractionEnd,
}: RangeFieldProps) {
  const rangeId = useId()
  const numberId = useId()
  const messageId = useId()
  const displayScale = display === 'percent' ? 100 : 1
  const unit = display === 'percent' ? '%' : suffix
  const inputStep = display === 'percent' || suffix.trim() === 'mm' ? 1 / displayScale : step
  const spec: NumericInputSpec = useMemo(
    () => ({ minimum, maximum, inputStep, displayScale, unit }),
    [displayScale, inputStep, maximum, minimum, unit],
  )
  const [draft, setDraft] = useState(() => formatNumericInputValue(value, spec))
  const [message, setMessage] = useState<string | undefined>(undefined)
  const editingRef = useRef(false)

  useEffect(() => {
    if (!editingRef.current) setDraft(formatNumericInputValue(value, spec))
  }, [spec, value])

  const beginKeyboardGesture = (event: KeyboardEvent<HTMLInputElement>) => {
    if (RANGE_KEYS.has(event.key)) onInteractionStart()
  }
  const endKeyboardGesture = (event: KeyboardEvent<HTMLInputElement>) => {
    if (RANGE_KEYS.has(event.key)) onInteractionEnd()
  }
  const commitNumericInput = (restoreInvalid: boolean) => {
    const result = parseNumericInput(draft, spec)
    if (!result.ok) {
      if (restoreInvalid) {
        const restored = formatNumericInputValue(value, spec)
        setDraft(restored)
        setMessage(`INVALID · RESTORED ${restored}${unit}`)
      } else {
        setMessage(result.reason)
      }
      return false
    }
    setDraft(result.draft)
    setMessage(undefined)
    if (Object.is(result.value, value)) return true
    onInteractionStart()
    onChange(result.value)
    onInteractionEnd()
    return true
  }
  const handleNumericKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (commitNumericInput(false)) {
        editingRef.current = false
        event.currentTarget.blur()
      }
      return
    }
    if (event.key !== 'Escape') return
    event.preventDefault()
    editingRef.current = false
    setDraft(formatNumericInputValue(value, spec))
    setMessage('EDIT CANCELLED')
    event.currentTarget.blur()
  }
  return (
    <div className={`range-field control-${presentation} ${affected ? 'affects-selection' : 'other-controls'}`}
      role={presentation === 'number' ? 'group' : undefined}
      aria-label={presentation === 'number' ? label : undefined}>
      <span className="field-heading">
        <label htmlFor={presentation === 'number' ? numberId : rangeId}>
          {label}
          {affected ? <small className="field-impact" aria-hidden="true">SELECTED</small> : null}
        </label>
        <span className="numeric-entry">
          <input
            id={numberId}
            type="number"
            aria-label={`${label} numeric value`}
            aria-description={fieldDescription(affected, ariaDescription)}
            aria-describedby={message ? messageId : undefined}
            aria-invalid={message
              && message !== 'EDIT CANCELLED'
              && !message.startsWith('INVALID · RESTORED')
              ? true
              : undefined}
            min={numericInputDisplayValue(minimum, spec)}
            max={numericInputDisplayValue(maximum, spec)}
            step={numericInputDisplayValue(inputStep, spec)}
            value={draft}
            onFocus={(event) => {
              editingRef.current = true
              setMessage(undefined)
              event.currentTarget.select()
            }}
            onChange={(event) => {
              setDraft(event.currentTarget.value)
              setMessage(undefined)
            }}
            onKeyDown={handleNumericKeyDown}
            onBlur={() => {
              if (!editingRef.current) return
              editingRef.current = false
              commitNumericInput(true)
            }}
          />
          {unit ? <span aria-hidden="true">{unit}</span> : null}
        </span>
      </span>
      {presentation === 'slider' ? <input id={rangeId} type="range" aria-label={label}
        aria-description={fieldDescription(affected, ariaDescription)}
        min={minimum} max={maximum} step={inputStep} value={value}
        onPointerDown={onInteractionStart} onPointerUp={onInteractionEnd}
        onPointerCancel={onInteractionEnd} onKeyDown={beginKeyboardGesture}
        onKeyUp={endKeyboardGesture} onBlur={onInteractionEnd}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)} /> : null}
      {message ? <small id={messageId} className="numeric-entry-message" role="status">
        {message}
      </small> : null}
    </div>
  )
}
