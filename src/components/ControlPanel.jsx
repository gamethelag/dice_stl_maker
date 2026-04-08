import { useDiceStore } from '../state/useDiceStore.js'
import { RangeRow } from './RangeRow.jsx'
import { FaceGrid } from './FaceGrid.jsx'
import { DiceLibrary } from './DiceLibrary.jsx'
import { SIZE_EDGE_FACTOR, SIZE_HEIGHT_FACTOR, D20_NUMBERS, SPINDOWN_NUMBERS } from '../geometry/D20Geometry.js'
import { D2_NUMBERS, D2_SPINDOWN, D2_DEFAULT_SIDES, D2_DEFAULT_HEIGHT } from '../geometry/D2Geometry.js'
import { D4_NUMBERS, D4_SPINDOWN, D4_HEIGHT_FACTOR } from '../geometry/D4Geometry.js'
import { D6_NUMBERS, D6_SPINDOWN } from '../geometry/D6Geometry.js'
import { D8_NUMBERS, D8_SPINDOWN } from '../geometry/D8Geometry.js'
import { A_FRAC, R_FRAC, D10_NUMBERS, D10_SPINDOWN, D_PERCENT_NUMBERS, D_PERCENT_SPINDOWN } from '../geometry/D10Geometry.js'
import { D12_NUMBERS, D12_SPINDOWN } from '../geometry/D12Geometry.js'

const PHI = (1 + Math.sqrt(5)) / 2

const DEFAULT_NUMBERS = { d2: D2_NUMBERS, d4: D4_NUMBERS, d6: D6_NUMBERS, d8: D8_NUMBERS, d10: D10_NUMBERS, 'd%': D_PERCENT_NUMBERS, d12: D12_NUMBERS, d20: D20_NUMBERS }
const SPINDOWN_BY_TYPE = { d2: D2_SPINDOWN, d4: D4_SPINDOWN, d6: D6_SPINDOWN, d8: D8_SPINDOWN, d10: D10_SPINDOWN, 'd%': D_PERCENT_SPINDOWN, d12: D12_SPINDOWN, d20: SPINDOWN_NUMBERS }

function calcVolumeMl(diceType, sizeInMM, d2Sides, d2Height) {
  if (diceType === 'd2') {
    // N-gon prism: V = (N/2) * R² * sin(2π/N) * H, R = sizeInMM/2
    const N = d2Sides  ?? D2_DEFAULT_SIDES
    const H = d2Height ?? D2_DEFAULT_HEIGHT
    const R = sizeInMM / 2
    return (N / 2) * R * R * Math.sin(2 * Math.PI / N) * H / 1000
  } else if (diceType === 'd4') {
    // Regular tetrahedron: V = a³ / (6√2)
    const a = sizeInMM
    return (a * a * a) / (6 * Math.SQRT2) / 1000
  } else if (diceType === 'd6') {
    const a = sizeInMM
    return (a * a * a) / 1000
  } else if (diceType === 'd8') {
    const a = sizeInMM
    return (Math.SQRT2 / 3) * a * a * a / 1000
  } else if (diceType === 'd10' || diceType === 'd%') {
    // Pentagonal trapezohedron: numerical constant for our parameterisation
    // V ≈ 0.875 * h³ where h = sizeInMM/2, derived from the kite-solid volume
    const h = sizeInMM / 2
    return 0.875 * h * h * h / 1000
  } else if (diceType === 'd12') {
    // Regular dodecahedron: V = (15+7√5)/4 · a³, a = sizeInMM / (√3·φ)
    const a = sizeInMM / (Math.sqrt(3) * PHI)
    return ((15 + 7 * Math.sqrt(5)) / 4) * a * a * a / 1000
  } else {
    // D20
    const a = sizeInMM * SIZE_EDGE_FACTOR
    return (5 / 12) * (3 + Math.sqrt(5)) * a * a * a / 1000
  }
}

