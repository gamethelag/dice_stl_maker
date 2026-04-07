import * as jscad from '@jscad/modeling'

const { mat4 } = jscad.maths

/**
 * Build a JSCAD mat4 that places an emboss shape onto a die face.
 *
 * The Z column is ALWAYS +normal so the matrix has a positive determinant
 * (right-handed system).  Flipping the Z column to -normal gives det = -1,
 * which mirrors all polygon windings and turns subtract into intersect.
 *
 * For cut mode the caller positions the shape's base below the die surface
 * and extrudes outward (+normal) so the shape still crosses the face plane.
 *
 * @param {object} face       - { center, normal, uBasis, vBasis, faceRadius }
 * @param {number} offsetU    - offset in face U direction (mm)
 * @param {number} offsetV    - offset in face V direction (mm)
 * @param {number} rotDeg     - rotation in degrees
 * @param {number} pushBack   - offset along +normal (negative = below surface)
 */
export function buildFaceEmbossMatrix(face, offsetU, offsetV, rotDeg, pushBack) {
  const { center, normal, uBasis, vBasis } = face
  const cosA = Math.cos(rotDeg * Math.PI / 180)
  const sinA = Math.sin(rotDeg * Math.PI / 180)

  // Rotated face axes
  const ux = cosA * uBasis[0] - sinA * vBasis[0]
  const uy = cosA * uBasis[1] - sinA * vBasis[1]
  const uz = cosA * uBasis[2] - sinA * vBasis[2]

  const vx = sinA * uBasis[0] + cosA * vBasis[0]
  const vy = sinA * uBasis[1] + cosA * vBasis[1]
  const vz = sinA * uBasis[2] + cosA * vBasis[2]

  // Z column: always +normal (outward) — keeps det = +1, normals preserved
  const nx = normal[0], ny = normal[1], nz = normal[2]

  // Origin: face center + in-plane offset + pushBack along +normal
  const ox = center[0] + offsetU * uBasis[0] + offsetV * vBasis[0] + pushBack * normal[0]
  const oy = center[1] + offsetU * uBasis[1] + offsetV * vBasis[1] + pushBack * normal[1]
  const oz = center[2] + offsetU * uBasis[2] + offsetV * vBasis[2] + pushBack * normal[2]

  return mat4.fromValues(
    ux, uy, uz, 0,
    vx, vy, vz, 0,
    nx, ny, nz, 0,
    ox, oy, oz, 1
  )
}
