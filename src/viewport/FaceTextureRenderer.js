const SIZE = 512

export async function renderFaceCanvas(face, content, fonts) {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  // die body colour as background so the mesh is always opaque
  ctx.fillStyle = '#FF8826'
  ctx.fillRect(0, 0, SIZE, SIZE)

  const cx = SIZE / 2
  const cy = SIZE / 2
  const mmToPx = (SIZE / 2) / face.faceRadius

  for (const entry of (content.texts || [])) {
    if (!entry.text) continue
    await drawTextEntry(ctx, cx, cy, mmToPx, face.faceRadius, entry, fonts)
  }

  for (const entry of (content.svgs || [])) {
    if (!entry.svgData) continue
    await drawSVGEntry(ctx, cx, cy, mmToPx, face.faceRadius, entry)
  }

  return canvas
}

async function drawTextEntry(ctx, cx, cy, mmToPx, faceRadius, entry, fonts) {
  const { text, size = 8, x = 0, y = 0, rot = 0, fontIndex = 0 } = entry
  const fontObj = fonts[fontIndex]

  ctx.save()
  ctx.translate(cx + x * faceRadius * mmToPx, cy - y * faceRadius * mmToPx)
  ctx.rotate(rot * Math.PI / 180)

  if (fontObj?.font) {
    const font = fontObj.font
    const pixelSize = size * mmToPx
    const path = font.getPath(text, 0, 0, pixelSize)
    const bbox = path.getBoundingBox()
    const textCx = (bbox.x1 + bbox.x2) / 2
    const textCy = (bbox.y1 + bbox.y2) / 2
    ctx.translate(-textCx, -textCy)
    ctx.fillStyle = '#000000'
    path.fill = '#000000'
    path.draw(ctx)

    // Draw decorator in same translated/rotated context
    const decorator = entry.decorator || 'none'
    const decoratorSize = entry.decoratorSize ?? 1.0
    if (decorator !== 'none') {
      ctx.fillStyle = '#000000'
      const textW = bbox.x2 - bbox.x1
      const textH = bbox.y2 - bbox.y1
      if (decorator === 'underline') {
        const ulW = textW * decoratorSize
        const ulH = Math.max(1, textH * 0.07)
        const ulGap = textH * 0.05
        ctx.fillRect(textCx - ulW / 2, bbox.y2 + ulGap, ulW, ulH)
      } else if (decorator === 'dot') {
        const r2 = Math.max(1, textH * 0.08) * decoratorSize
        const dotX = bbox.x2 + r2 * 2
        const dotY = bbox.y2 - r2
        ctx.beginPath()
        ctx.arc(dotX, dotY, r2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else {
    const pixelSize = Math.max(8, size * mmToPx * 1.2)
    ctx.font = `bold ${pixelSize}px Arial, sans-serif`
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 0, 0)
  }

  ctx.restore()
}

async function drawSVGEntry(ctx, cx, cy, mmToPx, faceRadius, entry) {
  const { svgData, scale = 1, x = 0, y = 0, rot = 0 } = entry

  return new Promise(resolve => {
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()

    img.onload = () => {
      ctx.save()
      const drawSize = scale * faceRadius * mmToPx * 2
      ctx.translate(cx + x * faceRadius * mmToPx, cy - y * faceRadius * mmToPx)
      ctx.rotate(rot * Math.PI / 180)
      ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize)
      ctx.restore()
      URL.revokeObjectURL(url)
      resolve()
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve() }
    img.src = url
  })
}

export async function renderBumpCanvas(face, content, fonts) {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, SIZE, SIZE)

  const cx = SIZE / 2
  const cy = SIZE / 2
  const mmToPx = (SIZE / 2) / face.faceRadius

  for (const entry of (content.texts || [])) {
    if (!entry.text) continue
    await drawTextBump(ctx, cx, cy, mmToPx, face.faceRadius, entry, fonts)
  }

  for (const entry of (content.svgs || [])) {
    if (!entry.svgData) continue
    await drawSVGBump(ctx, cx, cy, mmToPx, face.faceRadius, entry)
  }

  return canvas
}

async function drawTextBump(ctx, cx, cy, mmToPx, faceRadius, entry, fonts) {
  const { text, size = 8, x = 0, y = 0, rot = 0, fontIndex = 0, depth = 0.4, mode = 'cut' } = entry
  const fontObj = fonts[fontIndex]
  const darkness = mode === 'emboss'
    ? Math.min(255, 128 + depth * 60)
    : Math.max(0, 255 - depth * 120)
  const fill = `rgb(${Math.round(darkness)},${Math.round(darkness)},${Math.round(darkness)})`

  ctx.save()
  ctx.translate(cx + x * faceRadius * mmToPx, cy - y * faceRadius * mmToPx)
  ctx.rotate(rot * Math.PI / 180)

  if (fontObj?.font) {
    const font = fontObj.font
    const pixelSize = size * mmToPx
    const path = font.getPath(text, 0, 0, pixelSize)
    const bbox = path.getBoundingBox()
    ctx.translate(-(bbox.x1 + bbox.x2) / 2, -(bbox.y1 + bbox.y2) / 2)
    ctx.fillStyle = fill
    path.fill = fill
    path.draw(ctx)
  } else {
    const pixelSize = Math.max(8, size * mmToPx * 1.2)
    ctx.font = `bold ${pixelSize}px Arial, sans-serif`
    ctx.fillStyle = fill
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 0, 0)
  }

  ctx.restore()
}

async function drawSVGBump(ctx, cx, cy, mmToPx, faceRadius, entry) {
  const { svgData, scale = 1, x = 0, y = 0, rot = 0, depth = 0.4, mode = 'cut' } = entry
  const darkness = mode === 'emboss'
    ? Math.min(255, 128 + depth * 60)
    : Math.max(0, 255 - depth * 120)

  return new Promise(resolve => {
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()

    img.onload = () => {
      const drawSize = scale * faceRadius * mmToPx * 2
      const off = document.createElement('canvas')
      off.width = Math.ceil(drawSize) || 1
      off.height = Math.ceil(drawSize) || 1
      const offCtx = off.getContext('2d')
      offCtx.fillStyle = '#ffffff'
      offCtx.fillRect(0, 0, off.width, off.height)
      offCtx.drawImage(img, 0, 0, off.width, off.height)

      const id = offCtx.getImageData(0, 0, off.width, off.height)
      const d = Math.round(darkness)
      for (let i = 0; i < id.data.length; i += 4) {
        const r = id.data[i], g = id.data[i+1], b = id.data[i+2], a = id.data[i+3]
        const isBlank = (a < 20) || (r > 240 && g > 240 && b > 240)
        id.data[i] = id.data[i+1] = id.data[i+2] = isBlank ? 255 : d
        id.data[i+3] = 255
      }
      offCtx.putImageData(id, 0, 0)

      ctx.save()
      ctx.translate(cx + x * faceRadius * mmToPx, cy - y * faceRadius * mmToPx)
      ctx.rotate(rot * Math.PI / 180)
      ctx.drawImage(off, -drawSize / 2, -drawSize / 2, drawSize, drawSize)
      ctx.restore()

      URL.revokeObjectURL(url)
      resolve()
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve() }
    img.src = url
  })
}
