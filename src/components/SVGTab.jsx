import { useRef } from 'react'
import { useDiceStore } from '../state/useDiceStore.js'
import { RangeRow } from './RangeRow.jsx'

export function SVGTab({ faceIndex }) {
  const face = useDiceStore(s => s.faces[faceIndex])
  const addSVGEntry = useDiceStore(s => s.addSVGEntry)
  const updateSVGEntry = useDiceStore(s => s.updateSVGEntry)
  const removeSVGEntry = useDiceStore(s => s.removeSVGEntry)
  const fileInputRef = useRef(null)

  const handleSVGFile = async (file) => {
    if (!file || !file.name.endsWith('.svg')) return
    const text = await file.text()
    addSVGEntry(faceIndex, text, file.name)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleSVGFile(file)
  }

  return (
    <div className="svg-tab">
      <div
        className="svg-drop-zone"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        Drop .svg here or click to browse
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg"
          style={{ display: 'none' }}
          onChange={e => handleSVGFile(e.target.files[0])}
        />
      </div>

      {face.svgs.map((entry) => (
        <SVGEntry
          key={entry.id}
          entry={entry}
          onUpdate={(updates) => updateSVGEntry(faceIndex, entry.id, updates)}
          onRemove={() => removeSVGEntry(faceIndex, entry.id)}
        />
      ))}
    </div>
  )
}

function SVGEntry({ entry, onUpdate, onRemove }) {
  const previewUrl = entry.svgData
    ? URL.createObjectURL(new Blob([entry.svgData], { type: 'image/svg+xml' }))
    : null

  return (
    <div className="entry-card">
      <div className="entry-row">
        <span className="entry-name">{entry.name}</span>
        <button className="btn-remove" onClick={onRemove} title="Remove">×</button>
      </div>

      {previewUrl && (
        <div className="svg-preview">
          <img src={previewUrl} alt="SVG preview" onLoad={() => URL.revokeObjectURL(previewUrl)} />
        </div>
      )}

      <RangeRow label="Scale" min={0.05} max={2} step={0.05} value={entry.scale}
        onChange={v => onUpdate({ scale: v })} />
      <RangeRow label="X offset" min={-1} max={1} step={0.05} value={entry.x}
        onChange={v => onUpdate({ x: v })} />
      <RangeRow label="Y offset" min={-1} max={1} step={0.05} value={entry.y}
        onChange={v => onUpdate({ y: v })} />
      <RangeRow label="Rotation" unit="°" min={-180} max={180} step={1} value={entry.rot}
        onChange={v => onUpdate({ rot: v })} />
      <RangeRow label="Depth" unit="mm" min={0.1} max={3} step={0.05} value={entry.depth}
        onChange={v => onUpdate({ depth: v })} />

      <div className="entry-row mode-row">
        <label className="sub-label">Mode</label>
        <div className="mode-toggle">
          <button
            className={entry.mode === 'cut' ? 'active' : ''}
            onClick={() => onUpdate({ mode: 'cut' })}
          >Cut</button>
          <button
            className={entry.mode === 'emboss' ? 'active' : ''}
            onClick={() => onUpdate({ mode: 'emboss' })}
          >Emboss</button>
        </div>
      </div>
    </div>
  )
}
