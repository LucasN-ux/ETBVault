// Compression par seuil de mouvement (deadband) — pour l'AFFICHAGE du graphe.
//
// Le cron stocke un prix par jour (intégrité de la donnée), mais on n'affiche PAS
// un point par jour : la courbe reste plate tant que le prix ne bouge pas de façon
// significative, et « bouge » dès qu'un vrai mouvement survient.
// → un +1 centime ne crée pas de point ; un mouvement réel, oui.
//
// On compare chaque point au DERNIER POINT RETENU (pas au précédent) : une dérive
// lente finit donc par franchir le seuil et être affichée. Les pics et creux sont
// conservés (montée puis descente franchissent le seuil chacune leur tour).

const defaultY = (p) => Number(p.cmPrixMoyen)

/**
 * @param {Array} points triés chronologiquement
 * @param {number} seuilPct écart relatif minimal pour afficher un point (ex. 0.01 = 1%)
 * @param {(p)=>number} getY accès au prix
 * @returns {Array} sous-ensemble des points (objets d'origine préservés)
 */
export function compresserParSeuil(points, seuilPct = 0.01, getY = defaultY) {
  if (!Array.isArray(points) || points.length <= 2) return points ?? []

  const out = [points[0]]      // toujours garder le premier point
  let ref = getY(points[0])

  for (let i = 1; i < points.length - 1; i++) {
    const y = getY(points[i])
    if (!Number.isFinite(y) || ref <= 0) continue
    if (Math.abs(y - ref) / ref >= seuilPct) {
      out.push(points[i])
      ref = y
    }
  }

  out.push(points[points.length - 1]) // toujours garder le dernier (= prix courant)
  return out
}

const getT = (p) => new Date(p.date).getTime()
const estImporte = (p) => p.origine === 'import_cm'

/**
 * Détecte les vrais trous de collecte (scraping raté) dans la série QUOTIDIENNE brute.
 * On ignore l'historique importé (naturellement épars) pour ne pas le confondre avec un trou.
 * @returns {Array<[number, number]>} intervalles [t1, t2] des trous
 */
export function detecterTrous(rawPoints, gapJours = 10) {
  const holes = []
  const G = gapJours * 86_400_000
  for (let i = 1; i < (rawPoints?.length ?? 0); i++) {
    const a = rawPoints[i - 1]
    const b = rawPoints[i]
    if (getT(b) - getT(a) > G && !estImporte(a) && !estImporte(b)) {
      holes.push([getT(a), getT(b)])
    }
  }
  return holes
}

/**
 * Insère un point null entre deux points affichés qui enjambent un trou,
 * pour que Recharts CASSE la ligne (connectNulls=false) au lieu d'interpoler.
 */
export function insererTrous(displayPoints, holes) {
  if (!holes?.length || !displayPoints?.length) return displayPoints ?? []
  const out = []
  for (let i = 0; i < displayPoints.length; i++) {
    out.push(displayPoints[i])
    const next = displayPoints[i + 1]
    if (!next) continue
    const t1 = getT(displayPoints[i])
    const t2 = getT(next)
    if (holes.some(([h1, h2]) => h1 >= t1 && h2 <= t2)) {
      out.push({ date: new Date((t1 + t2) / 2).toISOString(), cmPrixMoyen: null, _trou: true })
    }
  }
  return out
}
