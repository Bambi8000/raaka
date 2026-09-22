import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import {
  createViewportRenderer,
  disposeObjectTree,
  disposeViewportRuntime,
  WEBGL_STARTUP_FAILURE,
} from './viewportLifecycle'

describe('viewport renderer startup', () => {
  it('turns a WebGL constructor failure into a visible-state result', () => {
    const result = createViewportRenderer(
      {} as HTMLCanvasElement,
      () => {
        throw new Error('No graphics context')
      },
    )

    expect(result).toEqual({
      status: 'error',
      message: WEBGL_STARTUP_FAILURE,
    })
  })
})

describe('viewport resource disposal', () => {
  it('disposes shared render resources exactly once', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshBasicMaterial()
    const root = new THREE.Group()
    root.add(
      new THREE.Mesh(geometry, material),
      new THREE.Mesh(geometry, material),
    )
    const geometryDispose = vi.spyOn(geometry, 'dispose')
    const materialDispose = vi.spyOn(material, 'dispose')

    disposeObjectTree(root)

    expect(geometryDispose).toHaveBeenCalledOnce()
    expect(materialDispose).toHaveBeenCalledOnce()
  })

  it('releases model, environment, controls, shadow and renderer ownership', () => {
    const scene = new THREE.Scene()
    const modelRoot = new THREE.Group()
    const modelGeometry = new THREE.BoxGeometry(1, 1, 1)
    const modelMaterial = new THREE.MeshBasicMaterial()
    modelRoot.add(new THREE.Mesh(modelGeometry, modelMaterial))
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial(),
    )
    const grid = new THREE.GridHelper(2, 2)
    const keyLight = new THREE.DirectionalLight()
    scene.add(modelRoot, ground, grid, keyLight, keyLight.target)
    const controls = { dispose: vi.fn() }
    const transformControls = { dispose: vi.fn() }
    const renderer = {
      renderLists: { dispose: vi.fn() },
      dispose: vi.fn(),
      forceContextLoss: vi.fn(),
    }
    const modelDispose = vi.spyOn(modelGeometry, 'dispose')
    const shadowDispose = vi.spyOn(keyLight.shadow, 'dispose')

    disposeViewportRuntime({
      scene,
      modelRoot,
      ground,
      grid,
      keyLight,
      controls,
      transformControls,
      renderer,
    })

    expect(controls.dispose).toHaveBeenCalledOnce()
    expect(transformControls.dispose).toHaveBeenCalledOnce()
    expect(modelDispose).toHaveBeenCalledOnce()
    expect(shadowDispose).toHaveBeenCalledOnce()
    expect(renderer.renderLists.dispose).toHaveBeenCalledOnce()
    expect(renderer.dispose).toHaveBeenCalledOnce()
    expect(renderer.forceContextLoss).toHaveBeenCalledOnce()
    expect(scene.children).toHaveLength(0)
  })
})
