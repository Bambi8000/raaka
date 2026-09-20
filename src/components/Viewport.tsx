import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { MassStudy, PieceRole, ScenePiece } from '../core/types'
import { createFrustumGeometry } from '../geometry/frustum'
import { fitDirectionalShadow, fitPerspectiveCamera } from '../geometry/view'

interface ViewportProps {
  readonly study: MassStudy
  readonly selectedPieceId: string
  readonly onSelect: (pieceId: string) => void
}

const BASE_COLOURS: Readonly<Record<PieceRole, number>> = {
  mass: 0xb8b8b1,
  support: 0x8f8f88,
  surface: 0xecece8,
  core: 0x287bc1,
  void: 0xe33b97,
}

const SELECTED_COLOUR = 0xffd400

function geometryForPiece(piece: ScenePiece): THREE.BufferGeometry {
  if (piece.kind === 'box') {
    return new THREE.BoxGeometry(...piece.size)
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
  selectedPieceId,
  onSelect,
}: ViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const controlsRef = useRef<OrbitControls>(null)
  const keyLightRef = useRef<THREE.DirectionalLight>(null)
  const modelRootRef = useRef<THREE.Group>(null)
  const selectableRef = useRef<THREE.Mesh[]>([])
  const pieceIdsRef = useRef(new Map<THREE.Object3D, string>())
  const onSelectRef = useRef(onSelect)
  const selectedPieceIdRef = useRef(selectedPieceId)
  const studyRef = useRef(study)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    selectedPieceIdRef.current = selectedPieceId
  }, [selectedPieceId])

  useEffect(() => {
    studyRef.current = study
  }, [study])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const pieceIds = pieceIdsRef.current

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xd9d9d4)
    scene.fog = new THREE.Fog(0xd9d9d4, 2_500, 5_500)

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
      0xffffff,
      0x5b5b57,
      2.2,
    )
    hemisphereLight.position.set(0, 0, 1)
    scene.add(hemisphereLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(2_048, 2_048)
    keyLightRef.current = keyLight
    scene.add(keyLight, keyLight.target)

    const modelRoot = new THREE.Group()
    modelRootRef.current = modelRoot
    scene.add(modelRoot)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(8_000, 8_000),
      new THREE.MeshStandardMaterial({ color: 0xc9c9c4, roughness: 1 }),
    )
    ground.receiveShadow = true
    ground.position.z = -2
    scene.add(ground)

    const grid = new THREE.GridHelper(6_000, 60, 0x8d8d87, 0xbebeb8)
    grid.rotation.x = Math.PI / 2
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
    let pointerStart:
      | { readonly id: number; readonly x: number; readonly y: number }
      | undefined
    const rememberPointer = (event: PointerEvent) => {
      if (event.button !== 0) return
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
    canvas.addEventListener('pointerdown', rememberPointer)
    canvas.addEventListener('pointerup', selectAtPointer)
    canvas.addEventListener('pointercancel', cancelPointer)

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
      canvas.removeEventListener('pointercancel', cancelPointer)
      observer.disconnect()
      controls.dispose()
      disposeObject(modelRoot)
      ground.geometry.dispose()
      ;(ground.material as THREE.Material).dispose()
      grid.geometry.dispose()
      ;(grid.material as THREE.Material).dispose()
      keyLight.shadow.dispose()
      renderer.dispose()
      cameraRef.current = null
      controlsRef.current = null
      keyLightRef.current = null
      modelRootRef.current = null
      selectableRef.current = []
      pieceIds.clear()
    }
  }, [])

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
        color:
          piece.id === selectedPieceIdRef.current
            ? SELECTED_COLOUR
            : BASE_COLOURS[piece.role],
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
  }, [study])

  useEffect(() => {
    for (const mesh of selectableRef.current) {
      const pieceId = pieceIdsRef.current.get(mesh)
      const piece = studyRef.current.pieces.find(({ id }) => id === pieceId)
      const material = mesh.material
      if (!piece || !(material instanceof THREE.MeshStandardMaterial)) continue
      material.color.set(
        piece.id === selectedPieceId
          ? SELECTED_COLOUR
          : BASE_COLOURS[piece.role],
      )
    }
  }, [selectedPieceId])

  const fitView = (useHomeDirection: boolean) => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    fitPerspectiveCamera(camera, controls, studyRef.current.bounds, useHomeDirection)
  }

  return (
    <div className="viewport-shell">
      <canvas ref={canvasRef} aria-label="Interactive 3D massing viewport" />
      <div className="viewport-controls" aria-label="Viewport controls">
        <button type="button" onClick={() => fitView(false)}>
          FIT
        </button>
        <button type="button" onClick={() => fitView(true)}>
          HOME
        </button>
      </div>
      <div className="viewport-meta viewport-meta--left">
        PERSPECTIVE · Z UP · MM
      </div>
      <div className="viewport-meta viewport-meta--right">
        DRAG TO ORBIT · SCROLL TO ZOOM
      </div>
    </div>
  )
}
