// Formatteurs partagés (chiffres fr-FR, tabular-nums côté CSS via .font-mono).
//
// Ils acceptent `unknown` parce que l'API renvoie les montants en chaîne
// (sérialisation des `Decimal` Prisma) : c'est ici qu'on absorbe la conversion,
// plutôt que dans chaque écran.

const nombre = (v: unknown): number => Number(v) || 0

export const eur = (v: unknown): string =>
  nombre(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

export const eur0 = (v: unknown): string => Math.round(nombre(v)).toLocaleString('fr-FR') + ' €'

export const pct = (v: unknown): string => {
  const n = nombre(v)
  return (n >= 0 ? '+' : '') + n.toFixed(1).replace('.', ',') + ' %'
}

export const dateFr = (iso: string | Date | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

export const moisFr = (iso: string | Date): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

/** Teinte OKLCH stable dérivée de l'id — le placeholder d'une ETB garde sa couleur. */
export function hueFromId(id = ''): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 360
}
