import { useState, useEffect } from 'react'

function CommitNumberInput({ min, max, step, value, onChange }) {
  const [draft, setDraft] = useState(String(value))

  // Keep draft in sync when external value changes (e.g. linked sliders)
  useEffect(() => { setDraft(String(value)) }, [value])

  const commit = (raw) => {
    const v = parseFloat(raw)
    if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)))
    else setDraft(String(value)) // revert if unparseable
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={e => commit(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') { commit(e.target.value); e.target.blur() } }}
    />
  )
}

export function RangeRow({ label, min, max, step, value, onChange, unit = '' }) {
  return (
    <div className="range-row">
      <label className="range-label">{label}{unit ? ` (${unit})` : ''}</label>
      <div className="range-inputs">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
        />
        <CommitNumberInput min={min} max={max} step={step} value={value} onChange={onChange} />
      </div>
    </div>
  )
}
