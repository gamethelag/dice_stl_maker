import { create } from 'zustand'
import { D20_NUMBERS } from '../geometry/D20Geometry.js'
import { D2_NUMBERS } from '../geometry/D2Geometry.js'
import { D4_NUMBERS, getD4Vertices, D4_FACE_INDICES, computeD4FaceDescriptors } from '../geometry/D4Geometry.js'
import { D6_NUMBERS } from '../geometry/D6Geometry.js'
import { D8_NUMBERS } from '../geometry/D8Geometry.js'
import { D10_NUMBERS, D_PERCENT_NUMBERS } from '../geometry/D10Geometry.js'
import { D12_NUMBERS } from '../geometry/D12Geometry.js'

let _nextId = 1
const uid = () => String(_nextId++)

const DEFAULT_SIZES = { d2: 20, d4: 22, d6: 18, d8: 18, d10: 25, 'd%': 25, d12: 22, d20: 25 }
const DEFAULT_D10_RADIUS = 12.5

function getNumbers(diceType) {
  if (diceType === 'd2')  return D2_NUMBERS
  if (diceType === 'd4')  return D4_NUMBERS
  if (diceType === 'd6')  return D6_NUMBERS
  if (diceType === 'd8')  return D8_NUMBERS
  if (diceType === 'd10') return D10_NUMBERS
  if (diceType === 'd%')  return D_PERCENT_NUMBERS
  if (diceType === 'd12') return D12_NUMBERS
  return D20_NUMBERS
}

function makeDefaultFace(index, numbers, diceType) {
  const num = numbers[index]
  const underline = ['d10', 'd12', 'd20'].includes(diceType) && (num === 6 || num === 9)
  const text = (diceType === 'd%' && num === 0) ? '00' : String(num)
  return {
    index,
    texts: [{
      id: uid(),
      text,
      fontIndex: 0,
      size: 6,
      x: 0,
      y: 0,
      rot: 0,
      depth: 0.8,
      mode: 'cut',
      decorator: underline ? 'underline' : 'none',
      decoratorSize: 1.0,
      decoratorX: 0,
      decoratorY: 0,
    }],
    svgs: [],
  }
}

// D4: each face shows 3 vertex-labels (one per corner), rotated toward their vertex
function makeD4DefaultFaces(sizeInMM) {
  const a = sizeInMM ?? DEFAULT_SIZES.d4
  const verts = getD4Vertices(a)
  const faceDescs = computeD4FaceDescriptors(a)
  const vertexLabel = ['1', '2', '3', '4']
  const OFFSET_FRAC = 0.55  // place label 55% of faceRadius from face center

  return D4_FACE_INDICES.map((faceVertIndices, fi) => {
    const { center, uBasis, vBasis } = faceDescs[fi]
    const texts = faceVertIndices.map(vi => {
      const v  = verts[vi]
      const dx = v[0] - center[0], dy = v[1] - center[1], dz = v[2] - center[2]
      const len = Math.sqrt(dx*dx + dy*dy + dz*dz)
      const uComp = (dx*uBasis[0] + dy*uBasis[1] + dz*uBasis[2]) / len
      const vComp = (dx*vBasis[0] + dy*vBasis[1] + dz*vBasis[2]) / len
      // x/y are normalised — TextEmbosser multiplies by faceRadius to get mm offset
      return {
        id: uid(),
        text:  vertexLabel[vi],
        fontIndex: 0,
        size:  +(a * 0.18).toFixed(1),  // ~4mm for 22mm die
        x:     +(uComp * OFFSET_FRAC).toFixed(3),
        y:     +(vComp * OFFSET_FRAC).toFixed(3),
        rot:   +(Math.atan2(uComp, vComp) * (180 / Math.PI)).toFixed(1),
        depth: 0.8,
        mode:  'cut',
        decorator:     'none',
        decoratorSize: 1.0,
        decoratorX: 0,
        decoratorY: 0,
      }
    })
    return { index: fi, texts, svgs: [] }
  })
}

function makeDefaultFaces(diceType = 'd20', sizeInMM = null) {
  if (diceType === 'd4') return makeD4DefaultFaces(sizeInMM)
  const numbers = getNumbers(diceType)
  return numbers.map((_, i) => makeDefaultFace(i, numbers, diceType))
}

// Per-type in-session state (not persisted — just so switching types doesn't lose work)

