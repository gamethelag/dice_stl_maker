import { useState, useCallback, useEffect } from 'react'
import { useDiceStore } from './state/useDiceStore.js'
import { useD20Faces } from './hooks/useD20Faces.js'
import { useViewport } from './hooks/useViewport.js'
import { useFaceTextures } from './hooks/useFaceTextures.js'
import { useSolidRebuild } from './hooks/useSolidRebuild.js'
import { exportD20STL } from './export/exportSTL.js'
import { Layout } from './components/Layout.jsx'
import { Header } from './components/Header.jsx'
import { ViewportPanel } from './components/ViewportPanel.jsx'
import { ControlPanel } from './components/ControlPanel.jsx'
import { FaceEditorPanel } from './components/FaceEditorPanel.jsx'
import * as opentype from 'opentype.js'

export default function App() {
  const sizeInMM = useDiceStore(s => s.sizeInMM)
  const faces = useDiceStore(s => s.faces)
  const loadedFonts = useDiceStore(s => s.loadedFonts)
  const selectedFaceIndex = useDiceStore(s => s.selectedFaceIndex)
  const setSelectedFace = useDiceStore(s => s.setSelectedFace)
  const addFont = useDiceStore(s => s.addFont)
  const [isExporting, setIsExporting] = useState(false)

  const faceDescriptors = useD20Faces(sizeInMM)

  const handleFaceClick = useCallback((fi) => {
    setSelectedFace(fi)
  }, [setSelectedFace])

  const { canvasRef, updateSolidMesh, updateFaceTextures, highlightFace, focusFace, resetView, setGridVisible, setAxesVisible } = useViewport({
    faceDescriptors,
    onFaceClick: handleFaceClick,
  })

  useEffect(() => {
    highlightFace(selectedFaceIndex ?? -1)
  }, [selectedFaceIndex, highlightFace])

  useFaceTextures({ faceDescriptors, faces, loadedFonts, updateFaceTextures })

  const { isBuilding } = useSolidRebuild({
    faceDescriptors,
    faces,
    loadedFonts,
    sizeInMM,
    updateSolidMesh,
  })

  // Auto-load default font on startup
  useEffect(() => {
    fetch('/fonts/arial.ttf')
      .then(r => r.arrayBuffer())
      .then(buf => {
        const font = opentype.parse(buf)
        addFont({ name: 'Arial', data: buf, font })
      })
      .catch(e => console.warn('Default font load failed:', e))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = async () => {
    if (isBuilding || isExporting) return
    setIsExporting(true)
    try {
      await exportD20STL({ faceDescriptors, faces, loadedFonts, sizeInMM })
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Layout
      header={<Header onExport={handleExport} isBuilding={isBuilding} isExporting={isExporting} />}
      controls={<ControlPanel onFocusFace={fi => focusFace(faceDescriptors[fi])} />}
      viewport={<ViewportPanel canvasRef={canvasRef} isBuilding={isBuilding} onResetView={resetView} onSetGrid={setGridVisible} onSetAxes={setAxesVisible} />}
      editor={<FaceEditorPanel />}
    />
  )
}
