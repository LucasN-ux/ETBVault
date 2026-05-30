// Formatteurs partagés (chiffres fr-FR, tabular-nums côté CSS via .font-mono).

export const eur = (n) =>
  (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

export const eur0 = (n) =>
  Math.round(Number(n) || 0).toLocaleString('fr-FR') + ' €'

export const pct = (n) =>
  (n >= 0 ? '+' : '') + (Number(n) || 0).toFixed(1).replace('.', ',') + ' %'

export const dateFr = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

export const moisFr = (iso) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

// Hue OKLCH stable dérivée de l'id (pour teinter le placeholder « coffret générique »).
export function hueFromId(id = '') {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 360
}
