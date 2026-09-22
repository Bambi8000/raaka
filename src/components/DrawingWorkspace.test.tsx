import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DrawingWorkspace } from './DrawingWorkspace'
import type { BoxPiece } from '../core/types'

const piece: BoxPiece = {
  kind: 'box',
  id: 'mass',
  label: 'Mass',
  role: 'mass',
  position: [0, 0, 50],
  size: [100, 80, 100],
}

describe('drawing workspace', () => {
  it('wires orthographic views, section plane, paper scale and SVG export controls', () => {
    const html = renderToStaticMarkup(
      <DrawingWorkspace
        pieces={[piece]}
        retainedCorePieces={[]}
        bounds={{ min: [-50, -40, 0], max: [50, 40, 100] }}
        seed={318}
        modelScaleDenominator={1}
        onMessage={vi.fn()}
      />,
    )

    expect(html).toContain('SECTION X–X')
    expect(html).toContain('HORIZONTAL Y · VERTICAL Z · FINISHED SOLID')
    expect(html).toContain('aria-label="Drawing view"')
    for (const label of ['PLAN', 'ELEV X', 'ELEV Y', 'SECTION X', 'SECTION Y']) {
      expect(html).toContain(label)
    }
    expect(html).toContain('aria-label="Section plane position numeric value"')
    expect(html).toContain('PAPER SCALE')
    expect(html).toContain('1:10')
    expect(html).toContain('SVG · LINE ONLY')
    expect(html).toContain('BUILDING DRAWING…')
  })
})
