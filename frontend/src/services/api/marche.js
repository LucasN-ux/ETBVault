import { appelApi } from './client'

// Vues transversales : elles portent sur toutes les ETB à la fois.

/** Dernier prix de chaque ETB : { etbId: { prixActuel, prixBas, date } } */
export function fetchPrixActuels() {
  return appelApi('/prix')
}

/** ETB classées par variation sur N jours : [{ etbId, prixActuel, variationPct }] */
export function fetchTendances(jours = 7) {
  return appelApi(`/tendances?jours=${jours}`)
}

/** Mini-historiques pour les courbes du catalogue : { etbId: [{ date, cmPrixMoyen }] } */
export function fetchSparklines(jours = 30) {
  return appelApi(`/sparklines?jours=${jours}`)
}
