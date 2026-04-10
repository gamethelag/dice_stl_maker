import { useState, useCallback, useEffect } from 'react'
import { useDiceStore } from './state/useDiceStore.js'
import { useDiceFaces } from './hooks/useDiceFaces.js'
import { useViewport } from './hooks/useViewport.js'
import { useFaceTextures } from './hooks/useFaceTextures.js'
import { useSolidRebuild } from './hooks/useSolidRebuild.js'
import { exportDiceSTL } from './export/exportSTL.js'
import { Layout } from './components/Layout.jsx'
import { Header } from './components/Header.jsx'
import { ViewportPanel } from './components/ViewportPanel.jsx'
import { ControlPanel } from './components/ControlPanel.jsx'
import { FaceEditorPanel } from './components/FaceEditorPanel.jsx'
import * as opentype from 'opentype.js'

export default function App() {
  const sizeInMM = useDiceStore(s => s.sizeInMM)
  const diceType = useDiceStore(s => s.diceType)
  const d2Sides  = useDiceStore(s => s.d2Sides)
  const d2Height = useDiceStore(s => s.d2Height)
  const d8Height = useDiceStore(s => s.d8Height)
  const d10Radius = useDiceStore(s => s.d10Radius)
  const faces = useDiceStore(s => s.faces)
  const loadedFonts = useDiceStore(s => s.loadedFonts)
  const selectedFaceIndex = useDiceStore(s => s.selectedFaceIndex)
  const setSelectedFace = useDiceStore(s => s.setSelectedFace)
  const addFont = useDiceStore(s => s.addFont)
  const dieColor     = useDiceStore(s => s.dieColor)
  const engraveColor = useDiceStore(s => s.engraveColor)
  const supportsEnabled  = useDiceStore(s => s.supportsEnabled)
  const supportSettings  = useDiceStore(s => s.supportSettings)
  const pinLocations     = useDiceStore(s => s.pinLocations)
  const pinMode          = useDiceStore(s => s.pinMode)
  const addPin           = useDiceStore(s => s.addPin)
  const [isExporting, setIsExporting] = useState(false)

  const { faceDescriptors, classificationDescriptors } = useDiceFaces(sizeInMM, diceType, d2Sides, d2Height, d8Height, d10Radius)

  // Click the already-selected face to deselect (camera stays put)
  const handleFaceClick = useCallback((fi) => {
    setSelectedFace(fi === selectedFaceIndex ? null : fi)
  }, [setSelectedFace, selectedFaceIndex])

  const saveDiceToLibrary = useDiceStore(s => s.saveDiceToLibrary)

  const handlePinPlace = useCallback((faceIndex, u, v) => {
    addPin({ faceIndex, u, v })
  }, [addPin])

  const { canvasRef, updateSolidMesh, updateFaceTextures, highlightFace, focusFace, resetView, setGridVisible, setAxesVisible, toggleBanana, getThumbnail, setColors } = useViewport({
    faceDescriptors,
    classificationDescriptors,
    onFaceClick: handleFaceClick,
    onPinPlace: handlePinPlace,
    pinMode,
  })

  useEffect(() => { setColors(dieColor, engraveColor) }, [dieColor, engraveColor, setColors])

  useEffect(() => {
    highlightFace(selectedFaceIndex ?? -1)
  }, [selectedFaceIndex, highlightFace])

  useFaceTextures({ faceDescriptors, faces, loadedFonts, updateFaceTextures, dieColor })

  const { isBuilding } = useSolidRebuild({
    faceDescriptors,
    faces,
    loadedFonts,
    sizeInMM,
    diceType,
    d2Sides,
    d2Height,
    d8Height,
    d10Radius,
    updateSolidMesh,
    supportsEnabled,
    supportSettings,
    pinLocations,
  })

  // Auto-load all bundled fonts on startup
  useEffect(() => {
    // Only list fonts whose files in public/fonts/ are genuine TTF/OTF binaries.
    // Fonts downloaded from Google Fonts via the web API arrive as WOFF2 and must
    // be replaced with the desktop (TTF) versions from fonts.google.com → Download family.
    // Currently broken (WOFF2 in repo, need TTF): Cinzel, Oswald, Permanent Marker,
    //   Roboto Condensed — removed from list until replaced.
    const BUNDLED_FONTS = [
      { name: 'Arial',           file: 'arial.ttf' },
      { name: 'Bebas Neue',      file: 'BebasNeue-Regular.ttf' },
      { name: 'Medieval Sharp',  file: 'MedievalSharp.ttf' },
      { name: 'Almendra Regular',file: 'Almendra-Regular.ttf' },
      { name: 'Almendra Bold',   file: 'Almendra-Bold.ttf' },
      { name: 'Pirata One',      file: 'PirataOne-Regular.ttf' },
    ]
    for (const { name, file } of BUNDLED_FONTS) {
      fetch(`${import.meta.env.BASE_URL}fonts/${file}`)
        .then(r => r.arrayBuffer())
        .then(buf => {
          const font = opentype.parse(buf)
          addFont({ name, data: buf, font })
        })
        .catch(e => console.warn(`Font load failed (${name}):`, e))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = async () => {
    if (isBuilding || isExporting) return
    setIsExporting(true)
    try {
      await exportDiceSTL({ faceDescriptors, faces, loadedFonts, sizeInMM, diceType, d2Sides, d2Height, d10Radius, d8Height, supportsEnabled, supportSettings, pinLocations })
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Layout
      header={<Header onExport={handleExport} isBuilding={isBuilding} isExporting={isExporting} />}
      controls={<ControlPanel onFocusFace={fi => focusFace(faceDescriptors[fi])} onSaveDice={(name) => saveDiceToLibrary(name, getThumbnail())} />}
      viewport={<ViewportPanel canvasRef={canvasRef} isBuilding={isBuilding} onResetView={resetView} onSetGrid={setGridVisible} onSetAxes={setAxesVisible} onToggleBanana={toggleBanana} />}
      editor={<FaceEditorPanel />}
    />
  )
}
