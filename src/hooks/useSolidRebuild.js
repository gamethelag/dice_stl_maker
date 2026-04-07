import { useState, useEffect, useRef } from 'react'
import { buildD20Solid } from '../modeling/buildD20Solid.js'
import { embossText } from '../modeling/TextEmbosser.js'
import { embossSVG } from '../modeling/SVGEmbosser.js'

export function useSolidRebuild({ faceDescriptors, faces, loadedFonts, sizeInMM, updateSolidMesh }) {
  const [isBuilding, setIsBuilding] = useState(false)
  const timerRef = useRef(null)
  const cancelRef = useRef(false)

  useEffect(() => {
    if (!faceDescriptors?.length || !faces?.length) return

    clearTimeout(timerRef.current)
    cancelRef.current = true  // cancel any in-progress build

    timerRef.current = setTimeout(() => {
      const cancelled = { value: false }
      cancelRef.current = false

      setIsBuilding(true)

      // Run synchronously but yield to the event loop first
      requestAnimationFrame(() => {
        if (cancelled.value) return
        try {
          let solid = buildD20Solid(sizeInMM)

          for (let fi = 0; fi < 20; fi++) {
            if (cancelled.value) break
            const face = faceDescriptors[fi]
            const content = faces[fi]

            for (const entry of (content.texts || [])) {
              if (!entry.text) continue
              const fontObj = loadedFonts[entry.fontIndex]
              if (fontObj) {
                try { solid = embossText(solid, face, entry, fontObj) }
                catch (e) { console.warn(`Text emboss failed face ${fi}:`, e) }
              }
            }

            for (const entry of (content.svgs || [])) {
              if (!entry.svgData) continue
              try { solid = embossSVG(solid, face, entry) }
              catch (e) { console.warn(`SVG emboss failed face ${fi}:`, e) }
            }
          }

          if (!cancelled.value) {
            updateSolidMesh(solid)
          }
        } catch (e) {
          console.error('Solid rebuild failed:', e)
        } finally {
          if (!cancelled.value) setIsBuilding(false)
        }
      })

      return () => { cancelled.value = true }
    }, 500)

    return () => clearTimeout(timerRef.current)
  }, [faceDescriptors, faces, loadedFonts, sizeInMM, updateSolidMesh])

  return { isBuilding }
}
