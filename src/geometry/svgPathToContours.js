/**
 * Convert an SVG path `d` string to an array of 2D contours.
 * Handles M, L, H, V, C, S, Q, T, A, Z commands.
 * Returns [{ points: [[x,y],...], closed }]
 */
export function svgPathToContours(d) {
  const contours = []
  let current = null
  const commands = parseSvgPath(d)

  let cx = 0, cy = 0
  let startX = 0, startY = 0
  let lastCP = null

  for (const { cmd, args } of commands) {
    const abs = cmd === cmd.toUpperCase()

    switch (cmd.toUpperCase()) {
      case 'M': {
        if (current && current.points.length > 0) contours.push(current)
        const x = abs ? args[0] : cx + args[0]
        const y = abs ? args[1] : cy + args[1]
        startX = x; startY = y
        current = { points: [[x, y]], closed: false }
        cx = x; cy = y
        for (let i = 2; i < args.length; i += 2) {
          const lx = abs ? args[i] : cx + args[i]
          const ly = abs ? args[i+1] : cy + args[i+1]
          current.points.push([lx, ly])
          cx = lx; cy = ly
        }
        lastCP = null
        break
      }
      case 'L': {
        if (!current) current = { points: [], closed: false }
        for (let i = 0; i < args.length; i += 2) {
          const x = abs ? args[i] : cx + args[i]
          const y = abs ? args[i+1] : cy + args[i+1]
          current.points.push([x, y])
          cx = x; cy = y
        }
        lastCP = null
        break
      }
      case 'H': {
        for (const val of args) {
          const x = abs ? val : cx + val
          current.points.push([x, cy])
          cx = x
        }
        lastCP = null
        break
      }
      case 'V': {
        for (const val of args) {
          const y = abs ? val : cy + val
          current.points.push([cx, y])
          cy = y
        }
        lastCP = null
        break
      }
      case 'C': {
        for (let i = 0; i < args.length; i += 6) {
          let [x1,y1,x2,y2,x,y] = args.slice(i, i+6)
          if (!abs) { x1+=cx; y1+=cy; x2+=cx; y2+=cy; x+=cx; y+=cy }
          const pts = cubicBezier([cx,cy],[x1,y1],[x2,y2],[x,y], 16)
          current.points.push(...pts.slice(1))
          lastCP = [x2, y2]
          cx = x; cy = y
        }
        break
      }
      case 'S': {
        for (let i = 0; i < args.length; i += 4) {
          let [x2,y2,x,y] = args.slice(i, i+4)
          if (!abs) { x2+=cx; y2+=cy; x+=cx; y+=cy }
          const x1 = lastCP ? 2*cx - lastCP[0] : cx
          const y1 = lastCP ? 2*cy - lastCP[1] : cy
          const pts = cubicBezier([cx,cy],[x1,y1],[x2,y2],[x,y], 16)
          current.points.push(...pts.slice(1))
          lastCP = [x2, y2]
          cx = x; cy = y
        }
        break
      }
      case 'Q': {
        for (let i = 0; i < args.length; i += 4) {
          let [x1,y1,x,y] = args.slice(i, i+4)
          if (!abs) { x1+=cx; y1+=cy; x+=cx; y+=cy }
          const pts = quadBezier([cx,cy],[x1,y1],[x,y], 12)
          current.points.push(...pts.slice(1))
          lastCP = [x1, y1]
          cx = x; cy = y
        }
        break
      }
      case 'T': {
        for (let i = 0; i < args.length; i += 2) {
          let x = abs ? args[i] : cx + args[i]
          let y = abs ? args[i+1] : cy + args[i+1]
          const x1 = lastCP ? 2*cx - lastCP[0] : cx
          const y1 = lastCP ? 2*cy - lastCP[1] : cy
          const pts = quadBezier([cx,cy],[x1,y1],[x,y], 12)
          current.points.push(...pts.slice(1))
          lastCP = [x1, y1]
          cx = x; cy = y
        }
        break
      }
      case 'A': {
        for (let i = 0; i < args.length; i += 7) {
          let [rx,ry,xRot,largeArc,sweep,x,y] = args.slice(i, i+7)
          if (!abs) { x+=cx; y+=cy }
          const pts = arcToBezier(cx,cy,rx,ry,xRot,largeArc,sweep,x,y)
          current.points.push(...pts.slice(1))
          cx = x; cy = y
        }
        lastCP = null
        break
      }
      case 'Z': {
        if (current) {
          current.closed = true
          if (current.points.length > 1) contours.push(current)
          current = null
        }
        cx = startX; cy = startY
        lastCP = null
        break
      }
    }
  }
  if (current && current.points.length > 0) contours.push(current)
  return contours
}

function parseSvgPath(d) {
  const re = /([MmLlHhVvCcSsQqTtAaZz])|([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g
  const tokens = []
  let m
  while ((m = re.exec(d)) !== null) {
    if (m[1]) tokens.push({ type: 'cmd', val: m[1] })
    else tokens.push({ type: 'num', val: parseFloat(m[2]) })
  }

  const result = []
  let i = 0
  while (i < tokens.length) {
    if (tokens[i].type !== 'cmd') { i++; continue }
    const cmd = tokens[i].val; i++
    const args = []
    while (i < tokens.length && tokens[i].type === 'num') {
      args.push(tokens[i].val); i++
    }
    result.push({ cmd, args })
  }
  return result
}

function cubicBezier(p0, p1, p2, p3, steps) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const mt = 1 - t
    pts.push([
      mt*mt*mt*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t*t*t*p3[0],
      mt*mt*mt*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t*t*t*p3[1],
    ])
  }
  return pts
}

function quadBezier(p0, p1, p2, steps) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const mt = 1 - t
    pts.push([
      mt*mt*p0[0] + 2*mt*t*p1[0] + t*t*p2[0],
      mt*mt*p0[1] + 2*mt*t*p1[1] + t*t*p2[1],
    ])
  }
  return pts
}

function arcToBezier(x1,y1,rx,ry,xRot,largeArc,sweep,x2,y2) {
  const steps = 16
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push([x1 + (x2-x1)*t, y1 + (y2-y1)*t])
  }
  return pts
}
