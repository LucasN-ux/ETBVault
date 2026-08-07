import { useId, useMemo } from 'react'

interface Coord {
  x: number
  y: number
}

interface SparklineProps {
  /** Nombres bruts, ou points portant un `prix`. */
  data: ReadonlyArray<number | { prix: number }> | null | undefined
  up: boolean
  h?: number
  w?: number
  strokeW?: number
  fill?: boolean
}

// Mini-courbe SVG (spline cardinale), légère — adaptée à de nombreuses cartes
// (catalogue) sans le coût de Recharts. Portée du handoff app/charts.jsx.

function smoothPath(pts: readonly Coord[], t = 0.5): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + ((p2.x - p0.x) / 6) * t * 2
    const c1y = p1.y + ((p2.y - p0.y) / 6) * t * 2
    const c2x = p2.x - ((p3.x - p1.x) / 6) * t * 2
    const c2y = p2.y - ((p3.y - p1.y) / 6) * t * 2
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

export default function Sparkline({ data, up, h = 40, w = 120, strokeW = 1.6, fill = true }: SparklineProps) {
  const id = useId().replace(/:/g, '')
  const pts = useMemo(() => {
    if (!data || data.length < 2) return null
    const ys = data.map((d) => (typeof d === 'number' ? d : d.prix))
    const lo = Math.min(...ys)
    const hi = Math.max(...ys)
    const span = hi - lo || 1
    const pad = 3
    return ys.map((y, i) => ({
      x: (i / (ys.length - 1)) * (w - pad * 2) + pad,
      y: h - pad - ((y - lo) / span) * (h - pad * 2),
    }))
  }, [data, h, w])

  if (!pts) return <div style={{ height: h }} />

  const line = smoothPath(pts)
  const col = up ? 'var(--up)' : 'var(--down)'
  const last = pts[pts.length - 1]!

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {fill && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.28" />
            <stop offset="100%" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={`${line} L ${last.x} ${h} L ${pts[0]!.x} ${h} Z`} fill={`url(#${id})`} />}
      <path
        d={line}
        fill="none"
        stroke={col}
        strokeWidth={strokeW}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
