import { appelApi } from './client'

// Catalogue ETB et données rattachées à une ETB précise.

/** Toutes les ETB, de la plus récente à la plus ancienne. */
export function fetchEtbs() {
  return appelApi('/etbs')
}

export function fetchEtb(id) {
  return appelApi(`/etbs/${encodeURIComponent(id)}`)
}

/** Cartes du set. Le backend les met en cache au premier appel. */
export function fetchCartes(id) {
  return appelApi(`/etbs/${encodeURIComponent(id)}/cartes`)
}

export function fetchPrixHistorique(id) {
  return appelApi(`/etbs/${encodeURIComponent(id)}/prix`)
}

/** Mouvement de prix — constat, jamais recommandation. */
export function fetchMouvement(id) {
  return appelApi(`/etbs/${encodeURIComponent(id)}/prix/mouvement`)
}

/**
 * Historiques de plusieurs ETB, en parallèle.
 * Une ETB dont l'historique échoue rend un tableau vide plutôt que de faire
 * échouer tout le lot : le coffre reste affichable même si un produit manque.
 */
export async function fetchPrixHistoriqueMultiple(ids) {
  const resultats = await Promise.all(
    ids.map((id) => fetchPrixHistorique(id).catch(() => [])),
  )
  return Object.fromEntries(ids.map((id, i) => [id, resultats[i]]))
}
