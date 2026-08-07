import type { PrixParEtb, SparklinesParEtb, Tendance } from '../../types/domaine'
import { appelApi } from './client'

// Vues transversales : elles portent sur toutes les ETB à la fois.

/** Dernier prix de chaque ETB. */
export function fetchPrixActuels(): Promise<PrixParEtb> {
  return appelApi<PrixParEtb>('/prix')
}

/** ETB classées par variation sur N jours. */
export function fetchTendances(jours = 7): Promise<Tendance[]> {
  return appelApi<Tendance[]>(`/tendances?jours=${jours}`)
}

/** Mini-historiques pour les courbes du catalogue. */
export function fetchSparklines(jours = 30): Promise<SparklinesParEtb> {
  return appelApi<SparklinesParEtb>(`/sparklines?jours=${jours}`)
}
