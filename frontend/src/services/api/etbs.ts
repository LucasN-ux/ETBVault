import type { Carte, Etb, PointPrix } from '../../types/domaine'
import type { Mouvement } from '../../utils/mouvement'
import { appelApi } from './client'

// Catalogue ETB et données rattachées à une ETB précise.

/** Toutes les ETB, de la plus récente à la plus ancienne. */
export function fetchEtbs(): Promise<Etb[]> {
  return appelApi<Etb[]>('/etbs')
}

export function fetchEtb(id: string): Promise<Etb> {
  return appelApi<Etb>(`/etbs/${encodeURIComponent(id)}`)
}

/** Cartes du set. Le backend les met en cache au premier appel. */
export function fetchCartes(id: string): Promise<Carte[]> {
  return appelApi<Carte[]>(`/etbs/${encodeURIComponent(id)}/cartes`)
}

export function fetchPrixHistorique(id: string): Promise<PointPrix[]> {
  return appelApi<PointPrix[]>(`/etbs/${encodeURIComponent(id)}/prix`)
}

/** Mouvement de prix — constat, jamais recommandation. */
export function fetchMouvement(id: string): Promise<Mouvement & { etbId: string }> {
  return appelApi<Mouvement & { etbId: string }>(`/etbs/${encodeURIComponent(id)}/prix/mouvement`)
}

/**
 * Historiques de plusieurs ETB, en parallèle.
 * Une ETB dont l'historique échoue rend un tableau vide plutôt que de faire
 * échouer tout le lot : le coffre reste affichable même si un produit manque.
 */
export async function fetchPrixHistoriqueMultiple(
  ids: readonly string[],
): Promise<Record<string, PointPrix[]>> {
  const resultats = await Promise.all(
    ids.map((id) => fetchPrixHistorique(id).catch((): PointPrix[] => [])),
  )
  return Object.fromEntries(ids.map((id, i) => [id, resultats[i]!]))
}
