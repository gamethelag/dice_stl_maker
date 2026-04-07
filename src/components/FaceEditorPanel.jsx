import { useState } from 'react'
import { useDiceStore } from '../state/useDiceStore.js'
import { TextTab } from './TextTab.jsx'
import { SVGTab } from './SVGTab.jsx'

export function FaceEditorPanel() {
  const selectedFaceIndex = useDiceStore(s => s.selectedFaceIndex)
  const face = useDiceStore(s => selectedFaceIndex !== null ? s.faces[selectedFaceIndex] : null)
  const setSelectedFace = useDiceStore(s => s.setSelectedFace)
  const [activeTab, setActiveTab] = useState('text')

  if (selectedFaceIndex === null || !face) {
    return (
      <div className="editor-panel editor-empty">
        <p>Click a face on the die or in the grid to edit it.</p>
      </div>
    )
  }

  return (
    <div className="editor-panel">
      <div className="editor-header">
        <span className="editor-title">Face {selectedFaceIndex + 1}</span>
        <button className="btn-close" onClick={() => setSelectedFace(null)}>✕</button>
      </div>

      <div className="tab-bar">
        <button
          className={activeTab === 'text' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('text')}
        >Text</button>
        <button
          className={activeTab === 'svg' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('svg')}
        >SVG</button>
      </div>

      <div className="tab-content">
        {activeTab === 'text' && <TextTab faceIndex={selectedFaceIndex} />}
        {activeTab === 'svg' && <SVGTab faceIndex={selectedFaceIndex} />}
      </div>
    </div>
  )
}
