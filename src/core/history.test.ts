import { describe, expect, it } from 'vitest'
import { createHistory, reduceHistory } from './history'

describe('history', () => {
  it('undoes and redoes a direct edit', () => {
    let history = createHistory(1)
    history = reduceHistory(history, { type: 'replace', value: 2 })
    history = reduceHistory(history, { type: 'undo' })
    expect(history.present).toBe(1)

    history = reduceHistory(history, { type: 'redo' })
    expect(history.present).toBe(2)
  })

  it('records an entire slider gesture as one undo step', () => {
    let history = createHistory(10)
    history = reduceHistory(history, { type: 'begin-gesture' })
    history = reduceHistory(history, { type: 'replace', value: 11 })
    history = reduceHistory(history, { type: 'replace', value: 12 })
    history = reduceHistory(history, { type: 'replace', value: 13 })
    history = reduceHistory(history, { type: 'commit-gesture' })

    expect(history.past).toEqual([10])
    expect(reduceHistory(history, { type: 'undo' }).present).toBe(10)
  })

  it('cancels a gesture without adding history or losing the prior redo branch', () => {
    let history = createHistory(10)
    history = reduceHistory(history, { type: 'replace', value: 20 })
    history = reduceHistory(history, { type: 'undo' })
    history = reduceHistory(history, { type: 'begin-gesture' })
    history = reduceHistory(history, { type: 'replace', value: 11 })
    history = reduceHistory(history, { type: 'replace', value: 12 })
    history = reduceHistory(history, { type: 'cancel-gesture' })

    expect(history).toEqual({
      past: [], present: 10, future: [20], gestureStart: null,
    })
  })

  it('clears redo when a new branch is edited', () => {
    let history = createHistory(1)
    history = reduceHistory(history, { type: 'replace', value: 2 })
    history = reduceHistory(history, { type: 'undo' })
    history = reduceHistory(history, { type: 'replace', value: 3 })

    expect(history.future).toEqual([])
    expect(reduceHistory(history, { type: 'redo' }).present).toBe(3)
  })

  it('loads a project without retaining another project history', () => {
    let history = createHistory(1)
    history = reduceHistory(history, { type: 'replace', value: 2 })
    history = reduceHistory(history, { type: 'load', value: 20 })

    expect(history).toEqual(createHistory(20))
  })
})
