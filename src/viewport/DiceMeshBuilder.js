import * as THREE from 'three'
import * as jscad from '@jscad/modeling'

const { geom3, poly3 } = jscad.geometries

/**
 * Convert a JSCAD geom3 to a plain THREE.BufferGeometry (no material groups).
 * Used for support structures which don't need outer/inner classification.
 */
export function buildSimpleThreeGeometry(jscadGeom) {
  const polygons = geom3.toPolygons(jscadGeom)
  const pos = [], norm = []
  for (const polygon of polygons) {
    const verts = poly3.toPoints(polygon)
    const n = poly3.plane(polygon).slice(0, 3)
    for (let i = 1; i < verts.length - 1; i++) {
      pos.push(...verts[0], ...verts[i], ...verts[i + 1])
      norm.push(...n, ...n, ...n)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(norm, 3))
  geo.computeBoundingSphere()
  return geo
}

export function jscadToThreeGeometry(jscadGeom, faceDescriptors) {
  const polygons = geom3.toPolygons(jscadGeom)

  // Pre-compute per-face plane data: normal + signed distance d = center·normal
  const facePlanes = faceDescriptors ? faceDescriptors.map(f => ({
    nx: f.normal[0], ny: f.normal[1], nz: f.normal[2],
    d: f.center[0] * f.normal[0] + f.center[1] * f.normal[1] + f.center[2] * f.normal[2],
  })) : null

  const posOuter = [], normOuter = []   // orange — original die surface
  const posInner = [], normInner = []   // black  — cut walls + floors

  for (const polygon of polygons) {
    const verts = poly3.toPoints(polygon)
    const n = poly3.plane(polygon).slice(0, 3)

    let isOuter = !facePlanes
    if (facePlanes) {
      // Find the die face whose normal best matches this polygon's normal
      let bestDot = -1, bestPlane = null
      for (const fp of facePlanes) {
        const dot = n[0] * fp.nx + n[1] * fp.ny + n[2] * fp.nz
        if (dot > bestDot) { bestDot = dot; bestPlane = fp }
      }
      if (bestDot > 0.98 && bestPlane) {
        // Normal matches — check if centroid sits on the outer die surface
        let cx = 0, cy = 0, cz = 0
        for (const v of verts) { cx += v[0]; cy += v[1]; cz += v[2] }
        const inv = 1 / verts.length
        cx *= inv; cy *= inv; cz *= inv
        const dist = cx * bestPlane.nx + cy * bestPlane.ny + cz * bestPlane.nz
        // Outer surface: centroid is within a tiny tolerance of the face plane
        isOuter = (Math.abs(dist - bestPlane.d) < 0.02)
      }
    }

    const pos  = isOuter ? posOuter : posInner
    const norm = isOuter ? normOuter : normInner
    for (let i = 1; i < verts.length - 1; i++) {
      pos.push(...verts[0], ...verts[i], ...verts[i + 1])
      norm.push(...n, ...n, ...n)
    }
  }

  const allPos  = [...posOuter,  ...posInner]
  const allNorm = [...normOuter, ...normInner]
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(allPos, 3))
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(allNorm, 3))

  const co = posOuter.length / 3
  const ci = posInner.length / 3
  if (co > 0) geo.addGroup(0,  co, 0)
  if (ci > 0) geo.addGroup(co, ci, 1)

  geo.computeBoundingSphere()
  return geo
}

function vertexToUV(vertex, face) {
  const dx = vertex[0] - face.center[0]
  const dy = vertex[1] - face.center[1]
  const dz = vertex[2] - face.center[2]
  const u = (dx * face.uBasis[0] + dy * face.uBasis[1] + dz * face.uBasis[2]) / face.faceRadius
  const v = (dx * face.vBasis[0] + dy * face.vBasis[1] + dz * face.vBasis[2]) / face.faceRadius
  return [(u + 1) / 2, (v + 1) / 2]
}

