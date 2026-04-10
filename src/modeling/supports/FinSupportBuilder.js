import * as jscad from '@jscad/modeling'
import { sub3, add3, scale3, dot3, cross3, normalize3 } from '../../geometry/vectorMath.js'

const { polyhedron } = jscad.primitives

/**
 * Build fin supports for the bottom overhanging edges of a die.
 *
 * Each fin is a 12-vertex solid built in two explicit sections:
 *
 *  ┌─ ANGLED ARM ─────────────────────────────────────────────────────────────┐
 *  │  The contact rectangle (lying on the die face at contactOffset,          │
 *  │  width = contactThickness) is extruded by armLength in armDir —          │
 *  │  a direction at armAngle° from the face surface (0° = along the face,   │
 *  │  90° = perpendicular out of the face).                                   │
 *  └──────────────────────────────────────────────────────────────────────────┘
 *  ┌─ VERTICAL POST ──────────────────────────────────────────────────────────┐
 *  │  The four corners at the end of the arm are projected straight down      │
 *  │  (−Y) to the base plate, forming a vertical rectangular post.            │
 *  └──────────────────────────────────────────────────────────────────────────┘
 *
 * Cross-section (end view, perpendicular to edge):
 *
 *   p0──p3          ← contact strip on die face
 *    \    \
 *    a0──a3         ← arm end (armLength away in armDir)
 *    |    |
 *    b0──b3         ← base plate
 *
 * Miter insets at each vertex prevent adjacent fins overlapping.
 *
 * @param {Array}  faceDescriptors
 * @param {object} settings  { contactOffset, contactThickness, armAngle (° from build plate), armLength (mm) }
 * @returns {Array}  JSCAD geom3 shapes
 */
export function buildFinSupports(faceDescriptors, { contactOffset, contactThickness, armAngle, armLength }) {
  let minY = Infinity, maxY = -Infinity
  for (const face of faceDescriptors) {
    for (const v of face.vertices) {
      if (v[1] < minY) minY = v[1]
      if (v[1] > maxY) maxY = v[1]
    }
  }
  const midY = (minY + maxY) / 2
  const d = contactOffset + contactThickness + armLength * 2  // conservative miter depth (armLength is perpendicular, actual extrude may be longer)

  const processedEdges = new Set()
  const shapes = []

  for (const face of faceDescriptors) {
    if (face.normal[1] >= 0 || face.center[1] >= midY) continue

    const verts = face.vertices
    const n = verts.length

    for (let i = 0; i < n; i++) {
      const v1    = verts[i]
      const v2    = verts[(i + 1) % n]
      const vPrev = verts[(i - 1 + n) % n]
      const vNext = verts[(i + 2) % n]

      const key = [v1, v2]
        .map(v => v.map(x => x.toFixed(3)).join(','))
        .sort()
        .join('|')
      if (processedEdges.has(key)) continue
      processedEdges.add(key)

      const inset1 = _miterInset(v1, v2, vPrev, d, contactThickness)
      const inset2 = _miterInset(v2, v1, vNext, d, contactThickness)

      try {
        const shape = _buildFin(v1, v2, face, contactOffset, contactThickness, armAngle, armLength, minY, inset1, inset2)
        if (shape) shapes.push(shape)
      } catch (e) {
        console.warn('[supports] fin failed:', e)
      }
    }
  }
  return shapes
}

function _miterInset(v, vEdge, vAdj, d, minInset) {
  const eDir = normalize3(sub3(vEdge, v))
  const aDir = normalize3(sub3(vAdj, v))
  const cosA  = Math.max(-1, Math.min(1, dot3(eDir, aDir)))
  const halfA = Math.acos(cosA) / 2
  if (halfA < 0.01) return minInset
  return Math.max(minInset, d / Math.tan(halfA))
}

