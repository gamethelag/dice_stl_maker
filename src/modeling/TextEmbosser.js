import * as jscad from '@jscad/modeling'
import { buildFaceEmbossMatrix } from './embossMatrix.js'

const { subtract, union } = jscad.booleans
const { extrudeLinear } = jscad.extrusions
const { geom2 } = jscad.geometries
const { transform } = jscad.transforms

function dedupe(pts) {
  const out = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const prev = out[out.length - 1]
    if (Math.abs(pts[i][0] - prev[0]) > 1e-6 || Math.abs(pts[i][1] - prev[1]) > 1e-6) {
      out.push(pts[i])
    }
  }
  return out
}

function cubicBezier(p0, p1, p2, p3, steps) {
  const pts = []
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, mt = 1 - t
    pts.push([
      mt*mt*mt*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t*t*t*p3[0],
      mt*mt*mt*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t*t*t*p3[1],
    ])
  }
  return pts
}

function quadBezier(p0, p1, p2, steps) {
  const pts = []
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, mt = 1 - t
    pts.push([
      mt*mt*p0[0] + 2*mt*t*p1[0] + t*t*p2[0],
      mt*mt*p0[1] + 2*mt*t*p1[1] + t*t*p2[1],
    ])
  }
  return pts
}

/**
 * Convert opentype.js path.commands directly to contours — no SVG string round-trip.
 * Handles M, L, C (cubic), Q (quadratic), Z.
 */
function opentypePathToContours(path) {
  const contours = []
  let current = null
  let cx = 0, cy = 0, startX = 0, startY = 0

  const finishContour = (pts) => {
    if (!pts || pts.length < 3) return
    // CFF/OTF fonts often close paths with an explicit L back to the start point
    // before Z, leaving a duplicate first/last point. Remove it to avoid a
    // zero-length edge that causes JSCAD to reject the polygon.
    const [fx, fy] = pts[0]
    const [lx, ly] = pts[pts.length - 1]
    if (Math.abs(lx - fx) < 1e-6 && Math.abs(ly - fy) < 1e-6) pts.pop()
    if (pts.length >= 3) contours.push(pts)
  }

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        finishContour(current)
        current = [[cmd.x, cmd.y]]
        cx = cmd.x; cy = cmd.y
        startX = cmd.x; startY = cmd.y
        break
      case 'L':
        current?.push([cmd.x, cmd.y])
        cx = cmd.x; cy = cmd.y
        break
      case 'C': {
        const pts = cubicBezier([cx,cy],[cmd.x1,cmd.y1],[cmd.x2,cmd.y2],[cmd.x,cmd.y], 16)
        current?.push(...pts)
        cx = cmd.x; cy = cmd.y
        break
      }
      case 'Q': {
        const pts = quadBezier([cx,cy],[cmd.x1,cmd.y1],[cmd.x,cmd.y], 12)
        current?.push(...pts)
        cx = cmd.x; cy = cmd.y
        break
      }
      case 'Z':
        finishContour(current)
        current = null
        cx = startX; cy = startY
        break
    }
  }
  finishContour(current)
  return contours.map(points => ({ points, closed: true }))
}

/**
 * Build the 3D extrusion shape for a text entry positioned on a die face.
 * Returns the world-space JSCAD solid (not yet subtracted/unioned with the die).
 * Returns null if the shape cannot be built.
 */
