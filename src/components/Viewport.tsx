import { useEffect, useRef } from 'react'
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

function disposeGrid(grid: THREE.GridHelper): void {
  grid.geometry.dispose()
  const materials = grid.material as THREE.Material | THREE.Material[]
  if (Array.isArray(materials)) {
    for (const material of materials) material.dispose()
    return
  }
  materials.dispose()
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

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      const renderable = child as THREE.Mesh<
        THREE.BufferGeometry,
        THREE.Material | THREE.Material[]
      >
      renderable.geometry.dispose()
      const materials = Array.isArray(renderable.material)
        ? renderable.material
        : [renderable.material]
      for (const material of materials) material.dispose()
    }
  })
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
  const pieceIdsRef = useRef(new Map<THREE.Object3D, string>())
  const onSelectRef = useRef(onSelect)
  const translationGizmoRef = useRef(translationGizmo)
  const onTranslationStartRef = useRef(onTranslationStart)
  const onTranslationChangeRef = useRef(onTranslationChange)
  const onTranslationEndRef = useRef(onTranslationEnd)
  const onTranslationCancelRef = useRef(onTranslationCancel)
  const selectedPieceIdRef = useRef(selectedPieceId)
  const fuseSelectionPieceIdsRef = useRef(new Set(fuseSelectionPieceIds))
  const studyRef = useRef(study)
  const wasEmptyRef = useRef(study.pieces.length === 0)
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

    const palette = VIEWPORT_PALETTES[uiThemeRef.current]
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(palette.background)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(35, 1, 1, 12_000)
    camera.up.set(0, 0, 1)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
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

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      if (bounds.width === 0 || bounds.height === 0) return
      renderer.setSize(bounds.width, bounds.height, false)
      camera.aspect = bounds.width / bounds.height
      camera.updateProjectionMatrix()
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
    }
    const handleDraggingChanged = (event: { readonly value: unknown }) => {
      gizmoDragging = event.value === true
      controls.enabled = !gizmoDragging
      if (gizmoDragging) pointerStart = undefined
    }
    const cancelGizmo = () => {
      if (!transformControls.dragging) return
      dragCancelled = true
      transformControls.reset()
      transformControls.pointerUp(null)
      controls.enabled = true
      gizmoDragging = false
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

    let frame = 0
    const render = () => {
      controls.update()
      renderer.render(scene, camera)
      frame = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(frame)
      canvas.removeEventListener('pointerdown', rememberPointer)
      canvas.removeEventListener('pointerup', selectAtPointer)
      canvas.removeEventListener('pointercancel', handlePointerCancel)
      window.removeEventListener('keydown', handleKeyDown)
      transformControls.removeEventListener('mouseDown', handleGizmoMouseDown)
      transformControls.removeEventListener('objectChange', handleGizmoObjectChange)
      transformControls.removeEventListener('mouseUp', handleGizmoMouseUp)
      transformControls.removeEventListener('dragging-changed', handleDraggingChanged)
      observer.disconnect()
      controls.dispose()
      transformControls.dispose()
      disposeObject(modelRoot)
      ground.geometry.dispose()
      ;(ground.material as THREE.Material).dispose()
      const activeGrid = gridRef.current
      if (activeGrid) disposeGrid(activeGrid)
      keyLight.shadow.dispose()
      renderer.dispose()
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
      pieceIds.clear()
    }
  }, [])

  useEffect(() => {
    translationGizmoRef.current = translationGizmo
    const object = translationObjectRef.current
    const controls = transformControlsRef.current
    if (!object || !controls) return
    if (!translationGizmo) {
      controls.detach()
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
  }, [modelScale, translationGizmo])

  useEffect(() => {
    const root = modelRootRef.current
    if (!root) return

    for (const child of [...root.children]) {
      root.remove(child)
      disposeObject(child)
    }
    selectableRef.current = []
    pieceIdsRef.current.clear()

    for (const piece of study.pieces) {
      const geometry = geometryForPiece(piece)
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
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...piece.position)
      mesh.castShadow = true
      mesh.receiveShadow = true
      root.add(mesh)
      selectableRef.current.push(mesh)
      pieceIdsRef.current.set(mesh, piece.id)

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 15),
        new THREE.LineBasicMaterial({
          color: 0x30302e,
          transparent: true,
          opacity: 0.42,
        }),
      )
      edges.position.copy(mesh.position)
      root.add(edges)
    }
    const keyLight = keyLightRef.current
    if (keyLight) fitDirectionalShadow(keyLight, study.bounds)
    const restoredFromEmpty = wasEmptyRef.current && study.pieces.length > 0
    wasEmptyRef.current = study.pieces.length === 0
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (restoredFromEmpty && camera && controls) {
      fitPerspectiveCamera(camera, controls, study.bounds, false)
    }
  }, [study])

  useEffect(() => {
    for (const mesh of selectableRef.current) {
      const pieceId = pieceIdsRef.current.get(mesh)
      const piece = studyRef.current.pieces.find(({ id }) => id === pieceId)
      const material = mesh.material
      if (!piece || !(material instanceof THREE.MeshStandardMaterial)) continue
      material.color.set(
        pieceColour(
          piece,
          selectedPieceId,
          fuseSelectionPieceIdsRef.current,
          uiTheme,
        ),
      )
    }
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
      disposeGrid(previousGrid)
      gridRef.current = nextGrid
    }
  }, [uiTheme])

  useEffect(() => {
    if (modelScaleRef.current === modelScale) return
    modelScaleRef.current = modelScale
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    fitPerspectiveCamera(camera, controls, studyRef.current.bounds, false)
  }, [modelScale])

  const fitView = (useHomeDirection: boolean) => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    fitPerspectiveCamera(camera, controls, studyRef.current.bounds, useHomeDirection)
  }

  return (
    <div className="viewport-shell">
      <canvas ref={canvasRef} aria-label="Interactive 3D massing viewport" />
      {study.pieces.length === 0 ? (
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
    </div>
  )
}
