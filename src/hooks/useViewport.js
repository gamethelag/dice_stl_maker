import { useRef, useEffect, useCallback } from 'react'
import { ThreeScene } from '../viewport/ThreeScene.js'

export function useViewport({ faceDescriptors, classificationDescriptors, onFaceClick, onPinPlace, pinMode }) {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const pinModeRef = useRef(false)

  // Create scene on mount
  useEffect(() => {
    if (!canvasRef.current) return
    const scene = new ThreeScene(canvasRef.current)
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  // Re-initialize die when face descriptors change (size change)
  useEffect(() => {
    if (!sceneRef.current || !faceDescriptors?.length) return
    sceneRef.current.setDie(faceDescriptors, classificationDescriptors)
  }, [faceDescriptors, classificationDescriptors])

  // Keep pin mode ref in sync so the click callback can read it without re-registering
  useEffect(() => { pinModeRef.current = pinMode }, [pinMode])

  // Wire face click callback — single registration, reads pinModeRef at call time
  useEffect(() => {
    if (!sceneRef.current) return
    sceneRef.current.onFaceClick((fi, u, v) => {
      if (pinModeRef.current) {
        onPinPlace?.(fi, u, v)
        return false  // signal to ThreeScene: suppress camera focus
      }
      onFaceClick(fi)
    })
  }, [onFaceClick, onPinPlace])

  const updateSolidMesh = useCallback((jscadGeom, supportGeom = null) => {
    sceneRef.current?.updateSolidMesh(jscadGeom, supportGeom)
  }, [])

  const updateFaceTextures = useCallback((fi, colorCanvas, bumpCanvas) => {
    sceneRef.current?.updateFaceTextures(fi, colorCanvas, bumpCanvas)
  }, [])

  const highlightFace = useCallback((fi) => {
    sceneRef.current?.highlightFace(fi)
  }, [])

  const focusFace = useCallback((face) => {
    sceneRef.current?.focusFace(face)
  }, [])

  const resetView = useCallback(() => {
    sceneRef.current?.resetView()
  }, [])

  const setGridVisible = useCallback((v) => {
    sceneRef.current?.setGridVisible(v)
  }, [])

  const setAxesVisible = useCallback((v) => {
    sceneRef.current?.setAxesVisible(v)
  }, [])

  const toggleBanana = useCallback(() => {
    sceneRef.current?.toggleBanana()
  }, [])

  const getThumbnail = useCallback(() => {
    return sceneRef.current?.getThumbnail() ?? null
  }, [])

  const setColors = useCallback((dieColor, engraveColor) => {
    sceneRef.current?.setColors(dieColor, engraveColor)
  }, [])

  return { canvasRef, updateSolidMesh, updateFaceTextures, highlightFace, focusFace, resetView, setGridVisible, setAxesVisible, toggleBanana, getThumbnail, setColors }
}