export function buildTextShape(face, entry, fontObj) {
  if (!fontObj?.font) return null

  const { text, size = 8, x = 0, y = 0, rot = 0, depth = 0.8, mode = 'cut' } = entry
  const font = fontObj.font

  const path = font.getPath(text, 0, 0, size)
  if (!path.commands?.length) return null

  const contours = opentypePathToContours(path)
  if (!contours.length) return null

  const bbox = path.getBoundingBox()
  const cx = (bbox.x1 + bbox.x2) / 2
  const cy = (bbox.y1 + bbox.y2) / 2

  // Determine winding convention from geometry, not font metadata.
  // The contour with the largest absolute area must be an outer shape (no glyph starts
  // with a hole). Its sign after Y-flip tells us the convention for this font:
  //   area < 0  →  TTF-style (CW outer in screen space)
  //   area > 0  →  CFF-style (CCW outer in screen space)
  // This avoids relying on font.outlinesFormat or tables which can be absent/wrong.

  // First pass: compute signed areas for all contours and find the largest.
  const contourData = []
  for (const contour of contours) {
    if (contour.points.length < 3) continue
    const pts = contour.points.map(([px, py]) => [px - cx, -(py - cy)])
    const cleaned = dedupe(pts)
    if (cleaned.length < 3) continue
    let area = 0
    for (let i = 0; i < cleaned.length; i++) {
      const [x0, y0] = cleaned[i]
      const [x1, y1] = cleaned[(i + 1) % cleaned.length]
      area += x0 * y1 - x1 * y0
    }
    contourData.push({ cleaned, area })
  }

  if (!contourData.length) return null

  // The largest absolute area belongs to an outer contour — its sign is the outer sign.
  const outerSign = Math.sign(
    contourData.reduce((best, c) => Math.abs(c.area) > Math.abs(best.area) ? c : best).area
  )

  const outerShapes = []
  const holeShapes = []

  for (const { cleaned, area } of contourData) {
    const isOuter = Math.sign(area) === outerSign
    // geom2.fromPoints requires CCW winding. After Y-flip:
    //   TTF outer → CW (area < 0) → reverse to CCW
    //   TTF hole  → CCW (area > 0) → keep
    //   CFF outer → CCW (area > 0) → keep   ← reversing here was the bug
    //   CFF hole  → CW  (area < 0) → reverse to CCW
    // So always normalize to CCW based on sign of area, independently of outer/hole.
    const finalPts = area > 0 ? cleaned : [...cleaned].reverse()
    try {
      const g2 = geom2.fromPoints(finalPts)
      const ext = extrudeLinear({ height: depth + 0.2 }, g2)
      if (isOuter) outerShapes.push(ext)
      else holeShapes.push(ext)
    } catch (e) {
      console.warn('TextEmbosser: extrude failed:', e.message)
    }
  }

  if (!outerShapes.length) return null

  let embossShape
  try {
    // Union all outer shapes, then subtract holes
    embossShape = outerShapes.length === 1 ? outerShapes[0] : outerShapes.reduce((acc, s) => {
      try { return union(acc, s) } catch { return acc }
    })
    for (const hole of holeShapes) {
      try { embossShape = subtract(embossShape, hole) } catch (e) {
        console.warn('TextEmbosser: hole subtract failed:', e.message)
      }
    }
  } catch (e) {
    console.warn('TextEmbosser: shape assembly failed:', e.message)
    return null
  }

  // Build decorator shape in the same 2D coordinate space (after Y-flip, centered)
  const decorator = entry.decorator || 'none'
  if (decorator !== 'none') {
    const decoratorSize = entry.decoratorSize ?? 1.0
    // bbox in original opentype SVG coords (Y-down screen space)
    const x1 = bbox.x1, y1 = bbox.y1, x2 = bbox.x2, y2 = bbox.y2
    // In JSCAD 2D after Y-flip: text spans x in [x1-cx, x2-cx], y in [cy-y2, cy-y1]
    const jscadBottom = cy - y2   // bottom of text in JSCAD 2D (most negative Y)
    const textW = x2 - x1
    const textH = y2 - y1  // height in font units

    try {
      let decShape = null
      if (decorator === 'underline') {
        const ulW = textW * decoratorSize
        const ulH = Math.max(0.3, textH * 0.07)
        const ulGap = textH * 0.05
        const ulY0 = jscadBottom - ulGap - ulH
        const ulY1 = jscadBottom - ulGap
        const ulX0 = -ulW / 2
        const ulX1 =  ulW / 2
        // CCW rectangle (Y-up): bottom-left → bottom-right → top-right → top-left
        const pts = [[ulX0, ulY0], [ulX1, ulY0], [ulX1, ulY1], [ulX0, ulY1]]
        const g2 = geom2.fromPoints(pts)
        decShape = extrudeLinear({ height: depth + 0.2 }, g2)
      } else if (decorator === 'dot') {
        const r2 = Math.max(0.3, textH * 0.08) * decoratorSize
        const dotX = (x2 - cx) + r2 * 2
        const dotY = jscadBottom + r2
        // Octagon approximation for circle
        const pts = Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2
          return [dotX + Math.cos(a) * r2, dotY + Math.sin(a) * r2]
        })
        const g2 = geom2.fromPoints(pts)
        decShape = extrudeLinear({ height: depth + 0.2 }, g2)
      }
      if (decShape) embossShape = union(embossShape, decShape)
    } catch (e) {
      console.warn('TextEmbosser: decorator failed:', e.message)
    }
  }

  const r = face.faceRadius
  const outward = mode === 'emboss'
  const pushBack = outward ? -0.05 : -(depth + 0.1)
  const m = buildFaceEmbossMatrix(face, x * r, y * r, rot, pushBack)
  return transform(m, embossShape)
}

/**
 * Emboss one text entry onto a die solid.
 * Supports mode: "cut" (subtract) or "emboss" (union, raised).
 */
export function embossText(solid, face, entry, fontObj) {
  const shape = buildTextShape(face, entry, fontObj)
  if (!shape) return solid

  const outward = (entry.mode || 'cut') === 'emboss'
  try {
    return outward ? union(solid, shape) : subtract(solid, shape)
  } catch (e) {
    console.warn('CSG text op failed:', e)
    return solid
  }
}
