import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import type {
  MassStudy,
  ModelScale,
  PieceRole,
  ScenePiece,
  Vec3,
} from '../core/types'
import {
  translatedGizmoValue,
  type TranslationGizmoTarget,
} from '../core/translationGizmo'
import type { UiTheme } from '../core/uiTheme'
import { createFrustumGeometry } from '../geometry/frustum'
import { polygonLoftMesh } from '../core/polygonLoft'
import { fitDirectionalShadow, fitPerspectiveCamera } from '../geometry/view'
import {
  createViewportRenderer,
  disposeObjectTree,
  disposeViewportRuntime,
  WEBGL_CONTEXT_FAILURE,
} from '../geometry/viewportLifecycle'

interface ViewportProps {
  readonly study: MassStudy
  readonly modelScale: ModelScale
  readonly uiTheme: UiTheme
  readonly selectedPieceId: string
  readonly fuseSelectionPieceIds: readonly string[]
  readonly translationGizmo?: TranslationGizmoTarget
  readonly onSelect: (pieceId: string) => void
  readonly onTranslationStart: (target: TranslationGizmoTarget) => void
  readonly onTranslationChange: (
    target: TranslationGizmoTarget,
    valueDesignMm: Vec3,
  ) => void
  readonly onTranslationEnd: (
    target: TranslationGizmoTarget,
    changed: boolean,
  ) => void
  readonly onTranslationCancel: (target: TranslationGizmoTarget) => void
}

interface ViewportPalette {
  readonly background: number
  readonly ground: number
  readonly gridCentre: number
  readonly grid: number
  readonly hemisphereSky: number
  readonly hemisphereGround: number
  readonly hemisphereIntensity: number
  readonly pieceColours: Readonly<Record<PieceRole, number>>
}

const VIEWPORT_PALETTES: Readonly<Record<UiTheme, ViewportPalette>> = {
  dark: {
    background: 0x151513,
    ground: 0x1d1d1a,
    gridCentre: 0x57574f,
    grid: 0x343430,
    hemisphereSky: 0xe8e8e2,
    hemisphereGround: 0x080808,
    hemisphereIntensity: 1.65,
    pieceColours: {
      mass: 0x9b9b94,
      support: 0x74746f,
      surface: 0xd7d7d0,
      core: 0x287bc1,
      void: 0xe33b97,
    },
  },
  light: {
    background: 0xd9d9d4,
    ground: 0xc9c9c4,
    gridCentre: 0x8d8d87,
    grid: 0xbebeb8,
    hemisphereSky: 0xffffff,
    hemisphereGround: 0x5b5b57,
    hemisphereIntensity: 2.2,
    pieceColours: {
      mass: 0xb8b8b1,
      support: 0x8f8f88,
      surface: 0xecece8,
      core: 0x287bc1,
      void: 0xe33b97,
    },
  },
}

const SELECTED_COLOUR = 0xffd400
const FUSE_SELECTION_COLOUR = 0x287bc1
const STABILITY_WARNING_COLOUR = 0xe33b97
const EDGE_COLOUR = 0x30302e

export interface PieceVisual {
  readonly piece: ScenePiece
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  readonly edges: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>
}

function pieceColour(
  piece: ScenePiece,
  selectedPieceId: string,
  fuseSelectionPieceIds: ReadonlySet<string>,
  theme: UiTheme,
): number {
  if (piece.id === selectedPieceId) return SELECTED_COLOUR
  if (fuseSelectionPieceIds.has(piece.id)) return FUSE_SELECTION_COLOUR
  return VIEWPORT_PALETTES[theme].pieceColours[piece.role]
}

function visibleStudyPieces(study: MassStudy): readonly ScenePiece[] {
  return [...study.pieces, ...study.retainedCore.pieces]
}

function createGrid(theme: UiTheme): THREE.GridHelper {
  const palette = VIEWPORT_PALETTES[theme]
  const grid = new THREE.GridHelper(
    6_000,
    60,
    palette.gridCentre,
    palette.grid,
  )
  grid.rotation.x = Math.PI / 2
  return grid
}

function geometryForPiece(piece: ScenePiece): THREE.BufferGeometry {
  if (piece.kind === 'box') {
    return new THREE.BoxGeometry(...piece.size)
  }
  if (piece.kind === 'mesh' || piece.kind === 'polygon-loft') {
    const mesh = piece.kind === 'mesh' ? piece : polygonLoftMesh(piece)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(mesh.positions, 3),
    )
    geometry.setIndex(new THREE.BufferAttribute(mesh.triangles, 1))
    geometry.computeVertexNormals()
    return geometry
  }
  return createFrustumGeometry(piece)
}

