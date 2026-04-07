import { useRef, useState } from 'react'
import { useDiceStore } from '../state/useDiceStore.js'
import { RangeRow } from './RangeRow.jsx'
import * as opentype from 'opentype.js'

export function TextTab({ faceIndex }) {
  const face = useDiceStore(s => s.faces[faceIndex])
  const loadedFonts = useDiceStore(s => s.loadedFonts)
  const activeFontIndex = useDiceStore(s => s.activeFontIndex)
  const updateTextEntry = useDiceStore(s => s.updateTextEntry)
  const removeTextEntry = useDiceStore(s => s.removeTextEntry)
  const addTextEntry = useDiceStore(s => s.addTextEntry)
  const addFont = useDiceStore(s => s.addFont)
  const setActiveFontIndex = useDiceStore(s => s.setActiveFontIndex)
  const applyTextStyleToAllFaces = useDiceStore(s => s.applyTextStyleToAllFaces)
  const fontInputRef = useRef(null)
  const [applyToAll, setApplyToAll] = useState(true)

  const handleUpdate = (entryId, updates) => {
    updateTextEntry(faceIndex, entryId, updates)
    if (applyToAll && !('text' in updates)) {
      applyTextStyleToAllFaces(faceIndex)
    }
  }

  const handleFontFile = async (file) => {
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const font = opentype.parse(buf)
      addFont({ name: file.name.replace(/\.[^.]+$/, ''), data: buf, font })
    } catch (e) {
      console.warn('Font load failed:', e)
    }
  }

  const handleFontDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFontFile(file)
  }

  return (
    <div className="text-tab">
      {/* Font section */}
      <div className="font-section">
        <div className="font-header">
          <span className="sub-label">Font</span>
          <button className="btn-sm" onClick={() => fontInputRef.current?.click()}>+ Load Font</button>
          <input
            ref={fontInputRef}
            type="file"
            accept=".ttf,.otf"
            style={{ display: 'none' }}
            onChange={e => handleFontFile(e.target.files[0])}
          />
        </div>
        {loadedFonts.length > 0 && (
          <div className="font-list">
            {loadedFonts.map((f, i) => (
              <button
                key={i}
                className={`font-btn${activeFontIndex === i ? ' active' : ''}`}
                onClick={() => setActiveFontIndex(i)}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
        {loadedFonts.length === 0 && (
          <div
            className="font-drop-zone"
            onDrop={handleFontDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fontInputRef.current?.click()}
          >
            Drop .ttf / .otf here
          </div>
        )}
      </div>

      {/* Text entries */}
      {face.texts.map((entry) => (
        <TextEntry
          key={entry.id}
          entry={entry}
          loadedFonts={loadedFonts}
          onUpdate={(updates) => handleUpdate(entry.id, updates)}
          onRemove={() => removeTextEntry(faceIndex, entry.id)}
          canRemove={face.texts.length > 1}
        />
      ))}

      <div className="entry-row" style={{ gap: '8px' }}>
        <button className="btn-add" onClick={() => addTextEntry(faceIndex)} style={{ flex: 1 }}>
          + Add Text
        </button>
        <label className="apply-all-label">
          <input
            type="checkbox"
            checked={applyToAll}
            onChange={e => setApplyToAll(e.target.checked)}
          />
          Apply to all
        </label>
      </div>
    </div>
  )
}

function TextEntry({ entry, loadedFonts, onUpdate, onRemove, canRemove }) {
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

      {loadedFonts.length > 0 && (
        <div className="entry-row">
          <label className="sub-label">Font</label>
          <select
            value={entry.fontIndex}
            onChange={e => onUpdate({ fontIndex: parseInt(e.target.value) })}
          >
            {loadedFonts.map((f, i) => <option key={i} value={i}>{f.name}</option>)}
          </select>
        </div>
      )}

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
