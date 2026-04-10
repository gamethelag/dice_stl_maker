import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createDiceMesh, createEdgesMesh, jscadToThreeGeometry, buildSimpleThreeGeometry } from './DiceMeshBuilder.js'
import { FacePicker } from './FacePicker.js'

export class ThreeScene {
  constructor(canvas) {
    this.canvas = canvas
    this._animId = null
    this._onFaceClick = null
    this._diceMeshObj = null
    this._solidMesh = null
    this._edgesMesh = null
    this._faces = []
    this._classificationFaces = []
    this._highlightedFace = -1
    this._setFaceHighlight = null
    this._setFaceTexture = null
    this._setBumpTexture = null
    this._camTargetPos = null
    this._camTargetUp = null
    this._faceOverlay = null
    this._banana = null
    this._supportMeshObj = null
    this._dieColor = 0xFF8826
    this._engraveColor = 0x3a2a18

    this._initScene()
    this._initLights()
    this._initControls()
    this._initGizmo()
    this._startLoop()
    this._bindEvents()

    this.picker = new FacePicker(this.camera, canvas)
  }

  _initScene() {
    const w = this.canvas.clientWidth || 600
    const h = this.canvas.clientHeight || 400

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(w, h, false)
    this.renderer.autoClear = false

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0d0d0d)

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
    this.camera.position.set(0, 20, 60)

    this._grid = new THREE.GridHelper(100, 20, 0x2a2a2a, 0x2a2a2a)
    this._grid.position.y = -25
    this.scene.add(this._grid)

