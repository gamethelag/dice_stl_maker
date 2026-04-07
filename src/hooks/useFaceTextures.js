import { useEffect, useRef } from 'react'
import { renderFaceCanvas, renderBumpCanvas } from '../viewport/FaceTextureRenderer.js'

export function useFaceTextures({ faceDescriptors, faces, loadedFonts, updateFaceTextures }) {
  const timerRef = useRef(null)

  useEffect(() => {
    if (!faceDescriptors?.length || !faces?.length) return

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      for (let fi = 0; fi < faceDescriptors.length; fi++) {
        try {
          const face = faceDescriptors[fi]
          const content = faces[fi]
          const colorCanvas = await renderFaceCanvas(face, content, loadedFonts)
          const bumpCanvas = await renderBumpCanvas(face, content, loadedFonts)
          updateFaceTextures(fi, colorCanvas, bumpCanvas)
        } catch (e) {
          console.warn(`Texture render failed for face ${fi}:`, e)
        }
      }
    }, 80)

    return () => clearTimeout(timerRef.current)
  }, [faceDescriptors, faces, loadedFonts, updateFaceTextures])
}
