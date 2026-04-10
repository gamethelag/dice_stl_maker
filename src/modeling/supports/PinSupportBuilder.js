import * as jscad from '@jscad/modeling'
import { buildFaceEmbossMatrix } from '../embossMatrix.js'

const { cylinder } = jscad.primitives
const { transform } = jscad.transforms

/**
 * Build cylindrical pin supports at user-placed positions on die faces.
 *
 * Pins are useful for supporting letter islands (e.g. the centre of an "O")
 * that would otherwise print unsupported.
 *
 * Each pin base overlaps the die surface by 0.1 mm so the CSG union always
 * produces a clean attachment rather than a zero-thickness seam.
 *
 * @param {Array}  faceDescriptors  - full face descriptor array
 * @param {Array}  pinLocations     - [{ id, faceIndex, u, v }, ...]
 *                                    u/v are normalised face coordinates (−1..1)
 * @param {object} settings         - { radius, height } (mm)
 * @returns {Array}  JSCAD geom3 shapes
 */
export function buildPinSupports(faceDescriptors, pinLocations, { radius, height }) {
  const shapes = []
  for (const pin of pinLocations) {
    const face = faceDescriptors[pin.faceIndex]
    if (!face) continue
    try {
      // Place the cylinder centre at (height/2 − 0.1) mm above the face surface.
      // With center:true, the cylinder then spans from −0.1 mm (inside face) to
      // (height − 0.1) mm outside — giving a solid union footprint.
      const pushBack = height / 2 - 0.1
      const m = buildFaceEmbossMatrix(
        face,
        pin.u * face.faceRadius,
        pin.v * face.faceRadius,
        0,
        pushBack
      )
      const pin_shape = cylinder({ radius, height, center: true, segments: 12 })
      shapes.push(transform(m, pin_shape))
    } catch (e) {
      console.warn('[supports] pin failed:', e)
    }
  }
  return shapes
}