export function buildFaceMesh(faces) {
  const positions = []
  const normals = []
  const uvs = []
  const groups = []

  for (let fi = 0; fi < faces.length; fi++) {
    const face = faces[fi]
    const n = face.normal
    let verts = face.vertices
    const start = positions.length / 3

    if (verts.length >= 3) {
      const v0 = verts[0], v1 = verts[1], v2 = verts[2]
      const ax = v1[0]-v0[0], ay = v1[1]-v0[1], az = v1[2]-v0[2]
      const bx = v2[0]-v0[0], by = v2[1]-v0[1], bz = v2[2]-v0[2]
      const crossDotNormal =
        (ay*bz - az*by) * n[0] +
        (az*bx - ax*bz) * n[1] +
        (ax*by - ay*bx) * n[2]
      if (crossDotNormal < 0) verts = verts.slice().reverse()
    }

    for (let i = 1; i < verts.length - 1; i++) {
      const v0 = verts[0], vi = verts[i], vi1 = verts[i + 1]
      positions.push(...v0, ...vi, ...vi1)
      normals.push(...n, ...n, ...n)
      const [u0, vv0] = vertexToUV(v0,  face)
      const [ui, vvi] = vertexToUV(vi,  face)
      const [u1, vv1] = vertexToUV(vi1, face)
      uvs.push(u0, vv0, ui, vvi, u1, vv1)
    }

    const count = positions.length / 3 - start
    groups.push({ faceIndex: fi, start, count })
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2))
  for (const g of groups) geo.addGroup(g.start, g.count, g.faceIndex)
  geo.computeBoundingSphere()
  return { geometry: geo, groups }
}

export function createDiceMesh(faces, dieColor = '#FF8826') {
  const { geometry } = buildFaceMesh(faces)

  const canvases = faces.map(() => {
    const c = document.createElement('canvas')
    c.width = 64; c.height = 64
    const ctx = c.getContext('2d')
    ctx.fillStyle = dieColor
    ctx.fillRect(0, 0, 64, 64)
    return c
  })

  const bumpCanvases = faces.map(() => {
    const c = document.createElement('canvas')
    c.width = 64; c.height = 64
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 64, 64)
    return c
  })

  const materials = canvases.map((canvas, i) => {
    const tex = new THREE.CanvasTexture(canvas)
    const bumpTex = new THREE.CanvasTexture(bumpCanvases[i])
    return new THREE.MeshStandardMaterial({
      map: tex,
      bumpMap: bumpTex,
      bumpScale: 3.0,
      roughness: 0.45,
      metalness: 0.25,
      side: THREE.DoubleSide,
    })
  })

  const mesh = new THREE.Mesh(geometry, materials)

  function setFaceHighlight(fi, highlighted) {
    if (!materials[fi]) return
    materials[fi].emissive.setHex(highlighted ? 0xffffff : 0x000000)
    materials[fi].emissiveIntensity = highlighted ? 0.35 : 0
  }

  function setFaceTexture(fi, newCanvas) {
    if (!materials[fi]) return
    const oldTex = materials[fi].map
    materials[fi].map = new THREE.CanvasTexture(newCanvas)
    materials[fi].needsUpdate = true
    if (oldTex) oldTex.dispose()
  }

  function setBumpTexture(fi, newCanvas) {
    if (!materials[fi]) return
    const oldTex = materials[fi].bumpMap
    materials[fi].bumpMap = new THREE.CanvasTexture(newCanvas)
    materials[fi].needsUpdate = true
    if (oldTex) oldTex.dispose()
  }

  return { mesh, setFaceHighlight, setFaceTexture, setBumpTexture }
}

export function createEdgesMesh(faces) {
  const positions = []
  const seen = new Set()

  for (const face of faces) {
    const verts = face.vertices
    for (let i = 0; i < verts.length; i++) {
      const a = verts[i]
      const b = verts[(i + 1) % verts.length]
      const key = [a, b].map(v => v.map(x => x.toFixed(3)).join(',')).sort().join('|')
      if (!seen.has(key)) {
        seen.add(key)
        positions.push(...a, ...b)
      }
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const mat = new THREE.LineBasicMaterial({ color: 0xff8826, transparent: true, opacity: 0.35 })
  return new THREE.LineSegments(geo, mat)
}