    this._axesHelper = new THREE.AxesHelper(20)
    this._axesHelper.visible = false
    this.scene.add(this._axesHelper)
  }

  _initLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5))

    const dir1 = new THREE.DirectionalLight(0xffffff, 0.8)
    dir1.position.set(50, 80, 50)
    this.scene.add(dir1)

    const dir2 = new THREE.DirectionalLight(0x442200, 0.4)
    dir2.position.set(-50, -20, -30)
    this.scene.add(dir2)
  }

  _initGizmo() {
    this._gizmoScene = new THREE.Scene()
    this._gizmoCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)

    const addAxis = (dir, color, label) => {
      const d = new THREE.Vector3(...dir)
      const arrow = new THREE.ArrowHelper(d, new THREE.Vector3(0, 0, 0), 0.65, color, 0.22, 0.09)
      this._gizmoScene.add(arrow)

      // Canvas sprite label
      const c = document.createElement('canvas')
      c.width = 32; c.height = 32
      const ctx = c.getContext('2d')
      ctx.font = 'bold 22px Arial'
      ctx.fillStyle = '#' + color.toString(16).padStart(6, '0')
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, 16, 16)
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }))
      sprite.position.copy(d.multiplyScalar(0.88))
      sprite.scale.set(0.28, 0.28, 0.28)
      this._gizmoScene.add(sprite)
    }

    addAxis([1, 0, 0], 0xff4444, 'X')
    addAxis([0, 1, 0], 0x44dd44, 'Y')
    addAxis([0, 0, 1], 0x4488ff, 'Z')

    this._gizmoScene.add(new THREE.AmbientLight(0xffffff, 2))
  }

  _initControls() {
    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.07
    this.controls.minDistance = 5
    this.controls.maxDistance = 200
  }

  _startLoop() {
    const animate = () => {
      this._animId = requestAnimationFrame(animate)

      if (this._camTargetPos) {
        // Arc path: compute the quaternion from current direction to target direction,
        // then apply only a small fraction of it each frame (quaternion slerp from identity).
        const alpha = 0.045
        const radius = this.camera.position.length()
        const currentDir = this.camera.position.clone().normalize()
        const targetDir  = this._camTargetPos.clone().normalize()
        const dot = currentDir.dot(targetDir)

        if (dot < 0.9999) {
          // Quaternion that would rotate all the way from current to target
          const fullQ = new THREE.Quaternion().setFromUnitVectors(currentDir, targetDir)
          // Slerp from identity toward fullQ by alpha — gives a small arc step
          const stepQ = new THREE.Quaternion().slerp(fullQ, alpha)
          this.camera.position.applyQuaternion(stepQ).normalize().multiplyScalar(radius)
        }

        this.camera.up.lerp(this._camTargetUp, alpha).normalize()
        this.camera.lookAt(this.controls.target)

        // Snap and finish when close enough
        if (currentDir.dot(targetDir) > 0.9998) {
          this.camera.position.copy(this._camTargetPos)
          this.camera.up.copy(this._camTargetUp)
          this.camera.lookAt(this.controls.target)
          this._camTargetPos = null
          this._camTargetUp = null
          this.controls.update()
        }
      } else {
        this.controls.update()
      }

      const w = this.canvas.clientWidth || 600
      const h = this.canvas.clientHeight || 400

      // Main scene — full viewport
      this.renderer.setViewport(0, 0, w, h)
      this.renderer.setScissor(0, 0, w, h)
      this.renderer.setScissorTest(true)
      this.renderer.clear()
      this.renderer.render(this.scene, this.camera)

      // Axis navigator — top-right corner (100×100 CSS px)
      const gs = 100
      this._gizmoCamera.position.copy(this.camera.position).normalize().multiplyScalar(3)
      this._gizmoCamera.up.copy(this.camera.up)
      this._gizmoCamera.lookAt(0, 0, 0)
      this.renderer.setViewport(w - gs, h - gs, gs, gs)
      this.renderer.setScissor(w - gs, h - gs, gs, gs)
      this.renderer.clearDepth()
      this.renderer.render(this._gizmoScene, this._gizmoCamera)

      this.renderer.setScissorTest(false)
    }
    animate()
  }

  _bindEvents() {
    const ro = new ResizeObserver(() => this._onResize())
    ro.observe(this.canvas.parentElement || this.canvas)

    const orbitRaycaster = new THREE.Raycaster()

    let downX = 0, downY = 0
    this.canvas.addEventListener('pointerdown', e => {
      downX = e.clientX
      downY = e.clientY

      // Update orbit target to the surface point under the cursor so rotation
      // pivots around where the user is pointing rather than the die centre.
      // Skip during animated fly-to sequences.
      if (!this._camTargetPos && this._solidMesh) {
        const rect = this.canvas.getBoundingClientRect()
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
        const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
        orbitRaycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera)
        const hits = orbitRaycaster.intersectObject(this._solidMesh, false)
        if (hits.length > 0) {
          this.controls.target.copy(hits[0].point)
          this.controls.update()
        }
      }
    })

    this.canvas.addEventListener('click', e => {
      const dx = e.clientX - downX
      const dy = e.clientY - downY
      if (dx * dx + dy * dy > 25) return  // >5 px movement = drag, not click
      this._handleClick(e)
    })
  }

  _onResize() {
    const el = this.canvas.parentElement || this.canvas
    const w = el.clientWidth
    const h = el.clientHeight
    if (!w || !h) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
  }

  _handleClick(event) {
    const { faceIndex, u, v } = this.picker.pick(event)
    if (faceIndex >= 0) {
      // Callback returns false to suppress camera focus (used in pin placement mode)
      const result = this._onFaceClick ? this._onFaceClick(faceIndex, u, v) : undefined
      if (result !== false) this.focusFace(this._faces[faceIndex])
    }
  }

  setColors(dieColorHex, engraveColorHex) {
    this._dieColor = parseInt(dieColorHex.replace('#', ''), 16)
    this._engraveColor = parseInt(engraveColorHex.replace('#', ''), 16)
    if (this._solidMesh) {
      const mats = this._solidMesh.material
      if (Array.isArray(mats)) {
        if (mats[0]) mats[0].color.setHex(this._dieColor)
        if (mats[1]) mats[1].color.setHex(this._engraveColor)
      }
    }
  }

  setDie(faces, classificationFaces) {
    if (this._diceMeshObj) { this.scene.remove(this._diceMeshObj); this._diceMeshObj = null }
    if (this._solidMesh) { this.scene.remove(this._solidMesh); this._solidMesh = null }
    if (this._edgesMesh) { this.scene.remove(this._edgesMesh); this._edgesMesh = null }
    if (this._supportMeshObj) { this.scene.remove(this._supportMeshObj); this._supportMeshObj.geometry?.dispose(); this._supportMeshObj.material?.dispose(); this._supportMeshObj = null }
    this._updateHighlightOverlay(-1)

    this._faces = faces
    this._classificationFaces = classificationFaces ?? faces
    this._highlightedFace = -1

    if (!faces?.length) return

    // Single textured mesh — opaque face canvases show die body colour + labels.
    // Replaced by JSCAD-derived solid geometry once the CSG rebuild completes.
    const hexColor = '#' + this._dieColor.toString(16).padStart(6, '0')
    const { mesh, setFaceHighlight: _setHL, setFaceTexture, setBumpTexture } = createDiceMesh(faces, hexColor)
    this._diceMeshObj = mesh
    this._setFaceHighlight = _setHL
    this._setFaceTexture = setFaceTexture
    this._setBumpTexture = setBumpTexture
    this.scene.add(mesh)

    this._edgesMesh = createEdgesMesh(faces)
    this.scene.add(this._edgesMesh)

    this.picker.setDiceMesh(mesh, faces)

    // Fit camera
    const box = new THREE.Box3().setFromObject(mesh)
    this._dieSize = box.getSize(new THREE.Vector3()).length()
    this.controls.target.copy(box.getCenter(new THREE.Vector3()))
    this.camera.up.set(0, 1, 0)
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3(0, this._dieSize * 0.3, this._dieSize * 1.2))
    this.controls.update()
  }

  focusFace(face) {
    if (!face) return
    const dist = this.camera.position.distanceTo(this.controls.target)
    this.controls.target.set(0, 0, 0)
    this._camTargetPos = new THREE.Vector3(...face.normal).multiplyScalar(dist)
    this._camTargetUp  = new THREE.Vector3(...face.vBasis)
  }

  updateSolidMesh(jscadGeom, supportGeom = null) {
    if (this._solidMesh) {
      this.scene.remove(this._solidMesh)
      this._solidMesh.geometry?.dispose()
      const mats = this._solidMesh.material
      if (Array.isArray(mats)) mats.forEach(m => m.dispose())
      else mats?.dispose()
      this._solidMesh = null
    }

    const geo = jscadToThreeGeometry(jscadGeom, this._classificationFaces)
    geo.computeVertexNormals()

    const materials = [
      new THREE.MeshStandardMaterial({ color: this._dieColor,     roughness: 0.4, metalness: 0.35, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: this._engraveColor, roughness: 0.7, metalness: 0.0,  side: THREE.DoubleSide }),
    ]
    this._solidMesh = new THREE.Mesh(geo, materials)
    this.scene.add(this._solidMesh)

    // Hide the textured mesh once the JSCAD solid is ready
    if (this._diceMeshObj) {
      this._diceMeshObj.visible = false
    }

    // Support mesh — separate object rendered in semi-transparent grey
    if (this._supportMeshObj) {
      this.scene.remove(this._supportMeshObj)
      this._supportMeshObj.geometry?.dispose()
      this._supportMeshObj.material?.dispose()
      this._supportMeshObj = null
    }
    if (supportGeom) {
      const supportGeo = buildSimpleThreeGeometry(supportGeom)
      supportGeo.computeVertexNormals()
      const supportMat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        roughness: 0.6,
        metalness: 0.1,
        side: THREE.DoubleSide,
      })
      this._supportMeshObj = new THREE.Mesh(supportGeo, supportMat)
      this.scene.add(this._supportMeshObj)
    }
  }

  updateFaceTextures(fi, colorCanvas, bumpCanvas) {
    if (this._setFaceTexture) this._setFaceTexture(fi, colorCanvas)
    if (this._setBumpTexture && bumpCanvas) this._setBumpTexture(fi, bumpCanvas)
  }

  highlightFace(fi) {
    if (this._setFaceHighlight) {
      if (this._highlightedFace >= 0) this._setFaceHighlight(this._highlightedFace, false)
      if (fi >= 0) this._setFaceHighlight(fi, true)
    }
    this._highlightedFace = fi
    this._updateHighlightOverlay(fi)
  }

  _updateHighlightOverlay(fi) {
    if (this._faceOverlay) {
      this.scene.remove(this._faceOverlay)
      this._faceOverlay.geometry.dispose()
      this._faceOverlay.material.dispose()
      this._faceOverlay = null
    }
    if (fi < 0 || !this._faces[fi]) return

    const face = this._faces[fi]
    const n = face.normal
    const offset = 0.08
    const verts = face.vertices

    const positions = []
    for (const v of verts) {
      positions.push(v[0] + n[0] * offset, v[1] + n[1] * offset, v[2] + n[2] * offset)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const indices = []
    for (let i = 1; i < verts.length - 1; i++) indices.push(0, i, i + 1)
    geo.setIndex(indices)

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    this._faceOverlay = new THREE.Mesh(geo, mat)
    this.scene.add(this._faceOverlay)
  }

  resetView() {
    if (!this._diceMeshObj) return
    // Cancel any in-progress transition
    this._camTargetPos = null
    this._camTargetUp = null
    const box = new THREE.Box3().setFromObject(this._diceMeshObj)
    const size = box.getSize(new THREE.Vector3()).length()
    this.controls.target.copy(box.getCenter(new THREE.Vector3()))
    this.camera.up.set(0, 1, 0)
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3(0, size * 0.4, size * 1.8))
    this.controls.update()
  }

  toggleBanana() {
    if (this._banana) {
      this.scene.remove(this._banana)
      this._banana.geometry.dispose()
      this._banana.material.dispose()
      this._banana = null
      this.controls.maxDistance = 200
      this.resetView()
      return
    }

    // A real banana is ~180mm long, ~35mm diameter at widest
    const spine = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0,   0,  0),
      new THREE.Vector3(35,  14, 0),
      new THREE.Vector3(90,  26, 0),
      new THREE.Vector3(145, 20, 0),
      new THREE.Vector3(180, 4,  0),
    ])

    const TUBE_SEGS = 60
    const RAD_SEGS  = 12
    const MAX_R     = 17

    const geo = new THREE.TubeGeometry(spine, TUBE_SEGS, MAX_R, RAD_SEGS, false)
    const pos = geo.attributes.position

    // Taper both ends using sin curve; flatten slightly on the belly side
    for (let i = 0; i <= TUBE_SEGS; i++) {
      const t    = i / TUBE_SEGS
      const taper = Math.pow(Math.sin(t * Math.PI), 0.55)
      const pt   = spine.getPoint(t)
      for (let j = 0; j <= RAD_SEGS; j++) {
        const idx = i * (RAD_SEGS + 1) + j
        const dx  = pos.getX(idx) - pt.x
        const dy  = pos.getY(idx) - pt.y
        const dz  = pos.getZ(idx) - pt.z
        // Flatten belly (negative Y side) slightly
        const belly = dy < 0 ? 0.75 : 1.0
        pos.setXYZ(idx, pt.x + dx * taper * belly, pt.y + dy * taper, pt.z + dz * taper)
      }
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()

    // Yellow skin
    const mat = new THREE.MeshStandardMaterial({
      color: 0xFFE135,
      roughness: 0.55,
      metalness: 0.05,
    })

    this._banana = new THREE.Mesh(geo, mat)

    // Stand upright (geometry runs along X → rotate so it runs along Y)
    this._banana.rotation.z = Math.PI / 2

    // Place bottom tip at grid level, offset to the right of the die
    const dieRef = this._solidMesh || this._diceMeshObj
    let xPos = 80
    if (dieRef) {
      const dieBox = new THREE.Box3().setFromObject(dieRef)
      xPos = dieBox.max.x + MAX_R + 20  // die edge + banana radius + 20mm gap
    }
    // With rotation.z=PI/2, geometry origin (x=0) sits at mesh.position.
    // Setting y = grid.position.y places the bottom tip at ground level.
    this._banana.position.set(xPos, this._grid.position.y, 0)

    this.scene.add(this._banana)

    // Extend zoom range and zoom out to fit both die and banana,
    // keeping the camera target on the die center
    this.controls.maxDistance = 600

    const box = new THREE.Box3()
    if (this._solidMesh)   box.expandByObject(this._solidMesh)
    if (this._diceMeshObj) box.expandByObject(this._diceMeshObj)
    if (this._banana)      box.expandByObject(this._banana)
    if (box.isEmpty()) return

    const size = box.getSize(new THREE.Vector3()).length()
    const fov  = this.camera.fov * (Math.PI / 180)
    const dist = (size / 2) / Math.tan(fov / 2) * 1.3

    // Pull camera back along its current direction — target stays on the die
    const dir = this.camera.position.clone().sub(this.controls.target).normalize()
    this._camTargetPos = this.controls.target.clone().add(dir.multiplyScalar(dist))
    this._camTargetUp  = this.camera.up.clone()
  }

  getThumbnail(size = 128) {
    const src = this.renderer.domElement
    const sw = src.width, sh = src.height
    // Centre-crop to a square so the thumbnail isn't stretched
    const sq = Math.min(sw, sh)
    const sx = Math.floor((sw - sq) / 2)
    const sy = Math.floor((sh - sq) / 2)
    const c = document.createElement('canvas')
    c.width = size; c.height = size
    c.getContext('2d').drawImage(src, sx, sy, sq, sq, 0, 0, size, size)
    return c.toDataURL('image/png')
  }

  setGridVisible(v)  { if (this._grid)       this._grid.visible       = v }
  setAxesVisible(v)  { if (this._axesHelper) this._axesHelper.visible = v }

  onFaceClick(cb) { this._onFaceClick = cb }

  dispose() {
    cancelAnimationFrame(this._animId)
    this._updateHighlightOverlay(-1)
    this.renderer.dispose()
  }
}
