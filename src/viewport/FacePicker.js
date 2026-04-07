import * as THREE from 'three'

export class FacePicker {
  constructor(camera, canvas) {
    this.camera = camera
    this.canvas = canvas
    this.raycaster = new THREE.Raycaster()
    this.diceMesh = null
    this.faces = null
  }

  setDiceMesh(mesh, faces) {
    this.diceMesh = mesh
    this.faces = faces
  }

  pick(event) {
    if (!this.diceMesh || !this.faces) return { faceIndex: -1, point: null }

    const rect = this.canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera)
    const intersects = this.raycaster.intersectObject(this.diceMesh, false)
    if (!intersects.length) return { faceIndex: -1, point: null }

    const hit = intersects[0]
    const faceIndex = this._identifyFace(hit.point)
    return { faceIndex, point: [hit.point.x, hit.point.y, hit.point.z] }
  }

  _identifyFace(worldPoint) {
    if (!this.faces) return -1
    let bestIdx = -1
    let bestDot = -Infinity

    for (let i = 0; i < this.faces.length; i++) {
      const face = this.faces[i]
      const c = face.center
      const n = face.normal
      const d = (worldPoint.x - c[0])*n[0] + (worldPoint.y - c[1])*n[1] + (worldPoint.z - c[2])*n[2]
      if (d > bestDot) { bestDot = d; bestIdx = i }
    }

    return bestIdx
  }
}
