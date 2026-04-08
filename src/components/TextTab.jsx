import { useRef, useState } from 'react'
import { useDiceStore } from '../state/useDiceStore.js'
import { RangeRow } from './RangeRow.jsx'
import * as opentype from 'opentype.js'

export function TextTab({ faceIndex }) {
  const face = useDiceStore(s => s.faces[faceIndex])
  const loadedFonts = useDiceStore(s => s.loadedFonts)
  const updateTextEntry = useDiceStore(s => s.updateTextEntry)
  const removeTextEntry = useDiceStore(s => s.removeTextEntry)
  const addTextEntry = useDiceStore(s => s.addTextEntry)
  const addFont = useDiceStore(s => s.addFont)
  const applyTextStyleToAllFaces = useDiceStore(s => s.applyTextStyleToAllFaces)
  const fontInputRef = useRef(null)
  const [applyToAll, setApplyToAll] = useState(true)
  const [fontError, setFontError] = useState(null)

  const handleUpdate = (entryId, updates) => {
    updateTextEntry(faceIndex, entryId, updates)
    if (applyToAll && !('text' in updates)) {
      applyTextStyleToAllFaces(faceIndex, entryId)
    }
  }

  const handleFontFile = async (file) => {
    if (!file) return
    setFontError(null)
    try {
      const buf = await file.arrayBuffer()
      // Detect WOFF/WOFF2 by their 4-byte signature before handing to opentype.js
      const sig = new DataView(buf).getUint32(0, false)
      if (sig === 0x774F4646) { setFontError(`"${file.name}" is WOFF format. Please upload a TTF or OTF file instead.`); return }
      if (sig === 0x774F4632) { setFontError(`"${file.name}" is WOFF2 format. Please upload a TTF or OTF file instead. Download the desktop (TTF) version from fonts.google.com.`); return }
      const font = opentype.parse(buf)
      addFont({ name: file.name.replace(/\.[^.]+$/, ''), data: buf, font, userUploaded: true })
    } catch (e) {
      console.error('Font load failed:', e)
      setFontError(`Could not load "${file.name}": ${e.message ?? e}`)
    }
  }

  const handleFontDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFontFile(file)
  }

  return (
    <div className="text-tab">
      <input
        ref={fontInputRef}
        type="file"
        accept=".ttf,.otf"
        style={{ display: 'none' }}
        onChange={e => handleFontFile(e.target.files[0])}
      />

      {fontError && (
        <div className="font-error">{fontError}</div>
      )}

      <button
        className={`btn-apply-all${applyToAll ? ' active' : ''}`}
        onClick={() => setApplyToAll(v => !v)}
        title="When on, style changes apply to every face"
      >
        {applyToAll ? '✓ Apply style to all faces' : 'Apply style to all faces'}
      </button>

      {/* Text entries */}
      {face.texts.map((entry) => (
        <TextEntry
          key={entry.id}
          entry={entry}
          loadedFonts={loadedFonts}
          onUpdate={(updates) => handleUpdate(entry.id, updates)}
          onRemove={() => removeTextEntry(faceIndex, entry.id)}
          canRemove={face.texts.length > 1}
          onLoadFont={() => fontInputRef.current?.click()}
        />
      ))}

      <button className="btn-add" onClick={() => addTextEntry(faceIndex)}>
        + Add Text
      </button>
    </div>
  )
}

function TextEntry({ entry, loadedFonts, onUpdate, onRemove, canRemove, onLoadFont }) {
  return (
    <div className="entry-card">
      <div className="entry-row">
        <input
          className="text-input"
          type="text"
          value={entry.text}
          placeholder="Text…"
          onChange={e => onUpdate({ text: e.target.value })}
        />
        {canRemove && (
          <button className="btn-remove" onClick={onRemove} title="Remove">×</button>
        )}
      </div>

      <div className="entry-row">
        <label className="sub-label">Font</label>
        {loadedFonts.length > 0 && (
          <select
            value={entry.fontIndex}
            onChange={e => onUpdate({ fontIndex: parseInt(e.target.value) })}
          >
            {loadedFonts.map((f, i) => <option key={i} value={i}>{f.name}</option>)}
          </select>
        )}
        <button className="btn-sm" onClick={onLoadFont}>+ Load</button>
      </div>

      <RangeRow label="Size" unit="mm" min={1} max={20} step={0.5} value={entry.size}
        onChange={v => onUpdate({ size: v })} />
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

      <div className="entry-row mode-row">
        <label className="sub-label">Decorator</label>
        <div className="mode-toggle">
          {['none', 'underline', 'dot'].map(d => (
            <button
              key={d}
              className={entry.decorator === d || (!entry.decorator && d === 'none') ? 'active' : ''}
              onClick={() => onUpdate({ decorator: d })}
            >{d === 'none' ? 'None' : d === 'underline' ? 'Underline' : 'Dot'}</button>
          ))}
        </div>
      </div>

      {(entry.decorator === 'underline' || entry.decorator === 'dot') && (
        <RangeRow label="Dec. size" min={0.2} max={3} step={0.1}
          value={entry.decoratorSize ?? 1.0}
          onChange={v => onUpdate({ decoratorSize: v })} />
      )}
    </div>
  )
}
