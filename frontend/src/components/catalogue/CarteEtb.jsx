import Sparkline from '../Sparkline'
import { BoxArt, EraTag, MovementBadge, Price, VarNum } from '../ui'

// Vignette d'une ETB dans la grille du catalogue.
// `etb` vient de useCatalogue : déjà enrichie de series / v30 / mv30 / prixActuel.
export default function CarteEtb({ etb, onOuvrir }) {
  const hausse = (etb.v30 ?? 0) >= 0
  const courbe = (etb.series ?? []).slice(-30).map((p) => Number(p.cmPrixMoyen))

  return (
    <button onClick={() => onOuvrir(etb.id)} className="slab group text-left flex flex-col fadeUp">
      <div className="slab__glare" />

      <div className="slab__stage" style={{ height: 150, padding: 16 }}>
        <BoxArt etb={etb} style={{ maxHeight: 122, height: 122, width: '90%' }} />
        <div className="absolute" style={{ top: 12, right: 12 }}>
          <MovementBadge mv={etb.mv30} isNew={etb.v30 == null} />
        </div>
      </div>

      <div style={{ height: 34, padding: '0 6px', borderTop: '1px solid var(--border)' }}>
        {courbe.length >= 2 ? (
          <Sparkline data={courbe} up={hausse} h={34} w={220} fill strokeW={1.6} />
        ) : (
          <div style={{ height: 34 }} />
        )}
      </div>

      <div
        className="flex flex-col"
        style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--border)', gap: 6 }}
      >
        <div>
          <div className="truncate" style={{ fontSize: 14, fontWeight: 580 }}>
            {etb.nomFr ?? etb.nom}
          </div>
          <EraTag>
            {etb.era ?? ''}
            {etb.annee ? ` · ${etb.annee}` : ''}
          </EraTag>
        </div>
        <div className="flex items-end justify-between mt-1">
          <Price value={etb.prixActuel} size={16} />
          <VarNum v={etb.v30} size={13} />
        </div>
      </div>
    </button>
  )
}
