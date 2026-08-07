import { eur0, pct } from '../../utils/format'

// Éléments d'affichage de données : chiffre clé, étiquette d'ère, bande marché.

/** Chiffre clé avec libellé et sous-titre optionnel. */
export function KPI({ label, value, sub, subColor, mono = true }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 7, letterSpacing: '0.01em' }}>{label}</div>
      <div
        className={mono ? 'kpi-value' : ''}
        style={{ fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}
      >
        {value}
      </div>
      {sub && (
        <div className="font-mono" style={{ fontSize: 12, marginTop: 6, color: subColor || 'var(--muted)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export function EraTag({ children }) {
  return (
    <span
      className="font-mono"
      style={{ fontSize: 10.5, letterSpacing: '0.04em', color: 'var(--faint)', textTransform: 'uppercase' }}
    >
      {children}
    </span>
  )
}

/** Bande défilante de prix. items : [{ id, nom, prixActuel, v7 }] */
export function Ticker({ items }) {
  // Dupliqué pour que la boucle CSS soit continue.
  const defile = items.concat(items)
  const masque = 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)'

  return (
    <div style={{ overflow: 'hidden', maskImage: masque, WebkitMaskImage: masque }}>
      <div className="ticker-track">
        {defile.map((e, i) => {
          const hausse = e.v7 == null ? null : e.v7 >= 0
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 20px',
                borderRight: '1px solid var(--border)',
                flexShrink: 0,
              }}
            >
              <span className="font-mono" style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase' }}>
                {String(e.id).replace('-', '.')}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 540 }}>{e.nom}</span>
              <span className="font-mono" style={{ fontSize: 12.5, color: 'var(--text)' }}>
                {eur0(e.prixActuel)}
              </span>
              <span
                className="font-mono"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: hausse == null ? 'var(--new)' : hausse ? 'var(--up)' : 'var(--down)',
                }}
              >
                {e.v7 == null ? '—' : pct(e.v7)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
