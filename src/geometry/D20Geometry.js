import { sub3, normalize3, cross3, dot3, scale3, len3 } from './vectorMath.js'

const PHI = (1 + Math.sqrt(5)) / 2

// 20 face triplets — stable ordering, index 0–19 maps to D20_NUMBERS[index]
export const D20_FACE_INDICES = [
  [0,1,8],  [0,8,4],  [0,4,5],  [0,5,10], [0,10,1],
  [3,2,9],  [3,9,6],  [3,6,7],  [3,7,11], [3,11,2],
  [1,6,8],  [8,6,9],  [8,9,4],  [4,9,2],  [4,2,5],
  [5,2,11], [5,11,10],[10,11,7],[10,7,1],  [1,7,6],
]

// Numbers assigned so opposite faces always sum to 21 (D+1 convention).
// Opposite pairs (by antipodal vertices): (0,9),(1,8),(2,7),(3,6),(4,5),
//   (10,15),(11,16),(12,17),(13,18),(14,19)
export const D20_NUMBERS = [
  1, 19, 9, 11, 13, 8, 10, 12, 2, 20,
  7, 17, 3, 16, 6, 14, 4, 18, 5, 15,
]

// Spindown layout: each consecutive number pair is on an adjacent face,
// so you can count down from 20 to 1 by moving to adjacent faces.
// Hamiltonian path through adjacency graph: faces [0,1,2,3,4,18,17,16,15,14,13,12,11,10,19,7,8,9,5,6]
// → number n assigned to the face at path position n-1.
export const SPINDOWN_NUMBERS = [
  1, 2, 3, 4, 5, 19, 20, 16, 17, 18, 14, 13, 12, 11, 10, 9, 8, 7, 6, 15,
]

// Size conversion constants (regular icosahedron geometry)
// Raw vertices have circumradius = sqrt(1 + PHI²); edge length = 2 in raw space.
const SQRT_1_PHI2 = Math.sqrt(1 + PHI * PHI)  // ≈ 1.9021
export const SIZE_EDGE_FACTOR   = 1 / SQRT_1_PHI2          // sizeInMM * this = edgeLength
export const SIZE_HEIGHT_FACTOR = Math.sqrt(3) / 2 / SQRT_1_PHI2  // sizeInMM * this = faceHeight

// Rotation that places vertex [0,-1,-φ] (vertex 3) at the bottom (−Y),
// so the die stands upright on a single vertex.
// This is R_x(-θ) where cos θ = 1/sqrt(1+φ²), sin θ = φ/sqrt(1+φ²).
const _cosT = 1 / SQRT_1_PHI2   // ≈ 0.5257
const _sinT = PHI / SQRT_1_PHI2  // ≈ 0.8507
function _rotateVertex([x, y, z]) {
  return [x, _cosT * y + _sinT * z, -_sinT * y + _cosT * z]
}

/**
 * Returns the 12 icosahedron vertices scaled so circumradius = sizeInMM / 2,
 * rotated so the die stands on a single vertex (vertex 3 points straight down).
 */
export function getD20Vertices(sizeInMM) {
  const R = sizeInMM / 2  // circumradius
  const raw = [
    [0,  1,  PHI], [0, -1,  PHI], [0,  1, -PHI], [0, -1, -PHI],
    [ 1,  PHI, 0], [-1,  PHI, 0], [ 1, -PHI, 0], [-1, -PHI, 0],
    [ PHI, 0,  1], [ PHI, 0, -1], [-PHI, 0,  1], [-PHI, 0, -1],
  ]
  return raw.map(v => {
    const l = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2])
    const unit = v.map(x => x / l * R)
    return _rotateVertex(unit)
  })
}

/**
 * Compute face metadata from triangle vertices.
 * Returns { center, normal, uBasis, vBasis, faceRadius }
 *
 * uBasis/vBasis are derived from projected world-up so that text orientation
 * is consistent across all faces regardless of vertex ordering.
 */
function computeFaceMeta(vertices) {
  const center = [0, 0, 0]
  for (const v of vertices) {
    center[0] += v[0]; center[1] += v[1]; center[2] += v[2]
  }
  center[0] /= vertices.length
  center[1] /= vertices.length
  center[2] /= vertices.length

  // Newell's method for robust normal
  const n = [0, 0, 0]
  for (let i = 0; i < vertices.length; i++) {
    const c = vertices[i]
    const nx = vertices[(i + 1) % vertices.length]
    n[0] += (c[1] - nx[1]) * (c[2] + nx[2])
    n[1] += (c[2] - nx[2]) * (c[0] + nx[0])
    n[2] += (c[0] - nx[0]) * (c[1] + nx[1])
  }

  // Ensure outward-pointing normal
  if (dot3(n, center) < 0) {
    n[0] = -n[0]; n[1] = -n[1]; n[2] = -n[2]
  }

  const normal = normalize3(n)

  // Find the apex vertex — the one most "above" the others relative to world-up.
  // Use projected world-up onto the face plane as the reference direction.
  const worldUp = [0, 1, 0]
  const dotUp = dot3(worldUp, normal)
  let projUp = sub3(worldUp, scale3(normal, dotUp))
  if (len3(projUp) < 0.1) {
    // Nearly horizontal face — use world-forward as reference
    const worldFwd = [0, 0, -1]
    const dotFwd = dot3(worldFwd, normal)
    projUp = sub3(worldFwd, scale3(normal, dotFwd))
  }
  projUp = normalize3(projUp)

  // Vertex with the highest dot product against projUp is the apex (single top point).
  let apexIdx = 0
  let bestDot = -Infinity
  for (let i = 0; i < vertices.length; i++) {
    const d = dot3(vertices[i], projUp)
    if (d > bestDot) { bestDot = d; apexIdx = i }
  }

  // vBasis points from the base-edge midpoint toward the apex vertex (face "up").
  const base = vertices.filter((_, i) => i !== apexIdx)
  const baseMid = [
    (base[0][0] + base[1][0]) / 2,
    (base[0][1] + base[1][1]) / 2,
    (base[0][2] + base[1][2]) / 2,
  ]
  const vBasis = normalize3(sub3(vertices[apexIdx], baseMid))
  const uBasis = normalize3(cross3(vBasis, normal)) // "right" on the face

  let maxDist = 0
  for (const v of vertices) {
    const d = sub3(v, center)
    const u = dot3(d, uBasis)
    const vv = dot3(d, vBasis)
    maxDist = Math.max(maxDist, Math.sqrt(u*u + vv*vv))
  }

  return { center, normal, uBasis, vBasis, faceRadius: maxDist }
}

/**
 * Compute all 20 face descriptors for a d20 of the given size.
 * Each descriptor: { index, number, vertices, center, normal, uBasis, vBasis, faceRadius }
 */
export function computeFaceDescriptors(sizeInMM) {
  const verts = getD20Vertices(sizeInMM)
  return D20_FACE_INDICES.map((fi, i) => {
    const vertices = fi.map(idx => verts[idx])
    const meta = computeFaceMeta(vertices)
    return { index: i, number: D20_NUMBERS[i], vertices, ...meta }
  })
}
