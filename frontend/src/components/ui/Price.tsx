import { eur, pct } from '../../utils/format'

interface PriceProps {
  /** Chaîne acceptée : l'API renvoie les montants sérialisés depuis Decimal. */
  value: number | string | null | undefined
  size?: number
  accent?: boolean
}

/** Montant en euros, en chiffres tabulaires. */
export function Price({ value, size = 18, accent = true }: PriceProps) {
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

interface VarNumProps {
  /** null signifie « pas d'historique », pas « 0 % ». */
  v: number | null | undefined
  size?: number
  weight?: number
}

/** Variation en %, colorée. */
export function VarNum({ v, size = 14, weight = 600 }: VarNumProps) {
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
