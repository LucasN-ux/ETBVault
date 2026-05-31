// Briques d'UI partagées (direction Vault). Portées de design_handoff_etbvault/app/ui.jsx.
import { Icon } from './Icon'
import { eur, eur0, pct, hueFromId } from '../utils/format'

// Libellé du type de produit pour le placeholder (quand aucune image n'est dispo).
const TYPE_PLACEHOLDER = {
  ETB: 'Coffret Dresseur d’Élite',
  DISPLAY: 'Display',
  BOOSTER: 'Booster',
  COFFRET: 'Coffret',
  PREMIUM: 'Premium Collection',
  TIN: 'Pokébox / Tin',
  BLISTER: 'Blister',
  AUTRE: 'Produit scellé',
}

// ---- Visuel de box : image réelle, sinon placeholder typé teinté ----
export function BoxArt({ etb, className = '', style }) {
  const img = etb?.boxImageUrl ?? etb?.box_image_url ?? etb?.imageUrl ?? etb?.image_url
  if (img) {
    return (
      <img
        src={img}
        alt={etb?.nomFr ?? etb?.nom}
        className={'zoomable ' + className}
        style={{ objectFit: 'contain', ...style }}
        loading="lazy"
      />
    )
  }
  const hue = hueFromId(etb?.id ?? '')
  return (
    <div
      className={'zoomable ' + className}
      style={{
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
        background: `linear-gradient(150deg, oklch(0.32 0.08 ${hue}), oklch(0.20 0.05 ${hue}))`,
        boxShadow: '0 8px 22px -12px oklch(0 0 0 / 0.8)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '10% 9%',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'oklch(1 0 0 / 0.7)', textTransform: 'uppercase' }}>
          Pokémon
        </span>
        <span style={{ width: 14, height: 14, borderRadius: 999, border: '2px solid oklch(1 0 0 / 0.55)' }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: 'repeating-linear-gradient(60deg, oklch(1 0 0 / 0.05) 0 2px, transparent 2px 9px)' }} />
      <div style={{ position: 'relative' }}>
        <div className="display" style={{ fontSize: 'clamp(13px, 3.5cqw, 20px)', color: '#fff', lineHeight: 1, fontWeight: 700, textShadow: '0 1px 8px oklch(0 0 0 / 0.5)' }}>
          {etb?.nomFr ?? etb?.nom}
        </div>
        <div className="font-mono" style={{ fontSize: 8.5, letterSpacing: '0.12em', color: 'oklch(1 0 0 / 0.75)', marginTop: 4, textTransform: 'uppercase' }}>
          {TYPE_PLACEHOLDER[etb?.type] ?? 'Produit scellé'}
        </div>
      </div>
    </div>
  )
}

// ---- Badge de mouvement : « faits, pas conseils » ----
// mv = { niveau, direction, variationPct } (cf. utils/mouvement.js)
const NIVEAU = { faible: 'Faible', moyen: 'Moyen', fort: 'Fort' }
export { NIVEAU }

export function MovementBadge({ mv, showPct = false, size = 'sm', isNew = false }) {
  let cls = 'mv-flat'
  let icon = 'flat'
  let label = 'Stable'
  if (isNew || !mv || mv.niveau === 'indisponible') {
    cls = 'mv-new'; icon = 'sparkles'; label = 'Nouveau'
  } else if (mv.direction === 'stable' || mv.niveau === 'faible') {
    cls = 'mv-flat'; icon = 'flat'; label = 'Stable'
  } else if (mv.direction === 'hausse') {
    cls = 'mv-up'; icon = 'arrowUp'; label = 'En hausse'
  } else {
    cls = 'mv-down'; icon = 'arrowDown'; label = 'En baisse'
  }
  const pad = size === 'md' ? '5px 11px' : '3px 9px'
  const fs = size === 'md' ? 12.5 : 11
  return (
    <span className={'mv ' + cls} style={{ padding: pad, fontSize: fs }}>
      <Icon name={icon} size={size === 'md' ? 14 : 12} stroke={2.2} />
      {label}
      {showPct && mv && mv.variationPct != null && (
        <span style={{ opacity: 0.75, marginLeft: 2 }}>{pct(mv.variationPct)}</span>
      )}
    </span>
  )
}

// nombre de variation, coloré
export function VarNum({ v, size = 14, weight = 600 }) {
  if (v == null) {
    return <span className="font-mono" style={{ color: 'var(--new)', fontSize: size, fontWeight: weight }}>Nouveau</span>
  }
  const up = v >= 0
  return (
    <span className="font-mono" style={{ color: up ? 'var(--up)' : 'var(--down)', fontSize: size, fontWeight: weight }}>
      {pct(v)}
    </span>
  )
}

export function Price({ value, size = 18, accent = true }) {
  return (
    <span className="font-mono" style={{ fontWeight: 600, fontSize: size, color: accent ? 'var(--accent)' : 'var(--text)', letterSpacing: '-0.01em' }}>
      {eur(value)}
    </span>
  )
}

// ---- contrôle segmenté ----
export function Segmented({ options, value, onChange, size = 'sm' }) {
  const fs = size === 'md' ? 13 : 11.5
  const pad = size === 'md' ? '7px 13px' : '5px 10px'
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} data-active={value === o.value} onClick={() => onChange(o.value)} style={{ fontSize: fs, padding: pad }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ---- champ de recherche ----
export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', display: 'flex' }}>
        <Icon name="search" size={17} />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field"
        style={{ padding: '11px 14px 11px 42px' }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', display: 'flex' }}
          aria-label="Effacer"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  )
}

export function Chip({ active, onClick, children }) {
  return (
    <button className="chip" data-active={active} onClick={onClick} style={{ padding: '6px 13px', fontSize: 12.5 }}>
      {children}
    </button>
  )
}

// ---- ticker (bande marché) ----
// items : [{ id, nom, prixActuel, v7 }]
export function Ticker({ items }) {
  const row = items.concat(items) // dupliqué pour une boucle continue
  return (
    <div style={{ overflow: 'hidden', maskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)' }}>
      <div className="ticker-track">
        {row.map((e, i) => {
          const v = e.v7
          const up = v == null ? null : v >= 0
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
              <span className="font-mono" style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase' }}>{String(e.id).replace('-', '.')}</span>
              <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 540 }}>{e.nom}</span>
              <span className="font-mono" style={{ fontSize: 12.5, color: 'var(--text)' }}>{eur0(e.prixActuel)}</span>
              <span className="font-mono" style={{ fontSize: 12, fontWeight: 600, color: up == null ? 'var(--new)' : up ? 'var(--up)' : 'var(--down)' }}>
                {v == null ? '—' : pct(v)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- KPI ----
export function KPI({ label, value, sub, subColor, mono = true }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 7, letterSpacing: '0.01em' }}>{label}</div>
      <div className={mono ? 'kpi-value' : ''} style={{ fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div className="font-mono" style={{ fontSize: 12, marginTop: 6, color: subColor || 'var(--muted)' }}>{sub}</div>}
    </div>
  )
}

// ---- étiquette d'ère ----
export function EraTag({ children }) {
  return (
    <span className="font-mono" style={{ fontSize: 10.5, letterSpacing: '0.04em', color: 'var(--faint)', textTransform: 'uppercase' }}>
      {children}
    </span>
  )
}
