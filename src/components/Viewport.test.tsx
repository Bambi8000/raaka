import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import {
  applyPieceAppearance,
  ViewportFailurePanel,
  type PieceVisual,
} from './Viewport'
import type { BoxPiece } from '../core/types'
import { disposeObjectTree } from '../geometry/viewportLifecycle'

function pieceVisual(piece: BoxPiece): PieceVisual {
  const geometry = new THREE.BoxGeometry(...piece.size)
  return {
    piece,
    mesh: new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ transparent: piece.role === 'core' }),
    ),
    edges: new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial(),
    ),
  }
}

describe('viewport piece appearance', () => {
  it('changes selection materials without replacing mesh or edge geometry', () => {
    const visual = pieceVisual({
      kind: 'box',
      id: 'upper-mass',
      label: 'Upper mass',
      role: 'mass',
      position: [0, 0, 50],
      size: [100, 100, 100],
    })
    const meshGeometry = visual.mesh.geometry
    const edgeGeometry = visual.edges.geometry

    applyPieceAppearance(visual, 'support-1', new Set(), 'dark')
    expect(visual.mesh.material.color.getHex()).toBe(0x9b9b94)
    applyPieceAppearance(visual, 'upper-mass', new Set(), 'dark')

    expect(visual.mesh.geometry).toBe(meshGeometry)
    expect(visual.edges.geometry).toBe(edgeGeometry)
    expect(visual.mesh.material.color.getHex()).toBe(0xffd400)
    expect(visual.edges.material.color.getHex()).toBe(0x30302e)
    const root = new THREE.Group()
    root.add(visual.mesh, visual.edges)
    disposeObjectTree(root)
  })

  it('updates retained-core opacity and edge colour with selection', () => {
    const visual = pieceVisual({
      kind: 'box',
      id: 'upper-retained-core',
      label: 'Upper retained core',
      role: 'core',
      position: [0, 0, 50],
      size: [60, 60, 60],
    })

    applyPieceAppearance(visual, 'upper-mass', new Set(), 'light')
    expect(visual.mesh.material.color.getHex()).toBe(0x287bc1)
    expect(visual.edges.material.color.getHex()).toBe(0x287bc1)
    expect(visual.mesh.material.opacity).toBe(0.2)

    applyPieceAppearance(visual, 'upper-retained-core', new Set(), 'light')
    expect(visual.mesh.material.color.getHex()).toBe(0xffd400)
    expect(visual.edges.material.color.getHex()).toBe(0xffd400)
    expect(visual.mesh.material.opacity).toBe(0.34)
    const root = new THREE.Group()
    root.add(visual.mesh, visual.edges)
    disposeObjectTree(root)
  })

  it('uses blue material without rebuilding a Fuse source', () => {
    const visual = pieceVisual({
      kind: 'box',
      id: 'upper-mass',
      label: 'Upper mass',
      role: 'mass',
      position: [0, 0, 50],
      size: [100, 100, 100],
    })
    const geometry = visual.mesh.geometry

    applyPieceAppearance(
      visual,
      'support-1',
      new Set(['upper-mass']),
      'dark',
    )

    expect(visual.mesh.geometry).toBe(geometry)
    expect(visual.mesh.material.color.getHex()).toBe(0x287bc1)
    const root = new THREE.Group()
    root.add(visual.mesh, visual.edges)
    disposeObjectTree(root)
  })
})

describe('viewport failure state', () => {
  it('keeps recovery actionable when the 3D preview cannot start', () => {
    const onRetry = vi.fn()
    const html = renderToStaticMarkup(
      <ViewportFailurePanel
        message="WebGL could not start. Project controls remain available."
        onRetry={onRetry}
      />,
    )

    expect(html).toContain('role="alert"')
    expect(html).toContain('3D PREVIEW UNAVAILABLE')
    expect(html).toContain('Project controls remain available.')
    expect(html).toContain('RETRY 3D')
  })
})
