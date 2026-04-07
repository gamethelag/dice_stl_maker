import * as jscad from '@jscad/modeling'
import { getD20Vertices, D20_FACE_INDICES } from '../geometry/D20Geometry.js'

export function buildD20Solid(sizeInMM) {
  const points = getD20Vertices(sizeInMM)
  return jscad.primitives.polyhedron({
    points,
    faces: D20_FACE_INDICES,
    orientation: 'outward',
  })
}
