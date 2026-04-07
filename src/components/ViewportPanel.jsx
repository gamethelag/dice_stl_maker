import { useState } from 'react'

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
      <polyline points="9 21 9 12 15 12 15 21"/>
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="12" y1="3" x2="12" y2="21"/>
      <rect x="3" y="3" width="18" height="18" rx="1"/>
    </svg>
  )
}

function AxesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="20" x2="4" y2="4"  stroke="#44dd44"/>
      <line x1="4" y1="20" x2="20" y2="20" stroke="#ff4444"/>
      <line x1="4" y1="20" x2="14" y2="10" stroke="#4488ff"/>
      <polyline points="4,8 4,4 8,4"      stroke="#44dd44" fill="none"/>
      <polyline points="16,20 20,20 20,16" stroke="#ff4444" fill="none"/>
      <polyline points="11,13 14,10 17,10" stroke="#4488ff" fill="none"/>
    </svg>
  )
}

export function ViewportPanel({ canvasRef, isBuilding, onResetView, onSetGrid, onSetAxes }) {
  const [gridOn, setGridOn] = useState(true)
  const [axesOn, setAxesOn] = useState(false)

  const toggleGrid = () => { const v = !gridOn; setGridOn(v); onSetGrid?.(v) }
  const toggleAxes = () => { const v = !axesOn; setAxesOn(v); onSetAxes?.(v) }

  return (
    <div className="viewport-panel">
      <canvas ref={canvasRef} className="viewport-canvas" />
      {isBuilding && (
        <div className="building-overlay">
          <span>Building 3D geometry…</span>
        </div>
      )}
      <div className="viewport-side-controls">
        <button className="btn-side-icon" onClick={onResetView} title="Reset to home view">
          <HomeIcon />
        </button>
        <button className={`btn-side-icon${gridOn ? ' active' : ''}`} onClick={toggleGrid} title="Toggle ground plane">
          <GridIcon />
        </button>
        <button className={`btn-side-icon${axesOn ? ' active' : ''}`} onClick={toggleAxes} title="Toggle world axes">
          <AxesIcon />
        </button>
      </div>
    </div>
  )
}
