// Bloc « Mouvement de prix » — détection ADAPTATIVE par ETB (remplace l'ancien score).
// Constat factuel sur 2 horizons, jamais un conseil d'achat.

import { useMemo } from 'react'
import { detecterMouvement, NIVEAU_LABEL, flecheMouvement, couleurMouvement } from '../utils/mouvement'

function Ligne({ titre, h, donneesInsuffisantes }) {
  const indispo = !h || h.niveau === 'indisponible'
  const pct =
    h && h.variationPct != null
      ? `${h.variationPct >= 0 ? '+' : ''}${h.variationPct.toFixed(1).replace('.', ',')}%`
      : null

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700/40 last:border-0">
      <span className="text-gray-400 text-xs">{titre}</span>
      {indispo ? (
        <span className="text-gray-600 text-xs">Pas assez d'historique</span>
      ) : (
        <span className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${couleurMouvement(h)}`}>
            {flecheMouvement(h)} {NIVEAU_LABEL[h.niveau]}
          </span>
          {pct && <span className="text-gray-500 text-[11px] font-mono">{pct}</span>}
          {donneesInsuffisantes && (
            <span className="text-amber-500/70 text-[10px]">approx.</span>
          )}
        </span>
      )}
    </div>
  )
}

export default function MovementDetail({ historique }) {
  const mvt = useMemo(() => detecterMouvement(historique ?? []), [historique])

  return (
    <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-3">
      <p className="text-white text-xs font-semibold mb-1.5">Mouvement de prix</p>
      <Ligne titre="Court terme (30 j)" h={mvt.courtTerme} donneesInsuffisantes={mvt.donneesInsuffisantes} />
      <Ligne titre="Long terme (6 mois)" h={mvt.longTerme} donneesInsuffisantes={mvt.donneesInsuffisantes} />
      <p className="text-gray-600 text-[10px] mt-2 leading-relaxed">
        Niveau relatif à la volatilité propre de cette ETB.
        {mvt.donneesInsuffisantes
          ? ' Historique encore court : estimation approximative.'
          : ' ETBVault constate l’évolution, ne conseille pas.'}
      </p>
    </div>
  )
}
