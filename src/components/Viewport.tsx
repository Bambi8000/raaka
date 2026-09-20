import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { MassStudy, PieceRole, ScenePiece } from '../core/types'
import { createFrustumGeometry } from '../geometry/frustum'

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
  const modelRootRef = useRef<THREE.Group>(null)
  const selectableRef = useRef<THREE.Mesh[]>([])
  const pieceIdsRef = useRef(new Map<THREE.Object3D, string>())
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

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

    scene.add(new THREE.HemisphereLight(0xffffff, 0x5b5b57, 2.2))

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4)
    keyLight.position.set(-1_500, -2_000, 3_200)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(2_048, 2_048)
    keyLight.shadow.camera.left = -2_000
    keyLight.shadow.camera.right = 2_000
    keyLight.shadow.camera.top = 2_000
    keyLight.shadow.camera.bottom = -2_000
    scene.add(keyLight)

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

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const selectAtPointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect()
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(selectableRef.current, false)[0]
      const pieceId = hit ? pieceIds.get(hit.object) : undefined
      if (pieceId) onSelectRef.current(pieceId)
    }
    canvas.addEventListener('pointerdown', selectAtPointer)

    let frame = 0
    const render = () => {
      controls.update()
      renderer.render(scene, camera)
      frame = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(frame)
      canvas.removeEventListener('pointerdown', selectAtPointer)
      observer.disconnect()
      controls.dispose()
      ground.geometry.dispose()
      ;(ground.material as THREE.Material).dispose()
      grid.geometry.dispose()
      ;(grid.material as THREE.Material).dispose()
      renderer.dispose()
      cameraRef.current = null
      controlsRef.current = null
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
          piece.id === selectedPieceId
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
  }, [selectedPieceId, study])

  useEffect(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    const height = study.heightMm
    camera.position.set(height * 1.2, -height * 1.5, height * 0.92)
    controls.target.set(0, 0, height * 0.47)
    controls.update()
  }, [study.heightMm, study.seed])

  return (
    <div className="viewport-shell">
      <canvas ref={canvasRef} aria-label="Interactive 3D massing viewport" />
      <div className="viewport-meta viewport-meta--left">
        PERSPECTIVE · Z UP · MM
      </div>
      <div className="viewport-meta viewport-meta--right">
        DRAG TO ORBIT · SCROLL TO ZOOM
      </div>
    </div>
  )
}
