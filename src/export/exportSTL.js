import * as jscad from '@jscad/modeling'
import * as stlSerializer from '@jscad/stl-serializer'
import { buildD20Solid } from '../modeling/buildD20Solid.js'
import { buildTextShape } from '../modeling/TextEmbosser.js'
import { buildSVGShape } from '../modeling/SVGEmbosser.js'

const { subtract, union } = jscad.booleans

export async function exportD20STL({ faceDescriptors, faces, loadedFonts, sizeInMM }) {
  // Step 1: build the blank icosahedron
  let solid = buildD20Solid(sizeInMM)
  console.log('[STL] blank polygons:', jscad.geometries.geom3.toPolygons(solid).length)

  // Step 2: collect all per-face content shapes, separated by mode
  const cutShapes = []
  const embossShapes = []

  for (let fi = 0; fi < 20; fi++) {
    const face = faceDescriptors[fi]
    const content = faces[fi]

    for (const entry of (content.texts || [])) {
      if (!entry.text) continue
      const fontObj = loadedFonts[entry.fontIndex]
      if (!fontObj) continue
      try {
        const shape = buildTextShape(face, entry, fontObj)
        if (shape) {
          const mode = entry.mode || 'cut'
          if (mode === 'emboss') embossShapes.push(shape)
          else cutShapes.push(shape)
        }
      } catch (e) {
        console.warn(`[STL] text shape failed face ${fi}:`, e)
      }
    }

    for (const entry of (content.svgs || [])) {
      if (!entry.svgData) continue
      try {
        const shape = buildSVGShape(face, entry)
        if (shape) {
          const mode = entry.mode || 'cut'
          if (mode === 'emboss') embossShapes.push(shape)
          else cutShapes.push(shape)
        }
      } catch (e) {
        console.warn(`[STL] svg shape failed face ${fi}:`, e)
      }
    }
  }

  console.log(`[STL] cut shapes: ${cutShapes.length}, emboss shapes: ${embossShapes.length}`)

  // Step 3: subtract each cut shape individually from the blank.
  // Do NOT union them first — JSCAD's BSP union silently drops non-intersecting
  // shapes when their bounding boxes happen to overlap.
  for (let i = 0; i < cutShapes.length; i++) {
    try {
      solid = subtract(solid, cutShapes[i])
    } catch (e) {
      console.warn(`[STL] subtract failed for cut shape ${i}:`, e)
    }
  }

  // Emboss shapes are unioned onto the solid
  for (let i = 0; i < embossShapes.length; i++) {
    try {
      solid = union(solid, embossShapes[i])
    } catch (e) {
      console.warn(`[STL] union failed for emboss shape ${i}:`, e)
    }
  }

  console.log('[STL] final polygons:', jscad.geometries.geom3.toPolygons(solid).length)

  // Step 4: serialize and download
  const rawData = stlSerializer.serialize({ binary: true }, solid)
  const blob = new Blob(rawData, { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `d20_${sizeInMM}mm.stl`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
