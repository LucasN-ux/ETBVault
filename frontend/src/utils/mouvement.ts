// Détection de mouvement de prix — ADAPTATIVE par ETB.
// Miroir front de backend/src/services/mouvement.ts : chaque mouvement est jugé
// par rapport à la volatilité propre de l'ETB, jamais avec un seuil fixe global.
// ETBVault constate, ne conseille pas.

export type Niveau = 'faible' | 'moyen' | 'fort' | 'indisponible'
export type Direction = 'hausse' | 'baisse' | 'stable' | 'indisponible'

export interface Horizon {
  horizonJours: number
  /** null quand l'historique ne remonte pas assez loin. */
  variationPct: number | null
  /** Nombre d'écarts-types ; null en démarrage à froid. */
  z: number | null
  niveau: Niveau
  direction: Direction
}

export interface Mouvement {
  /** Volatilité journalière robuste ; null en démarrage à froid. */
  volatilite: number | null
  nbPoints: number
  donneesInsuffisantes: boolean
  courtTerme: Horizon
  longTerme: Horizon
}

/** Forme minimale acceptée en entrée : un relevé daté et valorisé. */
export interface ReleveDePrix {
  date: string | Date
  cmPrixMoyen: number | string | null
}

interface Point {
  t: number
  prix: number
}

const Z_FAIBLE = 1
const Z_FORT = 2.5
const MIN_POINTS = 30
const ABS_FAIBLE = 0.05
const ABS_FORT = 0.15
const SEUIL_PLAT = 0.005
const HORIZON_COURT = 30
const HORIZON_LONG = 180
const MS_PAR_JOUR = 86_400_000

function mediane(xs: number[]): number {
  if (xs.length === 0) return 0
  const tries = [...xs].sort((a, b) => a - b)
  const milieu = Math.floor(tries.length / 2)
  if (tries.length % 2 !== 0) return tries[milieu]!
  return (tries[milieu - 1]! + tries[milieu]!) / 2
}

/** Volatilité robuste = 1.4826 × MAD — insensible aux pics isolés. */
function volatiliteRobuste(variations: number[]): number {
  if (variations.length < 2) return 0
  const med = mediane(variations)
  return 1.4826 * mediane(variations.map((v) => Math.abs(v - med)))
}

function sensDe(variation: number): Direction {
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

/** Prix d'il y a `joursAvant` jours = dernier relevé à cette date ou avant. */
function prixAvant(points: Point[], instantRef: number, joursAvant: number): number | null {
  const cible = instantRef - joursAvant * MS_PAR_JOUR
  let trouve: number | null = null
  for (const p of points) {
    if (p.t <= cible) trouve = p.prix
    else break
  }
  return trouve
}

function calculerHorizon(
  points: Point[],
  sigma: number,
  demarrageAFroid: boolean,
  horizonJours: number,
): Horizon {
  const indisponible: Horizon = {
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

  // Sans assez d'historique, on ne peut pas normaliser : repli sur des seuils absolus.
  if (demarrageAFroid || sigma <= 0) {
    return {
      horizonJours,
      variationPct: variation * 100,
      z: null,
      niveau: classerAbsolu(variation),
      direction: sensDe(variation),
    }
  }

  const z = variation / (sigma * Math.sqrt(horizonJours))
  return {
    horizonJours,
    variationPct: variation * 100,
    z,
    niveau: classerZ(z),
    direction: sensDe(variation),
  }
}

/** Mouvements d'une ETB sur deux horizons (30 j, 180 j), adaptés à sa volatilité. */
export function detecterMouvement(historique: readonly ReleveDePrix[] | null | undefined): Mouvement {
  const points: Point[] = (historique ?? [])
    .map((h) => ({ t: new Date(h.date).getTime(), prix: Number(h.cmPrixMoyen) }))
    .filter((p) => Number.isFinite(p.prix) && p.prix > 0 && Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t)

  const nbPoints = points.length
  const demarrageAFroid = nbPoints < MIN_POINTS

  const variations: number[] = []
  for (let i = 1; i < points.length; i++) {
    const precedent = points[i - 1]!.prix
    if (precedent > 0) variations.push((points[i]!.prix - precedent) / precedent)
  }
  const sigma = demarrageAFroid ? 0 : volatiliteRobuste(variations)

  return {
    volatilite: demarrageAFroid ? null : sigma,
    nbPoints,
    donneesInsuffisantes: demarrageAFroid,
    courtTerme: calculerHorizon(points, sigma, demarrageAFroid, HORIZON_COURT),
    longTerme: calculerHorizon(points, sigma, demarrageAFroid, HORIZON_LONG),
  }
}

// ── Affichage ────────────────────────────────────────────────────────────────

export const NIVEAU_LABEL: Record<Niveau, string> = {
  faible: 'Faible',
  moyen: 'Moyen',
  fort: 'Fort',
  indisponible: '—',
}

/** Ce que l'affichage a besoin de connaître d'un horizon. */
export type AspectMouvement = Pick<Horizon, 'niveau' | 'direction'>

/** Le niveau « faible » est traité comme stable : trop petit pour être un mouvement. */
export function flecheMouvement(h: AspectMouvement | null | undefined): string {
  if (!h || h.niveau === 'indisponible' || h.niveau === 'faible') return '→'
  if (h.direction === 'hausse') return '↑'
  if (h.direction === 'baisse') return '↓'
  return '→'
}

export function couleurMouvement(h: AspectMouvement | null | undefined): string {
  if (!h || h.niveau === 'indisponible' || h.direction === 'stable' || h.niveau === 'faible') {
    return 'text-gray-400'
  }
  return h.direction === 'hausse' ? 'text-green-400' : 'text-red-400'
}
