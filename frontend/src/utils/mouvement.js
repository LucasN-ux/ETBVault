// Détection de mouvement de prix — ADAPTATIVE par ETB.
// Miroir front de backend/src/services/mouvement.ts : chaque mouvement est jugé
// par rapport à la volatilité propre de l'ETB, jamais avec un seuil fixe global.
// ETBVault constate, ne conseille pas.

const Z_FAIBLE = 1
const Z_FORT = 2.5
const MIN_POINTS = 30
const ABS_FAIBLE = 0.05
const ABS_FORT = 0.15
const SEUIL_PLAT = 0.005
const HORIZON_COURT = 30
const HORIZON_LONG = 180

function mediane(xs) {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

// Volatilité robuste = 1.4826 × MAD (insensible aux pics isolés)
function volatiliteRobuste(returns) {
  if (returns.length < 2) return 0
  const med = mediane(returns)
  return 1.4826 * mediane(returns.map((r) => Math.abs(r - med)))
}

function direction(variation) {
  if (Math.abs(variation) < SEUIL_PLAT) return 'stable'
  return variation > 0 ? 'hausse' : 'baisse'
}

function classerAbsolu(variation) {
  const a = Math.abs(variation)
  if (a < ABS_FAIBLE) return 'faible'
  if (a < ABS_FORT) return 'moyen'
  return 'fort'
}

function classerZ(z) {
  const a = Math.abs(z)
  if (a < Z_FAIBLE) return 'faible'
  if (a < Z_FORT) return 'moyen'
  return 'fort'
}

// Prix tel qu'il était il y a `joursAvant` jours = dernier point connu à cette date ou avant
function prixAvant(points, refT, joursAvant) {
  const cible = refT - joursAvant * 86_400_000
  let trouve = null
  for (const p of points) {
    if (p.t <= cible) trouve = p.prix
    else break
  }
  return trouve
}

function calculerHorizon(points, sigma, coldStart, horizonJours) {
  const indisponible = {
    horizonJours,
    variationPct: null,
    z: null,
    niveau: 'indisponible',
    direction: 'indisponible',
  }
  if (points.length < 2) return indisponible

  const dernier = points[points.length - 1]
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
 * Détecte les mouvements de prix d'une ETB sur 2 horizons (court 30j, long 180j),
 * adaptés à sa propre volatilité.
 * @param {Array<{date: string|Date, cmPrixMoyen: number|string|null}>} historique
 */
export function detecterMouvement(historique) {
  const points = (historique ?? [])
    .map((h) => ({ t: new Date(h.date).getTime(), prix: Number(h.cmPrixMoyen) }))
    .filter((p) => Number.isFinite(p.prix) && p.prix > 0 && Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t)

  const nbPoints = points.length
  const coldStart = nbPoints < MIN_POINTS

  const returns = []
  for (let i = 1; i < points.length; i++) {
    const prec = points[i - 1].prix
    if (prec > 0) returns.push((points[i].prix - prec) / prec)
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

// Seuil de mouvement pour le GRAPHE, adapté à la volatilité propre de l'ETB.
// Une ETB stable (σ ~0) → seuil = plancher (montre le moindre vrai frémissement).
// Une ETB volatile (σ élevé) → seuil plus haut (filtre davantage de bruit).
// Cohérent avec la détection de mouvement : le graphe parle la même « langue » que l'indicateur.
const SEUIL_PLANCHER = 0.005 // 0,5 % minimum
const SEUIL_PLAFOND = 0.05   // 5 % maximum
const SEUIL_K = 2.5          // multiple de σ (volatilité journalière)
const SEUIL_DEFAUT = 0.01    // cold start (pas assez d'historique pour σ)

export function seuilAffichage(volatilite) {
  if (volatilite == null || !Number.isFinite(volatilite) || volatilite <= 0) return SEUIL_DEFAUT
  return Math.min(SEUIL_PLAFOND, Math.max(SEUIL_PLANCHER, SEUIL_K * volatilite))
}

// ── Helpers d'affichage ───────────────────────────────────────────────────────

export const NIVEAU_LABEL = {
  faible: 'Faible',
  moyen: 'Moyen',
  fort: 'Fort',
  indisponible: '—',
}

// Flèche selon la direction (le niveau « faible » est traité comme stable)
export function flecheMouvement(h) {
  if (!h || h.niveau === 'indisponible' || h.niveau === 'faible') return '→'
  return h.direction === 'hausse' ? '↑' : h.direction === 'baisse' ? '↓' : '→'
}

// Couleur Tailwind selon direction/niveau
export function couleurMouvement(h) {
  if (!h || h.niveau === 'indisponible' || h.direction === 'stable' || h.niveau === 'faible')
    return 'text-gray-400'
  return h.direction === 'hausse' ? 'text-green-400' : 'text-red-400'
}
