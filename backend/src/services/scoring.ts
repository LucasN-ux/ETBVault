// Algorithme de score ETB — 5 critères, 0-100, transparent
// Poids définis dans CLAUDE.md

import type { PrixHistorique } from '@prisma/client'
import type { Decimal } from '@prisma/client/runtime/library'

export type NomCritere =
  | 'tendance_30j'
  | 'stock_disponible'
  | 'ratio_prix_sortie'
  | 'valeur_pulls'
  | 'interet_communaute'

export interface DetailCritere {
  score: number
  poids: number
  valeur: string
  source: string
}

export interface ScoreResult {
  score: number
  label: 'Acheter' | 'Surveiller' | 'Trop tard'
  detail: Record<NomCritere, DetailCritere>
}

type PrixEntry = Pick<
  PrixHistorique,
  'cmPrixMoyen' | 'cmPrixBas' | 'cmNbAnnonces'
>

function toNum(v: Decimal | number | null | undefined): number {
  if (v === null || v === undefined) return 0
  return Number(v)
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v))
}

export function calculerScore(
  historique: PrixEntry[],
  prixSortie: Decimal | number | null | undefined,
  valeurTop10: number | null
): ScoreResult {
  const detail = {} as Record<NomCritere, DetailCritere>

  // ── tendance_30j (25%) ──────────────────────────────────────
  let scoreTendance = 50
  let valeurTendance = 'N/A'
  if (historique.length >= 2) {
    const dernier = toNum(historique[historique.length - 1]?.cmPrixMoyen)
    const ancien = toNum(historique[0]?.cmPrixMoyen)
    if (ancien > 0) {
      const variation = (dernier - ancien) / ancien
      scoreTendance = clamp(Math.round(50 + variation * 250))
      valeurTendance = `${(variation * 100).toFixed(1)}%`
    }
  }
  detail.tendance_30j = {
    score: scoreTendance,
    poids: 25,
    valeur: valeurTendance,
    source: 'Cardmarket',
  }

  // ── stock_disponible (20%) ──────────────────────────────────
  const dernierPrix = historique[historique.length - 1]
  const nbAnnonces = dernierPrix?.cmNbAnnonces ?? null
  let scoreStock = 50
  if (nbAnnonces !== null) {
    if (nbAnnonces < 10) scoreStock = 100
    else if (nbAnnonces <= 50) scoreStock = 60
    else scoreStock = 20
  }
  detail.stock_disponible = {
    score: scoreStock,
    poids: 20,
    valeur: nbAnnonces !== null ? `${nbAnnonces} annonces` : 'N/A',
    source: 'Cardmarket listings',
  }

  // ── ratio_prix_sortie (20%) ─────────────────────────────────
  let scoreRatio = 50
  let valeurRatio = 'N/A'
  const prixActuel = toNum(dernierPrix?.cmPrixMoyen)
  const prixRef = toNum(prixSortie)
  if (prixActuel > 0 && prixRef > 0) {
    const ratio = prixActuel / prixRef
    scoreRatio = clamp(Math.round((ratio - 1) * 35 + 30))
    valeurRatio = `x${ratio.toFixed(2)}`
  }
  detail.ratio_prix_sortie = {
    score: scoreRatio,
    poids: 20,
    valeur: valeurRatio,
    source: 'Prix de sortie officiel',
  }

  // ── valeur_pulls (20%) ─────────────────────────────────────
  let scoreValeur = 50
  let valeurPullsStr = 'N/A'
  if (valeurTop10 !== null && prixRef > 0) {
    const valeurPull = valeurTop10 / 9
    scoreValeur = clamp(Math.round((valeurPull / prixRef) * 100))
    valeurPullsStr = `${valeurTop10.toFixed(2)} €`
  }
  detail.valeur_pulls = {
    score: scoreValeur,
    poids: 20,
    valeur: valeurPullsStr,
    source: 'TCGdex — Cardmarket',
  }

  // ── interet_communaute (15%) — fixé à 50 en V1 ─────────────
  detail.interet_communaute = {
    score: 50,
    poids: 15,
    valeur: '50/100',
    source: 'Non disponible en V1',
  }

  // ── Score final ─────────────────────────────────────────────
  const scoreTotal = Math.round(
    detail.tendance_30j.score * 0.25 +
    detail.stock_disponible.score * 0.20 +
    detail.ratio_prix_sortie.score * 0.20 +
    detail.valeur_pulls.score * 0.20 +
    detail.interet_communaute.score * 0.15
  )

  let label: ScoreResult['label']
  if (scoreTotal >= 70) label = 'Acheter'
  else if (scoreTotal >= 40) label = 'Surveiller'
  else label = 'Trop tard'

  return { score: scoreTotal, label, detail }
}