export function ControlPanel({ onFocusFace, onSaveDice }) {
  const sizeInMM = useDiceStore(s => s.sizeInMM)
  const diceType = useDiceStore(s => s.diceType)
  const d8Height = useDiceStore(s => s.d8Height)
  const d10Radius = useDiceStore(s => s.d10Radius)
  const setSize = useDiceStore(s => s.setSize)
  const setDiceType = useDiceStore(s => s.setDiceType)
  const d2Sides  = useDiceStore(s => s.d2Sides)
  const d2Height = useDiceStore(s => s.d2Height)
  const setD2Sides  = useDiceStore(s => s.setD2Sides)
  const setD2Height = useDiceStore(s => s.setD2Height)
  const setD8Height = useDiceStore(s => s.setD8Height)
  const setD10Radius = useDiceStore(s => s.setD10Radius)
  const resetFaces = useDiceStore(s => s.resetFaces)
  const applyNumberLayout = useDiceStore(s => s.applyNumberLayout)
  const dieColor      = useDiceStore(s => s.dieColor)
  const engraveColor  = useDiceStore(s => s.engraveColor)
  const setDieColor     = useDiceStore(s => s.setDieColor)
  const setEngraveColor = useDiceStore(s => s.setEngraveColor)
  // D8 display
  const d8HeightDisplay = +(d8Height ?? sizeInMM * Math.SQRT2).toFixed(2)
  // D10 computed values
  const _R10 = sizeInMM / 2
  const _r10 = d10Radius != null ? d10Radius : R_FRAC * _R10
  const d10RadiusDisplay = +_r10.toFixed(2)
  const cos36 = Math.cos(Math.PI / 5)
  const d10LongEdge  = +(Math.sqrt(_r10 * _r10 + _R10 * _R10 * (1 - A_FRAC) ** 2)).toFixed(2)
  const d10ShortEdge = +(Math.sqrt(_r10 * _r10 * 2 * (1 - cos36) + 4 * A_FRAC * A_FRAC * _R10 * _R10)).toFixed(2)
  const d2SidesDisplay  = d2Sides  ?? D2_DEFAULT_SIDES
  const d2HeightDisplay = +(d2Height ?? D2_DEFAULT_HEIGHT).toFixed(2)
  const volumeMl = calcVolumeMl(diceType, sizeInMM, d2Sides, d2Height)

  return (
    <div className="control-panel">
      <>
        <section className="panel-section">
          <h3 className="section-title">Dice Type</h3>
          <div className="mode-toggle mode-toggle--wrap">
            <button className={diceType === 'd2'  ? 'active' : ''} onClick={() => setDiceType('d2')}>D2</button>
            <button className={diceType === 'd4'  ? 'active' : ''} onClick={() => setDiceType('d4')}>D4</button>
            <button className={diceType === 'd6'  ? 'active' : ''} onClick={() => setDiceType('d6')}>D6</button>
            <button className={diceType === 'd8'  ? 'active' : ''} onClick={() => setDiceType('d8')}>D8</button>
            <button className={diceType === 'd10' ? 'active' : ''} onClick={() => setDiceType('d10')}>D10</button>
            <button className={diceType === 'd%'  ? 'active' : ''} onClick={() => setDiceType('d%')}>D%</button>
            <button className={diceType === 'd12' ? 'active' : ''} onClick={() => setDiceType('d12')}>D12</button>
            <button className={diceType === 'd20' ? 'active' : ''} onClick={() => setDiceType('d20')}>D20</button>
          </div>
        </section>

        <section className="panel-section">
          <h3 className="section-title">Die Size</h3>
          {diceType === 'd2' ? (
            <>
              <RangeRow label="Diameter" unit="mm" min={10} max={60} step={0.5}
                value={sizeInMM} onChange={v => setSize(+v)} />
              <RangeRow label="Thickness" unit="mm" min={1} max={20} step={0.5}
                value={d2HeightDisplay}
                onChange={v => setD2Height(+v)} />
              <RangeRow label="Sides" unit="" min={3} max={32} step={1}
                value={d2SidesDisplay}
                onChange={v => setD2Sides(Math.round(+v))} />
            </>
          ) : diceType === 'd4' ? (
            <>
              <RangeRow label="Edge length" unit="mm" min={10} max={50} step={0.5}
                value={sizeInMM} onChange={v => setSize(+v)} />
              <RangeRow label="Height" unit="mm"
                min={+(10 * D4_HEIGHT_FACTOR).toFixed(2)} max={+(50 * D4_HEIGHT_FACTOR).toFixed(2)} step={0.1}
                value={+(sizeInMM * D4_HEIGHT_FACTOR).toFixed(3)}
                onChange={v => setSize(+(v / D4_HEIGHT_FACTOR).toFixed(2))} />
            </>
          ) : diceType === 'd20' ? (
            <>
              <RangeRow label="Point-to-point" unit="mm" min={10} max={50} step={0.5}
                value={sizeInMM} onChange={v => setSize(+v)} />
              <RangeRow label="Edge length" unit="mm"
                min={+(10 * SIZE_EDGE_FACTOR).toFixed(2)} max={+(50 * SIZE_EDGE_FACTOR).toFixed(2)} step={0.1}
                value={+(sizeInMM * SIZE_EDGE_FACTOR).toFixed(3)}
                onChange={v => setSize(+(v / SIZE_EDGE_FACTOR).toFixed(2))} />
              <RangeRow label="Face height" unit="mm"
                min={+(10 * SIZE_HEIGHT_FACTOR).toFixed(2)} max={+(50 * SIZE_HEIGHT_FACTOR).toFixed(2)} step={0.1}
                value={+(sizeInMM * SIZE_HEIGHT_FACTOR).toFixed(3)}
                onChange={v => setSize(+(v / SIZE_HEIGHT_FACTOR).toFixed(2))} />
            </>
          ) : (diceType === 'd10' || diceType === 'd%') ? (
            <>
              <RangeRow label="Height" unit="mm" min={10} max={50} step={0.5}
                value={sizeInMM} onChange={v => setSize(+v)} />
              <RangeRow label="Ring radius" unit="mm" min={2} max={25} step={0.1}
                value={d10RadiusDisplay}
                onChange={v => setD10Radius(+v)} />
              <RangeRow label="Long edge" unit="mm" min={2} max={35} step={0.1}
                value={d10LongEdge}
                onChange={v => {
                  const minLE = _R10 * (1 - A_FRAC)
                  const inner = v * v - minLE * minLE
                  if (inner > 0) setD10Radius(+Math.sqrt(inner).toFixed(2))
                }} />
              <RangeRow label="Short edge" unit="mm" min={1} max={20} step={0.1}
                value={d10ShortEdge}
                onChange={v => {
                  const minSE2 = 4 * A_FRAC * A_FRAC * _R10 * _R10
                  const inner = (v * v - minSE2) / (2 * (1 - cos36))
                  if (inner > 0) setD10Radius(+Math.sqrt(inner).toFixed(2))
                }} />
            </>
          ) : diceType === 'd12' ? (
            <RangeRow label="Point-to-point" unit="mm" min={10} max={50} step={0.5}
              value={sizeInMM} onChange={v => setSize(+v)} />
          ) : diceType === 'd8' ? (
            <>
              <RangeRow label="Base edge" unit="mm" min={10} max={50} step={0.5}
                value={sizeInMM} onChange={v => setSize(+v)} />
              <RangeRow label="Height" unit="mm" min={10} max={60} step={0.5}
                value={d8HeightDisplay}
                onChange={v => setD8Height(+v)} />
            </>
          ) : (
            <RangeRow label="Edge length" unit="mm" min={10} max={50} step={0.5}
              value={sizeInMM} onChange={v => setSize(+v)} />
          )}
        </section>

        <div className="volume-display">
          <span className="sub-label">Est. volume</span>
          <span className="volume-value">{volumeMl.toFixed(2)} ml</span>
        </div>

        <section className="panel-section">
          <h3 className="section-title">Layout Preset</h3>
          <div className="preset-row">
            <button className="btn-preset" onClick={() => applyNumberLayout(DEFAULT_NUMBERS[diceType])}>Default</button>
            {diceType !== 'd2' && diceType !== 'd4' && (
              <button className="btn-preset" onClick={() => applyNumberLayout(SPINDOWN_BY_TYPE[diceType])}>Spindown</button>
            )}
          </div>
        </section>

        <section className="panel-section">
          <h3 className="section-title">Colours</h3>
          <div className="color-row">
            <span className="sub-label">Die</span>
            <input type="color" value={dieColor} onChange={e => setDieColor(e.target.value)} />
          </div>
          <div className="color-row">
            <span className="sub-label">Engraving</span>
            <input type="color" value={engraveColor} onChange={e => setEngraveColor(e.target.value)} />
          </div>
        </section>

        <section className="panel-section">
          <div className="section-header">
            <h3 className="section-title">Faces</h3>
            <button className="btn-sm" onClick={resetFaces}>Reset</button>
          </div>
          <FaceGrid onFocusFace={onFocusFace} />
        </section>

        <section className="panel-section">
          <h3 className="section-title">Library</h3>
          <DiceLibrary onSaveDice={onSaveDice} />
        </section>
      </>
    </div>
  )
}
