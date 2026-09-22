import * as THREE from 'three'

export const WEBGL_STARTUP_FAILURE =
  'WebGL could not start. Project controls and saved geometry remain available.'

export const WEBGL_CONTEXT_FAILURE =
  'The graphics context was lost. Retry the 3D preview when the device is ready.'

export interface DisposableControl {
  dispose: () => void
}

export interface DisposableRenderer {
  readonly renderLists: { dispose: () => void }
  dispose: () => void
  forceContextLoss: () => void
}

export interface ViewportRuntimeResources {
  readonly scene: THREE.Scene
  readonly modelRoot: THREE.Group
  readonly ground: THREE.Mesh
  readonly grid: THREE.GridHelper
  readonly keyLight: THREE.DirectionalLight
  readonly controls: DisposableControl
  readonly transformControls: DisposableControl
  readonly renderer: DisposableRenderer
}

type RendererFactory = (
  parameters: THREE.WebGLRendererParameters,
) => THREE.WebGLRenderer

export type ViewportRendererResult =
  | { readonly status: 'ready'; readonly renderer: THREE.WebGLRenderer }
  | { readonly status: 'error'; readonly message: string }

export function createViewportRenderer(
  canvas: HTMLCanvasElement,
  factory: RendererFactory = (parameters) =>
    new THREE.WebGLRenderer(parameters),
): ViewportRendererResult {
  try {
    return {
      status: 'ready',
      renderer: factory({ canvas, antialias: true }),
    }
  } catch {
    return { status: 'error', message: WEBGL_STARTUP_FAILURE }
  }
}

export function disposeObjectTree(object: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Line)) return
    const renderable = child as THREE.Mesh<
      THREE.BufferGeometry,
      THREE.Material | THREE.Material[]
    >
    geometries.add(renderable.geometry)
    const childMaterials = Array.isArray(renderable.material)
      ? renderable.material
      : [renderable.material]
    for (const material of childMaterials) materials.add(material)
  })
  for (const geometry of geometries) geometry.dispose()
  for (const material of materials) material.dispose()
}

export function disposeViewportRuntime(
  resources: ViewportRuntimeResources,
): void {
  resources.controls.dispose()
  resources.transformControls.dispose()
  disposeObjectTree(resources.modelRoot)
  disposeObjectTree(resources.ground)
  disposeObjectTree(resources.grid)
  resources.keyLight.shadow.dispose()
  resources.scene.clear()
  resources.renderer.renderLists.dispose()
  resources.renderer.dispose()
  resources.renderer.forceContextLoss()
}
