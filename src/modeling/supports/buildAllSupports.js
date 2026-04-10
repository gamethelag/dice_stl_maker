import * as jscad from '@jscad/modeling'
import { buildFinSupports } from './FinSupportBuilder.js'
import { buildVertexBumpers } from './VertexBumperBuilder.js'
import { buildPinSupports } from './PinSupportBuilder.js'

const { union } = jscad.booleans

/**
 * Collect all support shapes and union them into a single JSCAD solid.
 *
 * Returns null when no supports are enabled or no shapes could be built,
 * so callers can skip the CSG step entirely.
 *
 * @param {Array}  faceDescriptors  - full face descriptor array
 * @param {object} settings         - supportSettings from the Zustand store
 * @param {Array}  pinLocations     - pin locations from the Zustand store
 * @returns {object|null}  JSCAD geom3 solid, or null
 */
export function buildSupportSolid(faceDescriptors, settings, pinLocations) {
  if (!faceDescriptors?.length) return null

  // Extract unique vertex positions from face descriptors — works for all die types
  const seen = new Set()
  const vertices = []
  for (const face of faceDescriptors) {
    for (const v of face.vertices) {
      const key = v.map(x => x.toFixed(3)).join(',')
      if (!seen.has(key)) { seen.add(key); vertices.push(v) }
    }
  }

  const shapes = []

  if (settings.fins.enabled) {
    shapes.push(...buildFinSupports(faceDescriptors, settings.fins))
  }

  if (settings.bumpers.enabled && vertices.length) {
    shapes.push(...buildVertexBumpers(vertices, settings.bumpers))
  }

  if (settings.pins.enabled && pinLocations?.length) {
    shapes.push(...buildPinSupports(faceDescriptors, pinLocations, settings.pins))
  }

  if (!shapes.length) return null

  // Union all shapes together
  return shapes.reduce((acc, s) => {
    try { return union(acc, s) }
    catch (e) { console.warn('[supports] union failed:', e); return acc }
  })
}
