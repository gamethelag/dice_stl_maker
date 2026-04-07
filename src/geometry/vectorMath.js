export function sub3(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]] }
export function add3(a, b) { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]] }
export function scale3(a, s) { return [a[0]*s, a[1]*s, a[2]*s] }
export function dot3(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2] }
export function cross3(a, b) {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
}
export function normalize3(v) {
  const l = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])
  return l > 1e-12 ? [v[0]/l, v[1]/l, v[2]/l] : [0, 0, 1]
}
export function len3(v) { return Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]) }
