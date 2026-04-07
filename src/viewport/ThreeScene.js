import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createDiceMesh, createEdgesMesh, jscadToThreeGeometry } from './DiceMeshBuilder.js'
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
    this._highlightedFace = -1
    this._setFaceHighlight = null
    this._setFaceTexture = null
    this._setBumpTexture = null
    this._camTargetPos = null
    this._camTargetUp = null
    this._faceOverlay = null

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

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
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

    let downX = 0, downY = 0
    this.canvas.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY })
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
    const { faceIndex } = this.picker.pick(event)
    if (faceIndex >= 0) {
      if (this._onFaceClick) this._onFaceClick(faceIndex)
      this.focusFace(this._faces[faceIndex])
    }
  }

  setDie(faces) {
    if (this._diceMeshObj) { this.scene.remove(this._diceMeshObj); this._diceMeshObj = null }
    if (this._solidMesh) { this.scene.remove(this._solidMesh); this._solidMesh = null }
    if (this._edgesMesh) { this.scene.remove(this._edgesMesh); this._edgesMesh = null }
    this._updateHighlightOverlay(-1)

    this._faces = faces
    this._highlightedFace = -1

    if (!faces?.length) return

    // Single textured mesh — opaque face canvases show die body colour + labels.
    // Replaced by JSCAD-derived solid geometry once the CSG rebuild completes.
    const { mesh, setFaceHighlight: _setHL, setFaceTexture, setBumpTexture } = createDiceMesh(faces)
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

  updateSolidMesh(jscadGeom) {
    if (this._solidMesh) {
      this.scene.remove(this._solidMesh)
      this._solidMesh.geometry?.dispose()
      const mats = this._solidMesh.material
      if (Array.isArray(mats)) mats.forEach(m => m.dispose())
      else mats?.dispose()
      this._solidMesh = null
    }

    const geo = jscadToThreeGeometry(jscadGeom, this._faces)
    geo.computeVertexNormals()

    const materials = [
      new THREE.MeshStandardMaterial({ color: 0xFF8826, roughness: 0.4, metalness: 0.35, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.7, metalness: 0.0,  side: THREE.DoubleSide }),
    ]
    this._solidMesh = new THREE.Mesh(geo, materials)
    this.scene.add(this._solidMesh)

    // Hide the textured mesh once the JSCAD solid is ready
    if (this._diceMeshObj) {
      this._diceMeshObj.visible = false
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

  setGridVisible(v)  { if (this._grid)       this._grid.visible       = v }
  setAxesVisible(v)  { if (this._axesHelper) this._axesHelper.visible = v }

  onFaceClick(cb) { this._onFaceClick = cb }

  dispose() {
    cancelAnimationFrame(this._animId)
    this._updateHighlightOverlay(-1)
    this.renderer.dispose()
  }
}
