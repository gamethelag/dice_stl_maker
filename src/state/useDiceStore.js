import { create } from 'zustand'
import { D20_NUMBERS } from '../geometry/D20Geometry.js'

let _nextId = 1
const uid = () => String(_nextId++)

function makeDefaultFace(index) {
  const num = D20_NUMBERS[index]
  return {
    index,
    texts: [{
      id: uid(),
      text: String(num),
      fontIndex: 0,
      size: 6,
      x: 0,
      y: 0,
      rot: 0,
      depth: 0.4,
      mode: 'cut',
      decorator: (num === 6 || num === 9) ? 'underline' : 'none',
      decoratorSize: 1.0,
    }],
    svgs: [],
  }
}

function makeDefaultFaces() {
  return Array.from({ length: 20 }, (_, i) => makeDefaultFace(i))
}

export const useDiceStore = create((set, get) => ({
  sizeInMM: 25,
  selectedFaceIndex: null,
  faces: makeDefaultFaces(),
  loadedFonts: [],
  activeFontIndex: 0,

  setSize: (mm) => set({ sizeInMM: mm }),

  setSelectedFace: (index) => set({ selectedFaceIndex: index }),

  setFaceContent: (faceIndex, content) => set(state => {
    const faces = [...state.faces]
    faces[faceIndex] = { ...faces[faceIndex], ...content }
    return { faces }
  }),

  addTextEntry: (faceIndex) => set(state => {
    const faces = [...state.faces]
    const face = { ...faces[faceIndex] }
    face.texts = [...face.texts, {
      id: uid(),
      text: '',
      fontIndex: state.activeFontIndex,
      size: 6,
      x: 0,
      y: 0,
      rot: 0,
      depth: 0.4,
      mode: 'cut',
      decorator: 'none',
      decoratorSize: 1.0,
    }]
    faces[faceIndex] = face
    return { faces }
  }),

  updateTextEntry: (faceIndex, entryId, updates) => set(state => {
    const faces = [...state.faces]
    const face = { ...faces[faceIndex] }
    face.texts = face.texts.map(e => e.id === entryId ? { ...e, ...updates } : e)
    faces[faceIndex] = face
    return { faces }
  }),

  removeTextEntry: (faceIndex, entryId) => set(state => {
    const faces = [...state.faces]
    const face = { ...faces[faceIndex] }
    face.texts = face.texts.filter(e => e.id !== entryId)
    faces[faceIndex] = face
    return { faces }
  }),

  addSVGEntry: (faceIndex, svgData, name) => set(state => {
    const faces = [...state.faces]
    const face = { ...faces[faceIndex] }
    face.svgs = [...face.svgs, {
      id: uid(),
      svgData,
      name: name || 'image.svg',
      scale: 0.8,
      x: 0,
      y: 0,
      rot: 0,
      depth: 0.4,
      mode: 'cut',
    }]
    faces[faceIndex] = face
    return { faces }
  }),

  updateSVGEntry: (faceIndex, entryId, updates) => set(state => {
    const faces = [...state.faces]
    const face = { ...faces[faceIndex] }
    face.svgs = face.svgs.map(e => e.id === entryId ? { ...e, ...updates } : e)
    faces[faceIndex] = face
    return { faces }
  }),

  removeSVGEntry: (faceIndex, entryId) => set(state => {
    const faces = [...state.faces]
    const face = { ...faces[faceIndex] }
    face.svgs = face.svgs.filter(e => e.id !== entryId)
    faces[faceIndex] = face
    return { faces }
  }),

  addFont: (fontObj) => set(state => ({
    loadedFonts: [...state.loadedFonts, fontObj],
    activeFontIndex: state.loadedFonts.length,
  })),

  setActiveFontIndex: (i) => set({ activeFontIndex: i }),

  // Copy style (size, depth, mode, fontIndex, x, y, rot) from one face's first
  // text entry to all other faces' text entries, preserving each face's text content.
  applyTextStyleToAllFaces: (sourceFaceIndex) => set(state => {
    const source = state.faces[sourceFaceIndex]?.texts[0]
    if (!source) return {}
    const { size, depth, mode, fontIndex, x, y, rot } = source
    const faces = state.faces.map((face, fi) => {
      if (fi === sourceFaceIndex) return face
      return {
        ...face,
        texts: face.texts.map(entry => ({ ...entry, size, depth, mode, fontIndex, x, y, rot })),
      }
    })
    return { faces }
  }),

  resetFaces: () => set({ faces: makeDefaultFaces(), selectedFaceIndex: null }),

  // Apply a new number layout: update each face's first text entry to the new number,
  // preserving all style settings. Extra text entries and SVGs are untouched.
  applyNumberLayout: (numbers) => set(state => {
    const faces = state.faces.map((face, fi) => {
      const newText = String(numbers[fi])
      if (!face.texts.length) return face
      return {
        ...face,
        texts: face.texts.map((entry, ti) =>
          ti === 0 ? { ...entry, text: newText } : entry
        ),
      }
    })
    return { faces }
  }),
}))
