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

  // Build a combined sorted label from all text entries on a face
  const getFaceLabel = (face) => {
    if (!face.texts.length) return ''
    if (face.texts.length === 1) return face.texts[0].text
    const nums = face.texts
      .map(t => parseFloat(t.text))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b)
    return nums.length === face.texts.length
      ? nums.join(',')
      : face.texts.map(t => t.text).sort().join(',')
  }

  // Sort by the lowest numeric value among the face's text entries
  const sorted = useMemo(() =>
    faces
      .map((face, fi) => {
        const nums = face.texts.map(t => parseFloat(t.text)).filter(n => !isNaN(n))
        const sortKey = nums.length ? Math.min(...nums) : 0
        return { face, fi, sortKey }
      })
      .sort((a, b) => a.sortKey - b.sortKey),
    [faces]
  )

  return (
    <div className="face-grid">
      {sorted.map(({ face, fi }) => {
        const textLabel = getFaceLabel(face)
        const svg = face.svgs[0]?.svgData
        const hasCustomContent = face.svgs.length > 0

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
              textLabel.length > 5 ? textLabel.slice(0, 5) : textLabel
            )}
          </button>
        )
      })}
    </div>
  )
}
