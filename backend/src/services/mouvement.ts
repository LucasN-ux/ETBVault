// Détection de mouvement de prix — ADAPTATIVE par ETB (remplace l'ancien score /100).
// Règle clé (CLAUDE.md) : pas de seuil fixe global. Chaque mouvement est jugé par
// rapport à la volatilité normale de l'ETB elle-même. ETBVault constate, ne conseille pas.

import type { Decimal } from '@prisma/client/runtime/library'

export type Niveau = 'faible' | 'moyen' | 'fort' | 'indisponible'
export type Direction = 'hausse' | 'baisse' | 'stable' | 'indisponible'

export interface MouvementHorizon {
  horizonJours: number
  variationPct: number | null // variation en % sur l'horizon
  z: number | null            // nb d'écarts-types (null en cold start)
  niveau: Niveau
  direction: Direction
}

export interface MouvementResult {
  volatilite: number | null   // σ_etb (volatilité robuste journalière), null si cold start
  nbPoints: number
  donneesInsuffisantes: boolean
  courtTerme: MouvementHorizon // 30 jours
  longTerme: MouvementHorizon  // 180 jours
}

export interface PointPrix {
  date: Date | string
  cmPrixMoyen: Decimal | number | null
}

// Seuils (déjà normalisés → identiques pour toutes les ETB)
const Z_FAIBLE = 1
const Z_FORT = 2.5
// Cold start (< MIN_POINTS) : repli sur seuils absolus
const MIN_POINTS = 30
const ABS_FAIBLE = 0.05 // 5%
const ABS_FORT = 0.15   // 15%
const HORIZON_COURT = 30
const HORIZON_LONG = 180
const SEUIL_PLAT = 0.005 // sous 0,5% on considère le sens « stable »

function toNum(v: Decimal | number | null | undefined): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function mediane(xs: number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!
}

// Volatilité robuste = MAD mise à l'échelle d'un écart-type (1.4826 × MAD).
// Robuste aux pics isolés, contrairement à l'écart-type classique.
function volatiliteRobuste(returns: number[]): number {
  if (returns.length < 2) return 0
  const med = mediane(returns)
  const ecarts = returns.map((r) => Math.abs(r - med))
  return 1.4826 * mediane(ecarts)
}

interface PointNorm {
  t: number // timestamp ms
  prix: number
}

function direction(variation: number): Direction {
  if (Math.abs(variation) < SEUIL_PLAT) return 'stable'
  return variation > 0 ? 'hausse' : 'baisse'
}

function classerAbsolu(variation: number): Niveau {
  const a = Math.abs(variation)
  if (a < ABS_FAIBLE) return 'faible'
  if (a < ABS_FORT) return 'moyen'
  return 'fort'
}

function classerZ(z: number): Niveau {
  const a = Math.abs(z)
  if (a < Z_FAIBLE) return 'faible'
  if (a < Z_FORT) return 'moyen'
  return 'fort'
}

// Prix « tel qu'il était il y a h jours » = dernier point connu à la date (J0 - h) ou avant.
function prixAvant(points: PointNorm[], refT: number, joursAvant: number): number | null {
  const cible = refT - joursAvant * 86_400_000
  let trouve: number | null = null
  for (const p of points) {
    if (p.t <= cible) trouve = p.prix
    else break
  }
  return trouve
}

function calculerHorizon(
  points: PointNorm[],
  sigma: number,
  coldStart: boolean,
  horizonJours: number
): MouvementHorizon {
  const indisponible: MouvementHorizon = {
    horizonJours,
    variationPct: null,
    z: null,
    niveau: 'indisponible',
    direction: 'indisponible',
  }
  if (points.length < 2) return indisponible

  const dernier = points[points.length - 1]!
  const prixDebut = prixAvant(points, dernier.t, horizonJours)
  if (prixDebut === null || prixDebut <= 0) return indisponible

  const variation = (dernier.prix - prixDebut) / prixDebut

  if (coldStart || sigma <= 0) {
    return {
      horizonJours,
      variationPct: variation * 100,
      z: null,
      niveau: classerAbsolu(variation),
      direction: direction(variation),
    }
  }

  // Volatilité attendue sur l'horizon : σ croît en √temps
  const z = variation / (sigma * Math.sqrt(horizonJours))
  return {
    horizonJours,
    variationPct: variation * 100,
    z,
    niveau: classerZ(z),
    direction: direction(variation),
  }
}

/**
 * Détecte les mouvements de prix d'une ETB sur deux horizons (court 30j, long 180j),
 * adaptés à sa propre volatilité.
 * @param historique points de prix (idéalement quotidiens), ordre quelconque
 */
export function detecterMouvement(historique: PointPrix[]): MouvementResult {
  // Normalisation + tri chronologique + filtrage des points sans prix
  const points: PointNorm[] = historique
    .map((h) => ({ t: new Date(h.date).getTime(), prix: toNum(h.cmPrixMoyen) }))
    .filter((p): p is PointNorm => p.prix !== null && p.prix > 0 && Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t)

  const nbPoints = points.length
  const coldStart = nbPoints < MIN_POINTS

  // Returns entre points consécutifs (approx. journalière)
  const returns: number[] = []
  for (let i = 1; i < points.length; i++) {
    const prec = points[i - 1]!.prix
    if (prec > 0) returns.push((points[i]!.prix - prec) / prec)
  }
  const sigma = coldStart ? 0 : volatiliteRobuste(returns)

  return {
    volatilite: coldStart ? null : sigma,
    nbPoints,
    donneesInsuffisantes: coldStart,
    courtTerme: calculerHorizon(points, sigma, coldStart, HORIZON_COURT),
    longTerme: calculerHorizon(points, sigma, coldStart, HORIZON_LONG),
  }
}
