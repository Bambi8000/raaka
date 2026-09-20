import * as THREE from 'three'
import type { Bounds3 } from '../core/types'

interface CameraControls {
  readonly target: THREE.Vector3
  minDistance: number
  maxDistance: number
  update: () => void
}

const HOME_DIRECTION = new THREE.Vector3(1.2, -1.5, 0.92).normalize()

export function boundsCorners(bounds: Bounds3): THREE.Vector3[] {
  const corners: THREE.Vector3[] = []
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        corners.push(new THREE.Vector3(x, y, z))
      }
    }
  }
  return corners
}

function boundsCentre(bounds: Bounds3): THREE.Vector3 {
  return new THREE.Vector3(
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  )
}

function boundsDiagonal(bounds: Bounds3): number {
  return new THREE.Vector3(
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  ).length()
}

export function fitPerspectiveCamera(
  camera: THREE.PerspectiveCamera,
  controls: CameraControls,
  bounds: Bounds3,
  useHomeDirection: boolean,
): void {
  const centre = boundsCentre(bounds)
  const radius = Math.max(boundsDiagonal(bounds) / 2, 1)
  const currentDirection = camera.position.clone().sub(controls.target)
  const direction =
    useHomeDirection || currentDirection.lengthSq() < 0.0001
      ? HOME_DIRECTION.clone()
      : currentDirection.normalize()
  const verticalFov = THREE.MathUtils.degToRad(camera.fov)
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect)
  const limitingFov = Math.min(verticalFov, horizontalFov)
  const distance = (radius / Math.sin(limitingFov / 2)) * 1.12

  controls.target.copy(centre)
  camera.position.copy(centre).addScaledVector(direction, distance)
  camera.near = Math.max(1, distance - radius * 1.5)
  camera.far = Math.max(6_000, distance + radius * 4)
  controls.minDistance = Math.max(100, radius * 0.3)
  controls.maxDistance = Math.max(6_000, radius * 10)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
  controls.update()
}

export function shadowFitPoints(bounds: Bounds3): THREE.Vector3[] {
  const sizeX = bounds.max[0] - bounds.min[0]
  const sizeY = bounds.max[1] - bounds.min[1]
  const sizeZ = bounds.max[2] - bounds.min[2]
  const span = Math.max(sizeX, sizeY, sizeZ, 1)
  const receiverPadding = span * 0.45
  const groundZ = bounds.min[2] - 2

  return [
    ...boundsCorners(bounds),
    new THREE.Vector3(
      bounds.min[0] - receiverPadding,
      bounds.min[1] - receiverPadding,
      groundZ,
    ),
    new THREE.Vector3(
      bounds.max[0] + receiverPadding,
      bounds.min[1] - receiverPadding,
      groundZ,
    ),
    new THREE.Vector3(
      bounds.max[0] + receiverPadding,
      bounds.max[1] + receiverPadding,
      groundZ,
    ),
    new THREE.Vector3(
      bounds.min[0] - receiverPadding,
      bounds.max[1] + receiverPadding,
      groundZ,
    ),
  ]
}

export function fitDirectionalShadow(
  light: THREE.DirectionalLight,
  bounds: Bounds3,
): void {
  const centre = boundsCentre(bounds)
  const sizeX = bounds.max[0] - bounds.min[0]
  const sizeY = bounds.max[1] - bounds.min[1]
  const sizeZ = bounds.max[2] - bounds.min[2]
  const span = Math.max(sizeX, sizeY, sizeZ, 1)

  light.position.set(
    centre.x - span * 1.3,
    centre.y - span * 1.6,
    bounds.max[2] + span * 1.8,
  )
  light.target.position.copy(centre)
  light.updateMatrixWorld(true)
  light.target.updateMatrixWorld(true)
  light.shadow.updateMatrices(light)

  const shadowCamera = light.shadow.camera
  const cameraPoints = shadowFitPoints(bounds).map((point) =>
    point.applyMatrix4(shadowCamera.matrixWorldInverse),
  )
  const padding = span * 0.12
  const xValues = cameraPoints.map((point) => point.x)
  const yValues = cameraPoints.map((point) => point.y)
  const depthValues = cameraPoints.map((point) => -point.z)

  shadowCamera.left = Math.min(...xValues) - padding
  shadowCamera.right = Math.max(...xValues) + padding
  shadowCamera.bottom = Math.min(...yValues) - padding
  shadowCamera.top = Math.max(...yValues) + padding
  shadowCamera.near = Math.max(0.1, Math.min(...depthValues) - padding)
  shadowCamera.far = Math.max(...depthValues) + padding
  shadowCamera.updateProjectionMatrix()
}
