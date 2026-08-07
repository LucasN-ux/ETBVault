import type { CSSProperties } from 'react'

// Icônes ligne maison (pas d'emoji) — le tracé hérite de currentColor.
// Porté de design_handoff_etbvault/app/icons.jsx.

const PATHS = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  vault: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  search: 'M21 21l-5.2-5.2M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  flat: 'M5 12h14',
  trend: 'M3 17l6-6 4 4 8-8M21 7v5h-5',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  alert: 'M12 3 1.8 20.5h20.4L12 3zM12 10v4M12 17.5v.01',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13',
  chevron: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  refresh: 'M4 4v5h.5M20 20v-5h-.5M19.5 9A8 8 0 0 0 5 7M4.5 15A8 8 0 0 0 19 17',
  sparkles: 'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6zM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  tag: 'M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9zM7.5 7.5h.01',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  filter: 'M3 5h18M6 12h12M10 19h4',
  sort: 'M7 4v16M7 20l-3-3M7 4l3 3M17 20V4M17 4l3 3M17 20l-3-3',
  info: 'M12 16v-5M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  check: 'M5 12l5 5 9-11',
  menu: 'M4 7h16M4 12h16M4 17h16',
  box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
}

/** Nom d'icône disponible — l'union est dérivée de PATHS, pas maintenue à côté. */
export type NomIcone = keyof typeof PATHS

interface IconProps {
  name: NomIcone
  size?: number
  stroke?: number
  className?: string
  style?: CSSProperties
}

export function Icon({ name, size = 20, stroke = 1.7, className = '', style }: IconProps) {
  const d = PATHS[name] ?? PATHS.box
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={d} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Monogramme ETBVault — face de coffre : carré arrondi + cadran
interface MarkProps {
  size?: number
  className?: string
  style?: CSSProperties
}

export function Mark({ size = 28, className = '', style }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} style={style} aria-hidden="true">
      <rect x="2.5" y="2.5" width="27" height="27" rx="8" stroke="var(--accent)" strokeWidth="2" />
      <circle cx="16" cy="16" r="7.5" stroke="var(--accent)" strokeWidth="2" />
      <circle cx="16" cy="16" r="2.2" fill="var(--accent)" />
      <path d="M16 5v3.5M16 23.5V27M5 16h3.5M23.5 16H27" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default Icon