function _buildFin(v1, v2, face, contactOffset, contactThick, armAngleDeg, armLength, minY, inset1, inset2) {
  const edgeVec = normalize3(sub3(v2, v1))
  const v1i = add3(v1, scale3(edgeVec,  inset1))
  const v2i = add3(v2, scale3(edgeVec, -inset2))
  if (dot3(sub3(v2i, v1i), edgeVec) < 0.1) return null

  const edgeMid = scale3(add3(v1i, v2i), 0.5)

  // intoFace: in-plane direction from die edge toward face centre
  let intoFace = normalize3(cross3(face.normal, edgeVec))
  if (dot3(sub3(face.center, edgeMid), intoFace) < 0) intoFace = scale3(intoFace, -1)

  // armDir: the direction the arm extrudes from the contact strip.
  //   armAngle measured from the build plate (horizontal):
  //   0°  → arm goes horizontally outward (parallel to build plate)
  //   90° → arm goes straight down (perpendicular to build plate)
  const θ = armAngleDeg * Math.PI / 180

  // Lateral component: horizontal projection of intoFace
  const ifhLen = Math.sqrt(intoFace[0] * intoFace[0] + intoFace[2] * intoFace[2])
  const lateralDir = ifhLen > 1e-4
    ? [intoFace[0] / ifhLen, 0, intoFace[2] / ifhLen]
    : intoFace  // degenerate: intoFace is nearly vertical, use as-is

  const armDir = normalize3([
    lateralDir[0] * Math.cos(θ),
    -Math.sin(θ),
    lateralDir[2] * Math.cos(θ),
  ])

  // ── CONTACT STRIP — 4 corners on the die face ───────────────────────────────
  //   p0 (0), p1 (1): outer edge (at contactOffset from die edge), v1/v2 ends
  //   p2 (2), p3 (3): inner edge (at contactOffset + contactThick),  v2/v1 ends
  const p0 = add3(v1i, scale3(intoFace, contactOffset))
  const p1 = add3(v2i, scale3(intoFace, contactOffset))
  const p2 = add3(v2i, scale3(intoFace, contactOffset + contactThick))
  const p3 = add3(v1i, scale3(intoFace, contactOffset + contactThick))

  if (Math.max(p0[1], p1[1]) <= minY + 0.2) return null

  // ── ARM END — contact strip extruded along armDir ───────────────────────────
  //   armLength = perpendicular distance from face surface to arm end.
  //   Convert to actual extrude distance along armDir:
  //     tArm = armLength / dot(armDir, faceNormal)
  //   so the arm end is always armLength mm away from the face surface,
  //   regardless of arm angle or face orientation.
  const normalDot = dot3(armDir, face.normal)
  const tArm = normalDot > 0.05 ? armLength / normalDot : armLength
  //   a0 (4), a1 (5), a2 (6), a3 (7)
  const a0 = add3(p0, scale3(armDir, tArm))
  const a1 = add3(p1, scale3(armDir, tArm))
  const a2 = add3(p2, scale3(armDir, tArm))
  const a3 = add3(p3, scale3(armDir, tArm))

  // ── BASE — arm end projected straight down to base plate ─────────────────────
  //   b0 (8), b1 (9), b2 (10), b3 (11)
  const b0 = [a0[0], minY, a0[2]]
  const b1 = [a1[0], minY, a1[2]]
  const b2 = [a2[0], minY, a2[2]]
  const b3 = [a3[0], minY, a3[2]]

  // All end-cap vertices are coplanar (all share the same edgeVec coordinate).
  // Faces use CCW winding when viewed from outside (outward normals).
  return polyhedron({
    points: [p0, p1, p2, p3, a0, a1, a2, a3, b0, b1, b2, b3],
    //        0   1   2   3   4   5   6   7   8   9  10  11
    faces: [
      [0, 3, 2, 1],        // top:  contact strip on die face
      [8, 9, 10, 11],      // base: on base plate
      [0, 1, 5, 4],        // outer arm face
      [4, 5, 9, 8],        // outer post face
      [3, 7, 6, 2],        // inner arm face
      [7, 11, 10, 6],      // inner post face
      [0, 4, 8, 11, 7, 3], // v1 end cap  (hexagon, CCW from −edgeVec)
      [1, 2, 6, 10, 9, 5], // v2 end cap  (hexagon, CCW from +edgeVec)
    ],
  })
}
