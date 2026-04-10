import { useEffect, useRef, useState } from 'react'
import * as jscad from '@jscad/modeling'
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

const { subtract, union } = jscad.booleans

function buildSolid(diceType, sizeInMM, d2Sides, d2Height, d8Height, d10Radius) {
  if (diceType === 'd2')  return buildD2Solid(sizeInMM, d2Sides, d2Height)
  if (diceType === 'd4')  return buildD4Solid(sizeInMM)
  if (diceType === 'd6')  return buildD6Solid(sizeInMM)
  if (diceType === 'd8')  return buildD8Solid(sizeInMM, d8Height)
  if (diceType === 'd10' || diceType === 'd%') return buildD10Solid(sizeInMM, d10Radius)
  if (diceType === 'd12') return buildD12Solid(sizeInMM)
  return buildD20Solid(sizeInMM)
}

export function useSolidRebuild({ faceDescriptors, faces, loadedFonts, sizeInMM, diceType, d2Sides, d2Height, d8Height, d10Radius, updateSolidMesh, supportsEnabled, supportSettings, pinLocations }) {
  const [isBuilding, setIsBuilding] = useState(false)
  const timerRef = useRef(null)
  const genRef = useRef(0)

  useEffect(() => {
    if (!faceDescriptors?.length) return

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const gen = ++genRef.current
      setIsBuilding(true)
      try {
        let solid = buildSolid(diceType, sizeInMM, d2Sides, d2Height, d8Height, d10Radius)

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
              console.warn(`[rebuild] text shape failed face ${fi}:`, e)
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
              console.warn(`[rebuild] svg shape failed face ${fi}:`, e)
            }
          }
        }

        for (let i = 0; i < cutShapes.length; i++) {
          try { solid = subtract(solid, cutShapes[i]) }
          catch (e) { console.warn(`[rebuild] subtract failed shape ${i}:`, e) }
        }
        for (let i = 0; i < embossShapes.length; i++) {
          try { solid = union(solid, embossShapes[i]) }
          catch (e) { console.warn(`[rebuild] union failed shape ${i}:`, e) }
        }

        // Build support solid separately — no CSG union here, just a separate geom3.
        // This avoids an expensive boolean op in the preview loop.
        let supportSolid = null
        if (supportsEnabled && supportSettings) {
          try {
            supportSolid = buildSupportSolid(faceDescriptors, supportSettings, pinLocations ?? [])
          } catch (e) {
            console.warn('[rebuild] support solid failed:', e)
          }
        }

        if (gen === genRef.current) {
          updateSolidMesh(solid, supportSolid)
        }
      } catch (e) {
        console.error('[rebuild] failed:', e)
      } finally {
        if (gen === genRef.current) setIsBuilding(false)
      }
    }, 500)

    return () => clearTimeout(timerRef.current)
  }, [faceDescriptors, faces, loadedFonts, sizeInMM, diceType, d2Sides, d2Height, d8Height, d10Radius, supportsEnabled, supportSettings, pinLocations]) // eslint-disable-line react-hooks/exhaustive-deps

  return { isBuilding }
}