export function applyPieceAppearance(
  visual: PieceVisual,
  selectedPieceId: string,
  fuseSelectionPieceIds: ReadonlySet<string>,
  theme: UiTheme,
): void {
  const { piece, mesh, edges } = visual
  const core = piece.role === 'core'
  const colour = pieceColour(
    piece,
    selectedPieceId,
    fuseSelectionPieceIds,
    theme,
  )
  mesh.material.color.set(colour)
  mesh.material.opacity = core
    ? (piece.id === selectedPieceId ? 0.34 : 0.2)
    : 1
  edges.material.color.set(core ? colour : EDGE_COLOUR)
}

function createStabilityOverlay(study: MassStudy): THREE.Group {
  const overlay = new THREE.Group()
  overlay.name = 'stability-overlay'
  const { stability } = study
  const warning = stability.status === 'outside'
  const markerColour = warning ? STABILITY_WARNING_COLOUR : SELECTED_COLOUR
  const markerRadius = Math.max(5, Math.min(20, study.heightMm * 0.012))
  const overlayMaterial = (colour: number) => new THREE.LineBasicMaterial({
    color: colour,
    depthTest: false,
    transparent: true,
    opacity: 0.96,
  })

  if (stability.supportPolygonMm.length >= 3) {
    const points = stability.supportPolygonMm.map(
      ([x, y]) => new THREE.Vector3(x, y, 3),
    )
    const boundary = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      overlayMaterial(FUSE_SELECTION_COLOUR),
    )
    boundary.renderOrder = 5
    overlay.add(boundary)
  }

  if (stability.centreOfMassMm && stability.projectionMm) {
    const centre = new THREE.Mesh(
      new THREE.SphereGeometry(markerRadius, 12, 8),
      new THREE.MeshBasicMaterial({ color: markerColour, depthTest: false }),
    )
    centre.position.set(...stability.centreOfMassMm)
    centre.renderOrder = 6
    overlay.add(centre)

    const [x, y] = stability.projectionMm
    const projectionLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y, 4),
        new THREE.Vector3(...stability.centreOfMassMm),
      ]),
      overlayMaterial(markerColour),
    )
    projectionLine.renderOrder = 5
    overlay.add(projectionLine)

    const projection = new THREE.Mesh(
      new THREE.RingGeometry(markerRadius * 0.65, markerRadius, 20),
      new THREE.MeshBasicMaterial({
        color: markerColour,
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    )
    projection.position.set(x, y, 4)
    projection.renderOrder = 6
    overlay.add(projection)
  }

  return overlay
}

export function ViewportFailurePanel({
  message,
  onRetry,
}: {
  readonly message: string
  readonly onRetry: () => void
}) {
  return (
    <div className="viewport-error" role="alert">
      <strong>3D PREVIEW UNAVAILABLE</strong>
      <span>{message}</span>
      <button type="button" onClick={onRetry}>RETRY 3D</button>
    </div>
  )
}

