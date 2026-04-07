import { useMemo } from 'react'
import { useDiceStore } from '../state/useDiceStore.js'

function svgToWhiteDataUrl(svgData) {
  // Tint all fill/stroke to white so it's visible on the dark button
  const tinted = svgData
    .replace(/fill\s*=\s*["'][^"']*["']/gi, 'fill="white"')
    .replace(/stroke\s*=\s*["'][^"']*["']/gi, 'stroke="white"')
    .replace(/fill\s*:\s*[^;}"']+/gi, 'fill:white')
    .replace(/stroke\s*:\s*[^;}"']+/gi, 'stroke:white')
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(tinted)
}

export function FaceGrid({ onFocusFace }) {
  const faces = useDiceStore(s => s.faces)
  const selectedFaceIndex = useDiceStore(s => s.selectedFaceIndex)
  const setSelectedFace = useDiceStore(s => s.setSelectedFace)

  // Sort by the current numeric value of the first text entry
  const sorted = useMemo(() =>
    faces
      .map((face, fi) => ({ face, fi, num: parseInt(face.texts[0]?.text) || 0 }))
      .sort((a, b) => a.num - b.num),
    [faces]
  )

  return (
    <div className="face-grid">
      {sorted.map(({ face, fi }) => {
        const textLabel = face.texts[0]?.text || ''
        const svg = face.svgs[0]?.svgData
        const hasCustomContent = face.texts.length > 1 || face.svgs.length > 0

        return (
          <button
            key={fi}
            className={`face-btn${selectedFaceIndex === fi ? ' selected' : ''}${hasCustomContent ? ' modified' : ''}`}
            onClick={() => { setSelectedFace(fi); onFocusFace?.(fi) }}
            title={textLabel || `Face ${fi}`}
          >
            {svg ? (
              <img
                src={svgToWhiteDataUrl(svg)}
                alt={textLabel}
                className="face-btn-svg"
              />
            ) : (
              textLabel.length > 3 ? textLabel.slice(0, 3) : textLabel
            )}
          </button>
        )
      })}
    </div>
  )
}
