// Transformation de l'historique de prix en séries pour le graphe (modes Jours / Mois).
// Source = points réellement collectés. On n'invente jamais de données avant la
// première collecte connue.
//   - Jours : 7 derniers jours, 1 point/jour ; report du dernier prix connu sur
//             les jours sans collecte (le cron saute les jours sans changement).
//   - Mois  : 1 point/mois = MÉDIANE des prix du mois, robuste à un pic d'un
//             seul jour contrairement à la moyenne.

import type { ReleveDePrix } from './mouvement'

export interface PointJour {
  /** YYYY-MM-DD */
  date: string
  prix: number
}

export interface PointMois {
  /** YYYY-MM */
  mois: string
  prix: number
  /** Nombre de relevés agrégés dans la médiane. */
  n: number
}

interface PointNormalise {
  /** Minuit UTC, en millisecondes. */
  t: number
  jour: string
  mois: string
  prix: number
}

const JOUR_MS = 86_400_000

function mediane(xs: readonly number[]): number | null {
  if (xs.length === 0) return null
  const tries = [...xs].sort((a, b) => a - b)
  const milieu = Math.floor(tries.length / 2)
  if (tries.length % 2 !== 0) return tries[milieu]!
  return (tries[milieu - 1]! + tries[milieu]!) / 2
}

/** Trie chronologiquement et écarte les relevés sans prix exploitable. */
function normaliser(historique: readonly ReleveDePrix[] | null | undefined): PointNormalise[] {
  const points: PointNormalise[] = []
  for (const releve of historique ?? []) {
    const d = new Date(releve.date)
    const prix = Number(releve.cmPrixMoyen)
    if (!Number.isFinite(d.getTime()) || !Number.isFinite(prix) || prix <= 0) continue
    const iso = d.toISOString()
    points.push({
      t: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      jour: iso.slice(0, 10),
      mois: iso.slice(0, 7),
      prix,
    })
  }
  return points.sort((a, b) => a.t - b.t)
}

/** `n` derniers jours, ancrés sur la dernière donnée connue, avec report en palier. */
export function serieJours(
  historique: readonly ReleveDePrix[] | null | undefined,
  n = 7,
): PointJour[] {
  const points = normaliser(historique)
  if (points.length === 0) return []

  const ancre = points[points.length - 1]!.t
  const serie: PointJour[] = []

  for (let i = n - 1; i >= 0; i--) {
    const jourT = ancre - i * JOUR_MS
    let prix: number | null = null
    for (const p of points) {
      if (p.t <= jourT) prix = p.prix
      else break
    }
    // Avant le premier relevé : rien à afficher, on n'extrapole pas.
    if (prix === null) continue
    serie.push({ date: new Date(jourT).toISOString().slice(0, 10), prix })
  }
  return serie
}

/** Jusqu'à `maxMois` derniers mois ; 1 point/mois = médiane des relevés du mois. */
export function serieMois(
  historique: readonly ReleveDePrix[] | null | undefined,
  maxMois = 12,
): PointMois[] {
  const points = normaliser(historique)
  if (points.length === 0) return []

  const parMois = new Map<string, number[]>()
  for (const p of points) {
    const prixDuMois = parMois.get(p.mois)
    if (prixDuMois) prixDuMois.push(p.prix)
    else parMois.set(p.mois, [p.prix])
  }

  // 'YYYY-MM' : le tri lexical est chronologique.
  return [...parMois.keys()]
    .sort()
    .slice(-maxMois)
    .map((mois) => {
      const prix = parMois.get(mois)!
      return { mois, prix: Math.round(mediane(prix)! * 100) / 100, n: prix.length }
    })
}
