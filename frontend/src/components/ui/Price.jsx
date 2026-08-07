import { eur, pct } from '../../utils/format'

/** Montant en euros, en chiffres tabulaires. */
export function Price({ value, size = 18, accent = true }) {
  return (
    <span
      className="font-mono"
      style={{
        fontWeight: 600,
        fontSize: size,
        color: accent ? 'var(--accent)' : 'var(--text)',
        letterSpacing: '-0.01em',
      }}
    >
      {eur(value)}
    </span>
  )
}

/** Variation en %, colorée. `null` signifie « pas d'historique », pas « 0 % ». */
export function VarNum({ v, size = 14, weight = 600 }) {
  if (v == null) {
    return (
      <span className="font-mono" style={{ color: 'var(--new)', fontSize: size, fontWeight: weight }}>
        Nouveau
      </span>
    )
  }
  return (
    <span
      className="font-mono"
      style={{ color: v >= 0 ? 'var(--up)' : 'var(--down)', fontSize: size, fontWeight: weight }}
    >
      {pct(v)}
    </span>
  )
}
