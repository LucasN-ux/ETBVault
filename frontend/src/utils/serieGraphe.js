// Transformation de l'historique de prix en séries pour le graphe (modes Jours / Mois).
// Source = points réels collectés (cmPrixMoyen). On n'invente jamais de données avant
// la 1re collecte connue.
//   - Jours : 7 derniers jours, 1 point/jour ; report du dernier prix connu (palier)
//             sur les jours sans collecte (le cron saute les jours sans changement).
//   - Mois  : jusqu'à `maxMois` derniers mois, 1 point/mois = MÉDIANE des prix du mois
//             (robuste à un pic d'un seul jour, contrairement à la moyenne).

const JOUR_MS = 86_400_000

function mediane(xs) {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// Normalise + trie chronologiquement : [{ t (ms, minuit UTC), jour 'YYYY-MM-DD', mois 'YYYY-MM', prix }]
// Filtre les points sans prix valide.
function normaliser(historique) {
  return (historique ?? [])
    .map((h) => {
      const d = new Date(h.date)
      const prix = Number(h.cmPrixMoyen)
      if (!Number.isFinite(d.getTime()) || !Number.isFinite(prix) || prix <= 0) return null
      const iso = d.toISOString()
      return {
        t: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
        jour: iso.slice(0, 10),
        mois: iso.slice(0, 7),
        prix,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.t - b.t)
}

// 7 derniers jours (ancrés sur la dernière donnée connue), 1 point/jour avec report (palier).
export function serieJours(historique, n = 7) {
  const pts = normaliser(historique)
  if (pts.length === 0) return []
  const ancre = pts[pts.length - 1].t
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const jourT = ancre - i * JOUR_MS
    // dernier prix connu à cette date ou avant (report / palier)
    let prix = null
    for (const p of pts) {
      if (p.t <= jourT) prix = p.prix
      else break
    }
    if (prix === null) continue // avant la 1re donnée : on n'invente pas
    out.push({ date: new Date(jourT).toISOString().slice(0, 10), prix })
  }
  return out
}

// Jusqu'à `maxMois` derniers mois ; 1 point/mois = médiane des prix collectés ce mois-là.
export function serieMois(historique, maxMois = 12) {
  const pts = normaliser(historique)
  if (pts.length === 0) return []
  const parMois = new Map()
  for (const p of pts) {
    if (!parMois.has(p.mois)) parMois.set(p.mois, [])
    parMois.get(p.mois).push(p.prix)
  }
  const moisTries = [...parMois.keys()].sort() // 'YYYY-MM' : tri lexical = chronologique
  return moisTries.slice(-maxMois).map((m) => {
    const prix = mediane(parMois.get(m))
    return { mois: m, prix: Math.round(prix * 100) / 100, n: parMois.get(m).length }
  })
}
