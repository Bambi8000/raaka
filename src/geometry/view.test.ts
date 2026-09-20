import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import type { Bounds3 } from '../core/types'
import {
  boundsCorners,
  fitDirectionalShadow,
  fitPerspectiveCamera,
  shadowFitPoints,
} from './view'

const BOUNDS: Bounds3 = {
  min: [-700, -300, 0],
  max: [700, 300, 2_000],
}

describe('view fitting', () => {
  it('frames every model corner in the perspective camera', () => {
    const camera = new THREE.PerspectiveCamera(35, 16 / 9, 1, 12_000)
    camera.up.set(0, 0, 1)
    const controls = {
      target: new THREE.Vector3(),
      minDistance: 0,
      maxDistance: 0,
      update: () => undefined,
    }

    fitPerspectiveCamera(camera, controls, BOUNDS, true)
    camera.lookAt(controls.target)
    camera.updateMatrixWorld(true)

    for (const corner of boundsCorners(BOUNDS)) {
      const projected = corner.project(camera)
      expect(Math.abs(projected.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(projected.y)).toBeLessThanOrEqual(1)
      expect(projected.z).toBeGreaterThanOrEqual(-1)
      expect(projected.z).toBeLessThanOrEqual(1)
    }
  })

  it('fits both a one-metre and two-metre model plus its ground receiver into the shadow camera', () => {
    for (const height of [1_000, 2_000]) {
      const bounds: Bounds3 = {
        min: [-700, -300, 0],
        max: [700, 300, height],
      }
      const light = new THREE.DirectionalLight()

      fitDirectionalShadow(light, bounds)
      light.shadow.updateMatrices(light)
      const camera = light.shadow.camera

      for (const point of shadowFitPoints(bounds)) {
        const cameraPoint = point.applyMatrix4(camera.matrixWorldInverse)
        const depth = -cameraPoint.z
        expect(cameraPoint.x).toBeGreaterThanOrEqual(camera.left)
        expect(cameraPoint.x).toBeLessThanOrEqual(camera.right)
        expect(cameraPoint.y).toBeGreaterThanOrEqual(camera.bottom)
        expect(cameraPoint.y).toBeLessThanOrEqual(camera.top)
        expect(depth).toBeGreaterThanOrEqual(camera.near)
        expect(depth).toBeLessThanOrEqual(camera.far)
      }

      light.shadow.dispose()
    }
  })
})
