import * as jscad from '@jscad/modeling'

const { sphere } = jscad.primitives
const { translate } = jscad.transforms

/**
 * Build small spherical bumps at each die vertex.
 *
 * The spheres are centred on the vertex positions so they extend just beyond
 * the die surface at each corner.  When unioned into the solid they create
 * rounded bumper nubs.
 *
 * @param {Array}  vertices  - array of [x, y, z] vertex positions (may contain duplicates)
 * @param {object} settings  - { radius } (mm)
 * @returns {Array}  JSCAD geom3 shapes
 */
export function buildVertexBumpers(vertices, { radius }) {
  // Deduplicate vertices by rounding to 3 decimal places
  const seen = new Set()
  const unique = []
  for (const v of vertices) {
    const key = v.map(x => x.toFixed(3)).join(',')
    if (!seen.has(key)) { seen.add(key); unique.push(v) }
  }

  return unique.map(v => {
    const s = sphere({ radius, segments: 12 })
    return translate([v[0], v[1], v[2]], s)
  })
}
