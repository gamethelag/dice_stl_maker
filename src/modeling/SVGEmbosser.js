import * as jscad from '@jscad/modeling'
import { svgPathToContours } from '../geometry/svgPathToContours.js'
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

/**
 * Build the 3D extrusion shape for an SVG entry positioned on a die face.
 * Returns the world-space JSCAD solid (not yet subtracted/unioned with the die).
 * Returns null if the shape cannot be built.
 */
export function buildSVGShape(face, entry) {
  const { svgData, scale = 1, x = 0, y = 0, rot = 0, depth = 0.4, mode = 'cut' } = entry
  if (!svgData) return null

  const paths = extractSVGPaths(svgData)
  if (!paths.length) return null

  const viewBox = getSVGViewBox(svgData)
  const svgWidth  = viewBox ? viewBox[2] : 100
  const svgHeight = viewBox ? viewBox[3] : 100

  const r = face.faceRadius
  const normalizeX = (px) => (px / svgWidth - 0.5) * scale * r * 2
  const normalizeY = (py) => -(py / svgHeight - 0.5) * scale * r * 2

  const shapes = []
  for (const d of paths) {
    const contours = svgPathToContours(d)
    for (const contour of contours) {
      const pts = contour.points.map(([px, py]) => [normalizeX(px), normalizeY(py)])
      if (pts.length < 3) continue
      const cleaned = dedupe(pts)
      if (cleaned.length < 3) continue
      try {
        const g2 = geom2.fromPoints(cleaned)
        const extruded = extrudeLinear({ height: depth + 0.2 }, g2)
        shapes.push(extruded)
      } catch { /* skip malformed contour */ }
    }
  }

  if (!shapes.length) return null

  let embossShape = shapes.length === 1 ? shapes[0] : union(...shapes)

  const outward = mode === 'emboss'
  const pushBack = outward ? -0.05 : -(depth + 0.1)
  const mat = buildFaceEmbossMatrix(face, x * r, y * r, rot, pushBack)
  return transform(mat, embossShape)
}

/**
 * Emboss an SVG onto a die face.
 * Supports mode: "cut" (subtract) or "emboss" (union, raised).
 */
export function embossSVG(solid, face, entry) {
  const shape = buildSVGShape(face, entry)
  if (!shape) return solid

  const outward = (entry.mode || 'cut') === 'emboss'
  try {
    return outward ? union(solid, shape) : subtract(solid, shape)
  } catch (e) {
    console.warn('CSG SVG op failed:', e)
    return solid
  }
}

function extractSVGPaths(svgData) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgData, 'image/svg+xml')
  const paths = []

  doc.querySelectorAll('path').forEach(el => {
    const d = el.getAttribute('d')
    if (d) paths.push(d)
  })

  doc.querySelectorAll('rect').forEach(el => {
    const x = +el.getAttribute('x') || 0
    const y = +el.getAttribute('y') || 0
    const w = +el.getAttribute('width') || 0
    const h = +el.getAttribute('height') || 0
    if (w > 0 && h > 0) {
      paths.push(`M${x},${y} L${x+w},${y} L${x+w},${y+h} L${x},${y+h} Z`)
    }
  })

  doc.querySelectorAll('circle').forEach(el => {
    const cx = +el.getAttribute('cx') || 0
    const cy = +el.getAttribute('cy') || 0
    const rv  = +el.getAttribute('r')  || 0
    if (rv > 0) {
      const k = 0.5522847498
      paths.push(
        `M${cx},${cy-rv} C${cx+k*rv},${cy-rv} ${cx+rv},${cy-k*rv} ${cx+rv},${cy} ` +
        `C${cx+rv},${cy+k*rv} ${cx+k*rv},${cy+rv} ${cx},${cy+rv} ` +
        `C${cx-k*rv},${cy+rv} ${cx-rv},${cy+k*rv} ${cx-rv},${cy} ` +
        `C${cx-rv},${cy-k*rv} ${cx-k*rv},${cy-rv} ${cx},${cy-rv} Z`
      )
    }
  })

  doc.querySelectorAll('polygon,polyline').forEach(el => {
    const points = el.getAttribute('points') || ''
    const pairs = points.trim().split(/[\s,]+/)
    const coords = []
    for (let i = 0; i < pairs.length - 1; i += 2) {
      coords.push(`${pairs[i]},${pairs[i+1]}`)
    }
    if (coords.length >= 2) {
      paths.push(`M${coords.join(' L')} Z`)
    }
  })

  return paths
}

function getSVGViewBox(svgData) {
  const match = svgData.match(/viewBox=["']([^"']+)["']/)
  if (match) {
    const nums = match[1].split(/[\s,]+/).map(Number)
    if (nums.length === 4) return nums
  }
  const wm = svgData.match(/width=["']([0-9.]+)["']/)
  const hm = svgData.match(/height=["']([0-9.]+)["']/)
  if (wm && hm) return [0, 0, parseFloat(wm[1]), parseFloat(hm[1])]
  return null
}
