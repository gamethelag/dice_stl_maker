import { useDiceStore } from '../state/useDiceStore.js'
import { RangeRow } from './RangeRow.jsx'
import { FaceGrid } from './FaceGrid.jsx'
import { SIZE_EDGE_FACTOR, SIZE_HEIGHT_FACTOR, D20_NUMBERS, SPINDOWN_NUMBERS } from '../geometry/D20Geometry.js'

export function ControlPanel({ onFocusFace }) {
  const sizeInMM = useDiceStore(s => s.sizeInMM)
  const setSize = useDiceStore(s => s.setSize)
  const resetFaces = useDiceStore(s => s.resetFaces)
  const applyNumberLayout = useDiceStore(s => s.applyNumberLayout)

  const edgeLength   = +(sizeInMM * SIZE_EDGE_FACTOR).toFixed(3)
  const faceHeight   = +(sizeInMM * SIZE_HEIGHT_FACTOR).toFixed(3)

  return (
    <div className="control-panel">
      <section className="panel-section">
        <h3 className="section-title">Die Size</h3>
        <RangeRow
          label="Point-to-point"
          unit="mm"
          min={10} max={50} step={0.5}
          value={sizeInMM}
          onChange={v => setSize(+v)}
        />
        <RangeRow
          label="Edge length"
          unit="mm"
          min={+(10 * SIZE_EDGE_FACTOR).toFixed(2)}
          max={+(50 * SIZE_EDGE_FACTOR).toFixed(2)}
          step={0.1}
          value={edgeLength}
          onChange={v => setSize(+(v / SIZE_EDGE_FACTOR).toFixed(2))}
        />
        <RangeRow
          label="Face height"
          unit="mm"
          min={+(10 * SIZE_HEIGHT_FACTOR).toFixed(2)}
          max={+(50 * SIZE_HEIGHT_FACTOR).toFixed(2)}
          step={0.1}
          value={faceHeight}
          onChange={v => setSize(+(v / SIZE_HEIGHT_FACTOR).toFixed(2))}
        />
      </section>

      <section className="panel-section">
        <h3 className="section-title">Layout Preset</h3>
        <div className="preset-row">
          <button className="btn-preset" onClick={() => applyNumberLayout(D20_NUMBERS)}>Default</button>
          <button className="btn-preset" onClick={() => applyNumberLayout(SPINDOWN_NUMBERS)}>Spindown</button>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-header">
          <h3 className="section-title">Faces</h3>
          <button className="btn-sm" onClick={resetFaces}>Reset</button>
        </div>
        <FaceGrid onFocusFace={onFocusFace} />
      </section>
    </div>
  )
}
