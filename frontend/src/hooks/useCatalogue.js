import { useMemo } from 'react'
import { fetchEtbs, fetchPrixActuels, fetchSparklines } from '../services/api'
import { OBJET_VIDE, TABLEAU_VIDE } from '../utils/vides'
import { detecterMouvement } from '../utils/mouvement'
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

export function useCatalogue() {
  const etbs = useRequete(fetchEtbs)
  const sparklines = useRequete(fetchSparklines, JOURS_SPARKLINE)
  const prix = useRequete(fetchPrixActuels)

  const enrichies = useMemo(() => {
    const courbes = sparklines.donnees ?? OBJET_VIDE
    const prixActuels = prix.donnees ?? OBJET_VIDE

    return (etbs.donnees ?? TABLEAU_VIDE).map((etb) => {
      const series = courbes[etb.id] ?? []
      const mouvement = detecterMouvement(series).courtTerme
      const dateSortie = etb.dateSortie ?? etb.date_sortie

      return {
        ...etb,
        series,
        annee: dateSortie ? new Date(dateSortie).getFullYear() : '',
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
function prixActuelDe(etb, series, dernierPrix) {
  if (dernierPrix?.prixActuel != null) return dernierPrix.prixActuel
  if (series.length > 0) return Number(series[series.length - 1].cmPrixMoyen)
  return Number(etb.prixSortie ?? etb.prix_sortie ?? 0)
}
