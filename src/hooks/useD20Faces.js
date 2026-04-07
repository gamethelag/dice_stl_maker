import { useMemo } from 'react'
import { computeFaceDescriptors } from '../geometry/D20Geometry.js'

export function useD20Faces(sizeInMM) {
  return useMemo(() => computeFaceDescriptors(sizeInMM), [sizeInMM])
}
