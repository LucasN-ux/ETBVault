// Bloc « Mouvement de prix » — détection ADAPTATIVE par ETB (constat, pas conseil).
import { useMemo } from 'react'
import { detecterMouvement, NIVEAU_LABEL } from '../utils/mouvement'
import { Icon } from './Icon'

function MvLine({ titre, mv }) {
  const indispo = !mv || mv.niveau === 'indisponible'
  const dir = mv?.direction
  const flat = indispo || dir === 'stable' || mv.niveau === 'faible'
  const col = flat ? 'var(--muted)' : dir === 'hausse' ? 'var(--up)' : 'var(--down)'
  const icon = indispo || mv.niveau === 'faible' ? 'flat' : dir === 'hausse' ? 'arrowUp' : dir === 'baisse' ? 'arrowDown' : 'flat'
  const pct =
    mv && mv.variationPct != null
      ? `${mv.variationPct >= 0 ? '+' : ''}${mv.variationPct.toFixed(1).replace('.', ',')} %`
      : null

  return (
    <div className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{titre}</span>
      {indispo ? (
        <span style={{ fontSize: 12.5, color: 'var(--faint)' }}>Pas assez d’historique</span>
      ) : (
        <span className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 font-mono" style={{ fontSize: 13, fontWeight: 600, color: col }}>
            <Icon name={icon} size={14} stroke={2.2} /> {NIVEAU_LABEL[mv.niveau] || '—'}
          </span>
          {pct && <span className="font-mono" style={{ fontSize: 12.5, color: 'var(--faint)' }}>{pct}</span>}
        </span>
      )}
    </div>
  )
}

export default function MovementDetail({ historique }) {
  const mvt = useMemo(() => detecterMouvement(historique ?? []), [historique])

  return (
    <div className="card" style={{ padding: 'clamp(14px,2vw,18px)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon name="trend" size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontWeight: 580, fontSize: 14 }}>Mouvement de prix</span>
      </div>
      <MvLine titre="Court terme · 30 jours" mv={mvt.courtTerme} />
      <MvLine titre="Long terme · 6 mois" mv={mvt.longTerme} />
      <p style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 10, lineHeight: 1.5 }}>
        Niveau relatif à la volatilité propre de cette ETB.
        {mvt.donneesInsuffisantes
          ? ' Historique encore court : estimation approximative.'
          : ' etbVault constate l’évolution, ne conseille pas.'}
      </p>
    </div>
  )
}
