import { useMemo } from 'react'
import { fetchEtbs, fetchPrixActuels, fetchSparklines } from '../services/api'
import type { DernierPrix, Etb, PointSparkline } from '../types/domaine'
import { detecterMouvement, type Horizon } from '../utils/mouvement'
import { OBJET_VIDE, TABLEAU_VIDE } from '../utils/vides'
import { useRequete } from './useRequete'

// ─────────────────────────────────────────────────────────────────────────────
// useCatalogue — les ETB enrichies de leur prix, leur mini-historique et leur
// mouvement 30 jours.
//
// Trois appels, un seul chargement du point de vue de l'écran. Le catalogue
// n'existe pas sans la liste des ETB : c'est le seul appel dont l'échec est
// bloquant. Prix et courbes sont des enrichissements — s'ils manquent, on
// affiche le catalogue sans eux plutôt qu'une page d'erreur.
// ─────────────────────────────────────────────────────────────────────────────

const JOURS_SPARKLINE = 30

/** Une ETB, augmentée de tout ce que le catalogue affiche. */
export interface EtbEnrichie extends Etb {
  series: PointSparkline[]
  annee: number | ''
  mv30: Horizon
  /** null quand l'historique est trop court — pas « 0 % ». */
  v30: number | null
  prixActuel: number
}

export interface Catalogue {
  etbs: EtbEnrichie[]
  chargement: boolean
  erreur: Error | null
  recharger: () => Promise<void>
}

export function useCatalogue(): Catalogue {
  const etbs = useRequete(fetchEtbs)
  const sparklines = useRequete(fetchSparklines, JOURS_SPARKLINE)
  const prix = useRequete(fetchPrixActuels)

  const enrichies = useMemo<EtbEnrichie[]>(() => {
    const courbes = sparklines.donnees ?? OBJET_VIDE
    const prixActuels = prix.donnees ?? OBJET_VIDE

    return (etbs.donnees ?? TABLEAU_VIDE).map((etb) => {
      const series = courbes[etb.id] ?? []
      const mouvement = detecterMouvement(series).courtTerme

      return {
        ...etb,
        series,
        annee: etb.dateSortie ? new Date(etb.dateSortie).getFullYear() : '',
        mv30: mouvement,
        v30: mouvement.niveau === 'indisponible' ? null : mouvement.variationPct,
        prixActuel: prixActuelDe(etb, series, prixActuels[etb.id]),
      }
    })
  }, [etbs.donnees, sparklines.donnees, prix.donnees])

  return {
    etbs: enrichies,
    chargement: etbs.chargement,
    erreur: etbs.erreur,
    recharger: etbs.recharger,
  }
}

// Meilleure estimation disponible : le prix marché du jour, sinon le dernier
// point de la courbe, sinon le prix de sortie.
function prixActuelDe(
  etb: Etb,
  series: readonly PointSparkline[],
  dernierPrix: DernierPrix | undefined,
): number {
  if (dernierPrix?.prixActuel != null) return dernierPrix.prixActuel
  const dernierPoint = series[series.length - 1]
  if (dernierPoint) return Number(dernierPoint.cmPrixMoyen)
  return Number(etb.prixSortie ?? 0)
}
