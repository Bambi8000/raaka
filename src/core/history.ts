const HISTORY_LIMIT = 100

export interface HistoryState<Value> {
  readonly past: readonly Value[]
  readonly present: Value
  readonly future: readonly Value[]
  readonly gestureStart: Value | null
}

export type HistoryAction<Value> =
  | { readonly type: 'begin-gesture' }
  | { readonly type: 'replace'; readonly value: Value }
  | { readonly type: 'commit-gesture' }
  | { readonly type: 'cancel-gesture' }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' }
  | { readonly type: 'load'; readonly value: Value }

export function createHistory<Value>(present: Value): HistoryState<Value> {
  return { past: [], present, future: [], gestureStart: null }
}

function appendPast<Value>(past: readonly Value[], value: Value): Value[] {
  return [...past, value].slice(-HISTORY_LIMIT)
}

export function reduceHistory<Value>(
  state: HistoryState<Value>,
  action: HistoryAction<Value>,
): HistoryState<Value> {
  switch (action.type) {
    case 'begin-gesture':
      return state.gestureStart === null
        ? { ...state, gestureStart: state.present }
        : state
    case 'replace':
      if (Object.is(action.value, state.present)) return state
      if (state.gestureStart !== null) {
        return { ...state, present: action.value }
      }
      return {
        past: appendPast(state.past, state.present),
        present: action.value,
        future: [],
        gestureStart: null,
      }
    case 'commit-gesture':
      if (state.gestureStart === null) return state
      if (Object.is(state.gestureStart, state.present)) {
        return { ...state, gestureStart: null }
      }
      return {
        past: appendPast(state.past, state.gestureStart),
        present: state.present,
        future: [],
        gestureStart: null,
      }
    case 'cancel-gesture':
      return state.gestureStart === null
        ? state
        : { ...state, present: state.gestureStart, gestureStart: null }
    case 'undo': {
      const previous = state.past.at(-1)
      if (previous === undefined) return state
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        gestureStart: null,
      }
    }
    case 'redo': {
      const next = state.future[0]
      if (next === undefined) return state
      return {
        past: appendPast(state.past, state.present),
        present: next,
        future: state.future.slice(1),
        gestureStart: null,
      }
    }
    case 'load':
      return createHistory(action.value)
  }
}