export function Viewport({
  study,
  modelScale,
  uiTheme,
  selectedPieceId,
  fuseSelectionPieceIds,
  translationGizmo,
  onSelect,
  onTranslationStart,
  onTranslationChange,
  onTranslationEnd,
  onTranslationCancel,
}: ViewportProps) {
  const [viewportFailure, setViewportFailure] = useState<string>()
  const [rendererAttempt, setRendererAttempt] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const controlsRef = useRef<OrbitControls>(null)
  const keyLightRef = useRef<THREE.DirectionalLight>(null)
  const sceneRef = useRef<THREE.Scene>(null)
  const hemisphereLightRef = useRef<THREE.HemisphereLight>(null)
  const groundRef = useRef<THREE.Mesh>(null)
  const gridRef = useRef<THREE.GridHelper>(null)
  const modelRootRef = useRef<THREE.Group>(null)
  const translationObjectRef = useRef<THREE.Object3D>(null)
  const transformControlsRef = useRef<TransformControls>(null)
  const selectableRef = useRef<THREE.Mesh[]>([])
  const pieceVisualsRef = useRef(new Map<string, PieceVisual>())
  const pieceIdsRef = useRef(new Map<THREE.Object3D, string>())
  const requestRenderRef = useRef<() => void>(() => undefined)
  const onSelectRef = useRef(onSelect)
  const translationGizmoRef = useRef(translationGizmo)
  const onTranslationStartRef = useRef(onTranslationStart)
  const onTranslationChangeRef = useRef(onTranslationChange)
  const onTranslationEndRef = useRef(onTranslationEnd)
  const onTranslationCancelRef = useRef(onTranslationCancel)
  const selectedPieceIdRef = useRef(selectedPieceId)
  const fuseSelectionPieceIdsRef = useRef(new Set(fuseSelectionPieceIds))
  const studyRef = useRef(study)
  const wasEmptyRef = useRef(visibleStudyPieces(study).length === 0)
  const modelScaleRef = useRef(modelScale)
  const uiThemeRef = useRef(uiTheme)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    translationGizmoRef.current = translationGizmo
    onTranslationStartRef.current = onTranslationStart
    onTranslationChangeRef.current = onTranslationChange
    onTranslationEndRef.current = onTranslationEnd
    onTranslationCancelRef.current = onTranslationCancel
  }, [
    onTranslationCancel,
    onTranslationChange,
    onTranslationEnd,
    onTranslationStart,
    translationGizmo,
  ])

  useEffect(() => {
    selectedPieceIdRef.current = selectedPieceId
  }, [selectedPieceId])

  useEffect(() => {
    uiThemeRef.current = uiTheme
  }, [uiTheme])

  useEffect(() => {
    fuseSelectionPieceIdsRef.current = new Set(fuseSelectionPieceIds)
  }, [fuseSelectionPieceIds])

  useEffect(() => {
    studyRef.current = study
  }, [study])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const pieceIds = pieceIdsRef.current
    const pieceVisuals = pieceVisualsRef.current

    const palette = VIEWPORT_PALETTES[uiThemeRef.current]
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(palette.background)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(35, 1, 1, 12_000)
    camera.up.set(0, 0, 1)
    cameraRef.current = camera

    const rendererResult = createViewportRenderer(canvas)
    if (rendererResult.status === 'error') {
      sceneRef.current = null
      cameraRef.current = null
      setViewportFailure(rendererResult.message)
      return undefined
    }
    const { renderer } = rendererResult
    setViewportFailure(undefined)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 600
    controls.maxDistance = 6_000
    controlsRef.current = controls

    const hemisphereLight = new THREE.HemisphereLight(
      palette.hemisphereSky,
      palette.hemisphereGround,
      palette.hemisphereIntensity,
    )
    hemisphereLight.position.set(0, 0, 1)
    hemisphereLightRef.current = hemisphereLight
    scene.add(hemisphereLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(2_048, 2_048)
    keyLightRef.current = keyLight
    scene.add(keyLight, keyLight.target)

    const modelRoot = new THREE.Group()
    modelRootRef.current = modelRoot
    scene.add(modelRoot)

    const translationObject = new THREE.Object3D()
    translationObjectRef.current = translationObject
    scene.add(translationObject)

    const transformControls = new TransformControls(camera, canvas)
    transformControls.setMode('translate')
    transformControls.setSpace('world')
    transformControls.setSize(0.82)
    transformControls.setColors(SELECTED_COLOUR, FUSE_SELECTION_COLOUR, 0xf2f2ec, 0xffffff)
    transformControlsRef.current = transformControls
    scene.add(transformControls.getHelper())

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(8_000, 8_000),
      new THREE.MeshStandardMaterial({ color: palette.ground, roughness: 1 }),
    )
    ground.receiveShadow = true
    ground.position.z = -2
    groundRef.current = ground
    scene.add(ground)

    const grid = createGrid(uiThemeRef.current)
    gridRef.current = grid
    scene.add(grid)

    let frame: number | undefined
    let disposed = false
    let contextAvailable = true
    const requestRender = () => {
      if (disposed || !contextAvailable || frame !== undefined) return
      frame = requestAnimationFrame(renderFrame)
    }
    const renderFrame = () => {
      frame = undefined
      if (disposed || !contextAvailable) return
      const cameraChanged = controls.update()
      renderer.render(scene, camera)
      if (cameraChanged) requestRender()
    }
    requestRenderRef.current = requestRender
    const handleControlsChange = () => requestRender()
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      contextAvailable = false
      if (frame !== undefined) {
        cancelAnimationFrame(frame)
        frame = undefined
      }
      setViewportFailure(WEBGL_CONTEXT_FAILURE)
    }
    const handleContextRestored = () => {
      contextAvailable = true
      setViewportFailure(undefined)
      requestRender()
    }
    controls.addEventListener('change', handleControlsChange)
    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.addEventListener('webglcontextrestored', handleContextRestored)

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      if (bounds.width === 0 || bounds.height === 0) return
      renderer.setSize(bounds.width, bounds.height, false)
      camera.aspect = bounds.width / bounds.height
      camera.updateProjectionMatrix()
      requestRender()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    fitPerspectiveCamera(camera, controls, studyRef.current.bounds, true)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let gizmoDragging = false
    let dragCancelled = false
    let dragChanged = false
    let dragStartTarget: TranslationGizmoTarget | undefined
    let lastEmittedValue: Vec3 | undefined
    let pointerStart:
      | { readonly id: number; readonly x: number; readonly y: number }
      | undefined
    const rememberPointer = (event: PointerEvent) => {
      if (event.button !== 0 || gizmoDragging) return
      pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY }
    }
    const selectAtPointer = (event: PointerEvent) => {
      const start = pointerStart
      pointerStart = undefined
      if (!start || start.id !== event.pointerId) return
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) {
        return
      }
      const bounds = canvas.getBoundingClientRect()
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(selectableRef.current, false)[0]
      const pieceId = hit ? pieceIds.get(hit.object) : undefined
      if (pieceId) onSelectRef.current(pieceId)
    }
    const cancelPointer = () => {
      pointerStart = undefined
    }
    const equalValue = (left: Vec3 | undefined, right: Vec3) =>
      left !== undefined && left.every((value, axis) => value === right[axis])
    const handleGizmoMouseDown = () => {
      const target = translationGizmoRef.current
      if (!target) return
      pointerStart = undefined
      dragCancelled = false
      dragChanged = false
      dragStartTarget = target
      lastEmittedValue = target.valueDesignMm
      onTranslationStartRef.current(target)
      requestRender()
    }
    const handleGizmoObjectChange = () => {
      if (!dragStartTarget) return
      const next = translatedGizmoValue(
        dragStartTarget,
        translationObject.position.toArray(),
        modelScaleRef.current,
      )
      if (equalValue(lastEmittedValue, next)) return
      lastEmittedValue = next
      dragChanged = dragChanged || !equalValue(dragStartTarget.valueDesignMm, next)
      onTranslationChangeRef.current(dragStartTarget, next)
      requestRender()
    }
    const handleGizmoMouseUp = () => {
      if (!dragStartTarget) return
      if (dragCancelled) {
        onTranslationCancelRef.current(dragStartTarget)
      } else {
        onTranslationEndRef.current(dragStartTarget, dragChanged)
      }
      dragStartTarget = undefined
      lastEmittedValue = undefined
      dragCancelled = false
      dragChanged = false
      requestRender()
    }
    const handleDraggingChanged = (event: { readonly value: unknown }) => {
      gizmoDragging = event.value === true
      controls.enabled = !gizmoDragging
      if (gizmoDragging) pointerStart = undefined
      requestRender()
    }
    const cancelGizmo = () => {
      if (!transformControls.dragging) return
      dragCancelled = true
      transformControls.reset()
      transformControls.pointerUp(null)
      controls.enabled = true
      gizmoDragging = false
      requestRender()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !transformControls.dragging) return
      event.preventDefault()
      event.stopPropagation()
      cancelGizmo()
    }
    const handlePointerCancel = () => {
      cancelPointer()
      cancelGizmo()
    }
    transformControls.addEventListener('mouseDown', handleGizmoMouseDown)
    transformControls.addEventListener('objectChange', handleGizmoObjectChange)
    transformControls.addEventListener('mouseUp', handleGizmoMouseUp)
    transformControls.addEventListener('dragging-changed', handleDraggingChanged)
    canvas.addEventListener('pointerdown', rememberPointer)
    canvas.addEventListener('pointerup', selectAtPointer)
    canvas.addEventListener('pointercancel', handlePointerCancel)
    window.addEventListener('keydown', handleKeyDown)

    requestRender()

    return () => {
      disposed = true
      if (frame !== undefined) cancelAnimationFrame(frame)
      requestRenderRef.current = () => undefined
      canvas.removeEventListener('pointerdown', rememberPointer)
      canvas.removeEventListener('pointerup', selectAtPointer)
      canvas.removeEventListener('pointercancel', handlePointerCancel)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
      window.removeEventListener('keydown', handleKeyDown)
      controls.removeEventListener('change', handleControlsChange)
      transformControls.removeEventListener('mouseDown', handleGizmoMouseDown)
      transformControls.removeEventListener('objectChange', handleGizmoObjectChange)
      transformControls.removeEventListener('mouseUp', handleGizmoMouseUp)
      transformControls.removeEventListener('dragging-changed', handleDraggingChanged)
      observer.disconnect()
      const activeGrid = gridRef.current ?? grid
      disposeViewportRuntime({
        scene,
        modelRoot,
        ground,
        grid: activeGrid,
        keyLight,
        controls,
        transformControls,
        renderer,
      })
      cameraRef.current = null
      controlsRef.current = null
      keyLightRef.current = null
      sceneRef.current = null
      hemisphereLightRef.current = null
      groundRef.current = null
      gridRef.current = null
      modelRootRef.current = null
      translationObjectRef.current = null
      transformControlsRef.current = null
      selectableRef.current = []
      pieceVisuals.clear()
      pieceIds.clear()
    }
  }, [rendererAttempt])

  useEffect(() => {
    translationGizmoRef.current = translationGizmo
    const object = translationObjectRef.current
    const controls = transformControlsRef.current
    if (!object || !controls) return
    if (!translationGizmo) {
      controls.detach()
      requestRenderRef.current()
      return
    }
    if (controls.dragging) return

    object.position.set(...translationGizmo.anchorModelMm)
    controls.attach(object)
    controls.showX = true
    controls.showY = true
    controls.showZ = translationGizmo.axes === 'xyz'
    controls.showXY = true
    controls.showYZ = translationGizmo.axes === 'xyz'
    controls.showXZ = translationGizmo.axes === 'xyz'
    controls.showXYZE = false
    controls.showE = false
    controls.setTranslationSnap(modelScale)

    const bounded = controls as TransformControls & { minX: number }
    bounded.minX = translationGizmo.anchorModelMm[0] +
      (translationGizmo.minimumDesignMm[0] - translationGizmo.valueDesignMm[0]) * modelScale
    bounded.maxX = translationGizmo.anchorModelMm[0] +
      (translationGizmo.maximumDesignMm[0] - translationGizmo.valueDesignMm[0]) * modelScale
    bounded.minY = translationGizmo.anchorModelMm[1] +
      (translationGizmo.minimumDesignMm[1] - translationGizmo.valueDesignMm[1]) * modelScale
    bounded.maxY = translationGizmo.anchorModelMm[1] +
      (translationGizmo.maximumDesignMm[1] - translationGizmo.valueDesignMm[1]) * modelScale
    bounded.minZ = translationGizmo.anchorModelMm[2] +
      (translationGizmo.minimumDesignMm[2] - translationGizmo.valueDesignMm[2]) * modelScale
    bounded.maxZ = translationGizmo.anchorModelMm[2] +
      (translationGizmo.maximumDesignMm[2] - translationGizmo.valueDesignMm[2]) * modelScale
    requestRenderRef.current()
  }, [modelScale, rendererAttempt, translationGizmo])

  useEffect(() => {
    const root = modelRootRef.current
    if (!root) return

    for (const child of [...root.children]) {
      root.remove(child)
      disposeObjectTree(child)
    }
    selectableRef.current = []
    pieceVisualsRef.current.clear()
    pieceIdsRef.current.clear()

    for (const piece of visibleStudyPieces(study)) {
      const geometry = geometryForPiece(piece)
      const core = piece.role === 'core'
      const material = new THREE.MeshStandardMaterial({
        color: pieceColour(
          piece,
          selectedPieceIdRef.current,
          fuseSelectionPieceIdsRef.current,
          uiThemeRef.current,
        ),
        metalness: 0,
        roughness: 0.92,
        flatShading: true,
        transparent: core,
        opacity: core ? (piece.id === selectedPieceIdRef.current ? 0.34 : 0.2) : 1,
        depthTest: !core,
        depthWrite: !core,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...piece.position)
      mesh.castShadow = !core
      mesh.receiveShadow = !core
      mesh.renderOrder = core ? 2 : 0
      root.add(mesh)
      selectableRef.current.push(mesh)
      pieceIdsRef.current.set(mesh, piece.id)

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 15),
        new THREE.LineBasicMaterial({
          color: core ? pieceColour(
            piece,
            selectedPieceIdRef.current,
            fuseSelectionPieceIdsRef.current,
            uiThemeRef.current,
          ) : 0x30302e,
          transparent: true,
          opacity: core ? 0.92 : 0.42,
          depthTest: !core,
        }),
      )
      edges.position.copy(mesh.position)
      edges.renderOrder = core ? 3 : 0
      root.add(edges)
      const visual = { piece, mesh, edges }
      pieceVisualsRef.current.set(piece.id, visual)
      applyPieceAppearance(
        visual,
        selectedPieceIdRef.current,
        fuseSelectionPieceIdsRef.current,
        uiThemeRef.current,
      )
    }
    root.add(createStabilityOverlay(study))
    const keyLight = keyLightRef.current
    if (keyLight) fitDirectionalShadow(keyLight, study.bounds)
    const visiblePieces = visibleStudyPieces(study)
    const restoredFromEmpty = wasEmptyRef.current && visiblePieces.length > 0
    wasEmptyRef.current = visiblePieces.length === 0
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (restoredFromEmpty && camera && controls) {
      fitPerspectiveCamera(camera, controls, study.bounds, false)
    }
    requestRenderRef.current()
  }, [rendererAttempt, study])

  useEffect(() => {
    for (const visual of pieceVisualsRef.current.values()) {
      applyPieceAppearance(
        visual,
        selectedPieceId,
        fuseSelectionPieceIdsRef.current,
        uiTheme,
      )
    }
    requestRenderRef.current()
  }, [fuseSelectionPieceIds, selectedPieceId, uiTheme])

  useEffect(() => {
    const palette = VIEWPORT_PALETTES[uiTheme]
    const scene = sceneRef.current
    if (scene) {
      scene.background = new THREE.Color(palette.background)
    }

    const hemisphereLight = hemisphereLightRef.current
    if (hemisphereLight) {
      hemisphereLight.color.set(palette.hemisphereSky)
      hemisphereLight.groundColor.set(palette.hemisphereGround)
      hemisphereLight.intensity = palette.hemisphereIntensity
    }

    const ground = groundRef.current
    if (ground?.material instanceof THREE.MeshStandardMaterial) {
      ground.material.color.set(palette.ground)
    }

    const previousGrid = gridRef.current
    if (scene && previousGrid) {
      const nextGrid = createGrid(uiTheme)
      scene.remove(previousGrid)
      scene.add(nextGrid)
      disposeObjectTree(previousGrid)
      gridRef.current = nextGrid
    }
    requestRenderRef.current()
  }, [uiTheme])

  useEffect(() => {
    if (modelScaleRef.current === modelScale) return
    modelScaleRef.current = modelScale
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    fitPerspectiveCamera(camera, controls, studyRef.current.bounds, false)
    requestRenderRef.current()
  }, [modelScale])

  const fitView = (useHomeDirection: boolean) => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    fitPerspectiveCamera(camera, controls, studyRef.current.bounds, useHomeDirection)
    requestRenderRef.current()
  }

  const retryViewport = () => {
    setViewportFailure(undefined)
    setRendererAttempt((attempt) => attempt + 1)
  }

  return (
    <div className="viewport-shell">
      <canvas ref={canvasRef} aria-label="Interactive 3D massing viewport" />
      {viewportFailure ? (
        <ViewportFailurePanel
          message={viewportFailure}
          onRetry={retryViewport}
        />
      ) : (
        <>
          {visibleStudyPieces(study).length === 0 ? (
            <div className="viewport-empty" role="status">
              <strong>NO PARTS VISIBLE</strong>
              <span>Restore a part from Objects, or use Undo.</span>
            </div>
          ) : null}
          <div className="viewport-controls" aria-label="Viewport controls">
            <button type="button" onClick={() => fitView(false)}>
              FIT
            </button>
            <button type="button" onClick={() => fitView(true)}>
              HOME
            </button>
          </div>
          {translationGizmo ? (
            <div className="viewport-gizmo-status" role="status">
              <span>MOVE {translationGizmo.axes.toUpperCase()}</span>
              <strong>{translationGizmo.label}</strong>
              <small>1 MM DESIGN SNAP · ESC CANCELS</small>
            </div>
          ) : null}
          <div className="viewport-meta viewport-meta--left">
            PERSPECTIVE · Z UP · MM
          </div>
          <div className="viewport-meta viewport-meta--right">
            {translationGizmo
              ? 'DRAG HANDLE TO MOVE · EMPTY SPACE TO ORBIT'
              : 'DRAG TO ORBIT · SCROLL TO ZOOM'}
          </div>
        </>
      )}
    </div>
  )
}
