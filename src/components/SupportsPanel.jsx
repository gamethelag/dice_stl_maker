import { useDiceStore } from '../state/useDiceStore.js'
import { RangeRow } from './RangeRow.jsx'

export function SupportsPanel() {
  const supportsEnabled      = useDiceStore(s => s.supportsEnabled)
  const supportSettings      = useDiceStore(s => s.supportSettings)
  const pinLocations         = useDiceStore(s => s.pinLocations)
  const pinMode              = useDiceStore(s => s.pinMode)
  const setSupportsEnabled   = useDiceStore(s => s.setSupportsEnabled)
  const updateSupportSetting = useDiceStore(s => s.updateSupportSetting)
  const removePin            = useDiceStore(s => s.removePin)
  const clearPins            = useDiceStore(s => s.clearPins)
  const setPinMode           = useDiceStore(s => s.setPinMode)

  const { fins, bumpers, pins } = supportSettings

  return (
    <section className="panel-section">
      <div className="section-header">
        <h3 className="section-title">Print Supports</h3>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={supportsEnabled}
            onChange={e => {
              setSupportsEnabled(e.target.checked)
              if (!e.target.checked && pinMode) setPinMode(false)
            }}
          />
          <span className="toggle-text">{supportsEnabled ? 'On' : 'Off'}</span>
        </label>
      </div>

      {supportsEnabled && (
        <div className="supports-body">

          {/* Fin Supports */}
          <div className="support-group">
            <div className="support-group-header">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={fins.enabled}
                  onChange={e => updateSupportSetting('fins', 'enabled', e.target.checked)}
                />
                <span className="support-group-title">Fin Supports</span>
              </label>
            </div>
            {fins.enabled && (
              <div className="support-group-body">
                <RangeRow
                  label="Contact offset" unit="mm" min={0} max={2} step={0.05}
                  value={fins.contactOffset}
                  onChange={v => updateSupportSetting('fins', 'contactOffset', +v)}
                />
                <RangeRow
                  label="Contact thickness" unit="mm" min={0.1} max={1} step={0.05}
                  value={fins.contactThickness}
                  onChange={v => updateSupportSetting('fins', 'contactThickness', +v)}
                />
                <RangeRow
                  label="Arm angle" unit="°" min={5} max={85} step={1}
                  value={fins.armAngle}
                  onChange={v => updateSupportSetting('fins', 'armAngle', +v)}
                />
                <RangeRow
                  label="Arm length" unit="mm" min={0.5} max={5} step={0.1}
                  value={fins.armLength}
                  onChange={v => updateSupportSetting('fins', 'armLength', +v)}
                />
              </div>
            )}
          </div>

          {/* Vertex Bumpers */}
          <div className="support-group">
            <div className="support-group-header">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={bumpers.enabled}
                  onChange={e => updateSupportSetting('bumpers', 'enabled', e.target.checked)}
                />
                <span className="support-group-title">Vertex Bumpers</span>
              </label>
            </div>
            {bumpers.enabled && (
              <div className="support-group-body">
                <RangeRow
                  label="Radius" unit="mm" min={0.1} max={3} step={0.05}
                  value={bumpers.radius}
                  onChange={v => updateSupportSetting('bumpers', 'radius', +v)}
                />
              </div>
            )}
          </div>

          {/* Pin Supports */}
          <div className="support-group">
            <div className="support-group-header">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={pins.enabled}
                  onChange={e => {
                    updateSupportSetting('pins', 'enabled', e.target.checked)
                    if (!e.target.checked && pinMode) setPinMode(false)
                  }}
                />
                <span className="support-group-title">Pin Supports</span>
              </label>
            </div>
            {pins.enabled && (
              <div className="support-group-body">
                <RangeRow
                  label="Radius" unit="mm" min={0.1} max={2} step={0.05}
                  value={pins.radius}
                  onChange={v => updateSupportSetting('pins', 'radius', +v)}
                />
                <RangeRow
                  label="Height" unit="mm" min={0.5} max={10} step={0.1}
                  value={pins.height}
                  onChange={v => updateSupportSetting('pins', 'height', +v)}
                />

                <div className="pin-controls">
                  <button
                    className={`btn-sm btn-pin-mode${pinMode ? ' active' : ''}`}
                    onClick={() => setPinMode(!pinMode)}
                  >
                    {pinMode ? 'Done placing' : 'Place pins'}
                  </button>
                  {pinLocations.length > 0 && (
                    <button className="btn-sm" onClick={clearPins}>Clear all</button>
                  )}
                </div>

                {pinMode && (
                  <p className="pin-hint">Click a face in the viewport to place a pin</p>
                )}

                {pinLocations.length > 0 && (
                  <ul className="pin-list">
                    {pinLocations.map((p, i) => (
                      <li key={p.id} className="pin-list-item">
                        <span className="pin-label">Pin {i + 1} · face {p.faceIndex}</span>
                        <button className="btn-sm btn-pin-delete" onClick={() => removePin(p.id)}>✕</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </section>
  )
}