// Library: named saves with thumbnails (persisted to localStorage)
function loadLibrary() {
  try {
    const raw = localStorage.getItem('openDice_library')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function persistLibrary(list) {
  try { localStorage.setItem('openDice_library', JSON.stringify(list)) } catch {}
}

let _nextPinId = 1
const pinUid = () => String(_nextPinId++)

export const useDiceStore = create((set, get) => ({
  diceType: 'd20',
  sizeInMM: 25,
  d2Sides:  null,  // null = D2_DEFAULT_SIDES (8)
  d2Height: null,  // null = D2_DEFAULT_HEIGHT (4mm)
  d8Height: null,  // null = regular octahedron; set to mm for custom height
  d10Radius: null, // null = R_FRAC * (sizeInMM/2); set to mm for custom ring radius
  selectedFaceIndex: null,
  faces: makeDefaultFaces('d20', 25),
  loadedFonts: [],
  activeFontIndex: 0,
  diceLibrary: loadLibrary(), // named saves with thumbnails
  dieColor: '#FF8826',
  engraveColor: '#3a2a18',

  // --- Print supports ---
  supportsEnabled: false,
  supportSettings: {
    fins:    { enabled: false, contactOffset: 0.3, contactThickness: 0.3, armAngle: 45, armLength: 1.5 },
    bumpers: { enabled: false, radius: 0.6 },
    pins:    { enabled: false, radius: 0.35, height: 2.5 },
  },
  pinLocations: [],  // [{ id, faceIndex, u, v }]
  pinMode: false,

  // Switch dice type: reset to default faces and size
  setDiceType: (type) => set(state => {
    if (type === state.diceType) return {}
    return {
      diceType: type,
      sizeInMM: DEFAULT_SIZES[type] ?? 25,
      d2Sides: null,
      d2Height: null,
      d8Height: null,
      d10Radius: (type === 'd10' || type === 'd%') ? DEFAULT_D10_RADIUS : null,
      selectedFaceIndex: null,
      faces: makeDefaultFaces(type, DEFAULT_SIZES[type] ?? 25),
    }
  }),

  setD2Sides:   (s) => set({ d2Sides: s }),
  setD2Height:  (h) => set({ d2Height: h }),
  setD8Height:  (h) => set({ d8Height: h }),
  setD10Radius: (r) => set({ d10Radius: r }),

  // Save current state to the named library (persists to localStorage)
  saveDiceToLibrary: (name, thumbnail) => set(state => {
    const entry = {
      id: Date.now().toString(),
      name: name || `${state.diceType.toUpperCase()} · ${state.sizeInMM}mm`,
      diceType: state.diceType,
      sizeInMM: state.sizeInMM,
      d2Sides:  state.d2Sides,
      d2Height: state.d2Height,
      d8Height: state.d8Height,
      d10Radius: state.d10Radius,
      faces: state.faces,
      dieColor:    state.dieColor,
      engraveColor: state.engraveColor,
      thumbnail,
      savedAt: new Date().toISOString(),
    }
    const diceLibrary = [entry, ...state.diceLibrary]
    persistLibrary(diceLibrary)
    return { diceLibrary }
  }),

  // Load a library entry into the active editor
  loadDiceFromLibrary: (id) => set(state => {
    const entry = state.diceLibrary.find(e => e.id === id)
    if (!entry) return {}
    return {
      diceType: entry.diceType,
      sizeInMM: entry.sizeInMM,
      d2Sides:  entry.d2Sides  ?? null,
      d2Height: entry.d2Height ?? null,
      d8Height: entry.d8Height ?? null,
      d10Radius: entry.d10Radius ?? null,
      faces: entry.faces,
      dieColor:    entry.dieColor    ?? '#FF8826',
      engraveColor: entry.engraveColor ?? '#3a2a18',
      selectedFaceIndex: null,
    }
  }),

  renameDiceInLibrary: (id, name) => set(state => {
    const diceLibrary = state.diceLibrary.map(e => e.id === id ? { ...e, name } : e)
    persistLibrary(diceLibrary)
    return { diceLibrary }
  }),

  deleteDiceFromLibrary: (id) => set(state => {
    const diceLibrary = state.diceLibrary.filter(e => e.id !== id)
    persistLibrary(diceLibrary)
    return { diceLibrary }
  }),

  setDieColor:     (c) => set({ dieColor: c }),
  setEngraveColor: (c) => set({ engraveColor: c }),

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
      depth: 0.8,
      mode: 'cut',
      decorator: 'none',
      decoratorSize: 1.0,
      decoratorX: 0,
      decoratorY: 0,
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
      depth: 0.8,
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

  addFont: (fontObj) => set(state => {
    if (fontObj.userUploaded) {
      // Prepend uploaded font and switch all text entries to use it
      const loadedFonts = [fontObj, ...state.loadedFonts]
      const faces = state.faces.map(face => ({
        ...face,
        texts: face.texts.map(e => ({ ...e, fontIndex: 0 })),
      }))
      return { loadedFonts, faces, activeFontIndex: 0 }
    }
    return {
      loadedFonts: [...state.loadedFonts, fontObj],
      activeFontIndex: state.loadedFonts.length,
    }
  }),

  setActiveFontIndex: (i) => set({ activeFontIndex: i }),

  applyTextStyleToAllFaces: (sourceFaceIndex, sourceEntryId) => set(state => {
    const sourceFace = state.faces[sourceFaceIndex]
    const source = sourceEntryId
      ? sourceFace?.texts.find(t => t.id === sourceEntryId)
      : sourceFace?.texts[0]
    if (!source) return {}
    // Copy style properties only — x, y, rot are per-entry positional values and must
    // not be overwritten (critical for D4 where each entry is placed at a specific vertex).
    const { size, depth, mode, fontIndex, decorator, decoratorSize, decoratorX, decoratorY } = source
    const faces = state.faces.map(face => ({
      ...face,
      texts: face.texts.map(entry =>
        entry.id === sourceEntryId ? entry : { ...entry, size, depth, mode, fontIndex, decorator, decoratorSize, decoratorX, decoratorY }
      ),
    }))
    return { faces }
  }),

  resetFaces: () => set(state => ({
    faces: makeDefaultFaces(state.diceType, state.sizeInMM),
    selectedFaceIndex: null,
  })),

  // --- Support actions ---
  setSupportsEnabled: (enabled) => set({ supportsEnabled: enabled }),

  updateSupportSetting: (category, key, value) => set(state => ({
    supportSettings: {
      ...state.supportSettings,
      [category]: { ...state.supportSettings[category], [key]: value },
    },
  })),

  addPin: ({ faceIndex, u, v }) => set(state => ({
    pinLocations: [...state.pinLocations, { id: pinUid(), faceIndex, u, v }],
  })),

  removePin: (id) => set(state => ({
    pinLocations: state.pinLocations.filter(p => p.id !== id),
  })),

  clearPins: () => set({ pinLocations: [] }),

  setPinMode: (active) => set({ pinMode: active }),

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
