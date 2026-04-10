import * as jscad from '@jscad/modeling'
import * as stlSerializer from '@jscad/stl-serializer'
import { buildD20Solid } from '../modeling/buildD20Solid.js'
import { buildD2Solid } from '../modeling/buildD2Solid.js'
import { buildD4Solid } from '../modeling/buildD4Solid.js'
import { buildD6Solid } from '../modeling/buildD6Solid.js'
import { buildD8Solid } from '../modeling/buildD8Solid.js'
import { buildD10Solid } from '../modeling/buildD10Solid.js'
import { buildD12Solid } from '../modeling/buildD12Solid.js'
import { buildTextShape } from '../modeling/TextEmbosser.js'
import { buildSVGShape } from '../modeling/SVGEmbosser.js'
import { buildSupportSolid } from '../modeling/supports/buildAllSupports.js'
import { computeFaceDescriptors } from '../geometry/D20Geometry.js'
import { computeD2FaceDescriptors } from '../geometry/D2Geometry.js'
import { computeD4FaceDescriptors } from '../geometry/D4Geometry.js'
import { computeD6FaceDescriptors } from '../geometry/D6Geometry.js'
import { computeD8FaceDescriptors } from '../geometry/D8Geometry.js'
import { computeD10FaceDescriptors } from '../geometry/D10Geometry.js'
import { computeD12FaceDescriptors } from '../geometry/D12Geometry.js'

const { subtract, union } = jscad.booleans

function getFaceDescriptors(diceType, sizeInMM, d2Sides, d2Height, d8Height, d10Radius) {
  if (diceType === 'd2')  return computeD2FaceDescriptors(sizeInMM, d2Sides, d2Height)
  if (diceType === 'd4')  return computeD4FaceDescriptors(sizeInMM)
  if (diceType === 'd6')  return computeD6FaceDescriptors(sizeInMM)
  if (diceType === 'd8')  return computeD8FaceDescriptors(sizeInMM, d8Height)
  if (diceType === 'd10' || diceType === 'd%') return computeD10FaceDescriptors(sizeInMM, d10Radius)
  if (diceType === 'd12') return computeD12FaceDescriptors(sizeInMM)
  return computeFaceDescriptors(sizeInMM)
}

function buildSolid(diceType, sizeInMM, d2Sides, d2Height, d8Height, d10Radius) {
  if (diceType === 'd2')  return buildD2Solid(sizeInMM, d2Sides, d2Height)
  if (diceType === 'd4')  return buildD4Solid(sizeInMM)
  if (diceType === 'd6')  return buildD6Solid(sizeInMM)
  if (diceType === 'd8')  return buildD8Solid(sizeInMM, d8Height)
  if (diceType === 'd10' || diceType === 'd%') return buildD10Solid(sizeInMM, d10Radius)
  if (diceType === 'd12') return buildD12Solid(sizeInMM)
  return buildD20Solid(sizeInMM)
}

export async function exportDiceSTL({ faceDescriptors, faces, loadedFonts, sizeInMM, diceType, d2Sides, d2Height, d8Height, d10Radius, filename, supportsEnabled, supportSettings, pinLocations }) {
  let solid = buildSolid(diceType, sizeInMM, d2Sides, d2Height, d8Height, d10Radius)
  console.log('[STL] blank polygons:', jscad.geometries.geom3.toPolygons(solid).length)

  const cutShapes = []
  const embossShapes = []

  for (let fi = 0; fi < faceDescriptors.length; fi++) {
    const face = faceDescriptors[fi]
    const content = faces[fi]
    if (!content) continue

    for (const entry of (content.texts || [])) {
      if (!entry.text) continue
      const fontObj = loadedFonts[entry.fontIndex]
      if (!fontObj) continue
      try {
        const shape = buildTextShape(face, entry, fontObj)
        if (shape) {
          if ((entry.mode || 'cut') === 'emboss') embossShapes.push(shape)
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
          if ((entry.mode || 'cut') === 'emboss') embossShapes.push(shape)
          else cutShapes.push(shape)
        }
      } catch (e) {
        console.warn(`[STL] svg shape failed face ${fi}:`, e)
      }
    }
  }

  console.log(`[STL] cut: ${cutShapes.length}, emboss: ${embossShapes.length}`)

  for (let i = 0; i < cutShapes.length; i++) {
    try { solid = subtract(solid, cutShapes[i]) }
    catch (e) { console.warn(`[STL] subtract failed shape ${i}:`, e) }
  }
  for (let i = 0; i < embossShapes.length; i++) {
    try { solid = union(solid, embossShapes[i]) }
    catch (e) { console.warn(`[STL] union failed shape ${i}:`, e) }
  }

  // Union support structures into solid before export
  if (supportsEnabled && supportSettings) {
    try {
      const supportSolid = buildSupportSolid(faceDescriptors, supportSettings, pinLocations ?? [])
      if (supportSolid) solid = union(solid, supportSolid)
    } catch (e) {
      console.warn('[STL] support union failed:', e)
    }
  }

  console.log('[STL] final polygons:', jscad.geometries.geom3.toPolygons(solid).length)

  const rawData = stlSerializer.serialize({ binary: true }, solid)
  const blob = new Blob(rawData, { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `${diceType}_${sizeInMM}mm.stl`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function exportLibraryEntries(entries, loadedFonts) {
  for (const entry of entries) {
    const { diceType, sizeInMM, d2Sides, d2Height, d8Height, d10Radius, faces, name } = entry
    const faceDescriptors = getFaceDescriptors(diceType, sizeInMM, d2Sides, d2Height, d8Height, d10Radius)
    await exportDiceSTL({ faceDescriptors, faces, loadedFonts, sizeInMM, diceType, d2Sides, d2Height, d8Height, d10Radius, filename: `${name}.stl` })
    // small pause so browser doesn't swallow multiple simultaneous downloads
    await new Promise(r => setTimeout(r, 200))
  }
}
