import { Icon } from '../Icon'
import { pct } from '../../utils/format'

// Badge de mouvement — « des faits, pas des conseils ».
// Il constate une variation, il ne recommande jamais d'acheter ou de vendre.

// mv = { niveau, direction, variationPct } — cf. utils/mouvement.js
// Les libellés de niveau vivent dans utils/mouvement.js (NIVEAU_LABEL).
function apparence(mv, isNew) {
  if (isNew || !mv || mv.niveau === 'indisponible') {
    return { cls: 'mv-new', icone: 'sparkles', label: 'Nouveau' }
  }
  if (mv.direction === 'stable' || mv.niveau === 'faible') {
    return { cls: 'mv-flat', icone: 'flat', label: 'Stable' }
  }
  if (mv.direction === 'hausse') {
    return { cls: 'mv-up', icone: 'arrowUp', label: 'En hausse' }
  }
  return { cls: 'mv-down', icone: 'arrowDown', label: 'En baisse' }
}

export default function MovementBadge({ mv, showPct = false, size = 'sm', isNew = false }) {
  const { cls, icone, label } = apparence(mv, isNew)
  const md = size === 'md'

  return (
    <span className={'mv ' + cls} style={{ padding: md ? '5px 11px' : '3px 9px', fontSize: md ? 12.5 : 11 }}>
      <Icon name={icone} size={md ? 14 : 12} stroke={2.2} />
      {label}
      {showPct && mv?.variationPct != null && (
        <span style={{ opacity: 0.75, marginLeft: 2 }}>{pct(mv.variationPct)}</span>
      )}
    </span>
  )
}
