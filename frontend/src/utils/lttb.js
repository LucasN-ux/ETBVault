// LTTB — Largest-Triangle-Three-Buckets.
// Réduit un grand nombre de points en préservant la FORME de la courbe
// (pics, creux, ruptures de pente) au lieu d'agréger par pas de temps fixe.
// → la densité de points suit les vrais changements de prix de chaque ETB.
//
// Réf. : Sveinn Steinarsson, "Downsampling Time Series for Visual Representation" (2013).

const defaultX = (p) => new Date(p.date).getTime()
const defaultY = (p) => Number(p.cmPrixMoyen)

/**
 * @param {Array} data points triés chronologiquement
 * @param {number} seuil nombre de points cible (>= 3)
 * @param {(p)=>number} getX accès à l'abscisse (timestamp)
 * @param {(p)=>number} getY accès à l'ordonnée (prix)
 * @returns {Array} sous-ensemble des points d'origine (objets préservés)
 */
export function lttb(data, seuil, getX = defaultX, getY = defaultY) {
  const n = data?.length ?? 0
  if (!Array.isArray(data) || seuil >= n || seuil < 3) return data ?? []

  const echantillon = [data[0]] // toujours garder le premier point
  const tailleBucket = (n - 2) / (seuil - 2)
  let a = 0 // index du dernier point retenu

  for (let i = 0; i < seuil - 2; i++) {
    // Moyenne du bucket suivant (point « cible » du triangle)
    let avgX = 0
    let avgY = 0
    let debutMoy = Math.floor((i + 1) * tailleBucket) + 1
    let finMoy = Math.floor((i + 2) * tailleBucket) + 1
    finMoy = Math.min(finMoy, n)
    const lenMoy = finMoy - debutMoy
    for (; debutMoy < finMoy; debutMoy++) {
      avgX += getX(data[debutMoy])
      avgY += getY(data[debutMoy])
    }
    avgX /= lenMoy
    avgY /= lenMoy

    // Bucket courant : on garde le point formant le plus grand triangle
    let debut = Math.floor(i * tailleBucket) + 1
    const fin = Math.floor((i + 1) * tailleBucket) + 1
    const ax = getX(data[a])
    const ay = getY(data[a])
    let aireMax = -1
    let prochainA = debut
    for (; debut < fin; debut++) {
      const aire =
        Math.abs(
          (ax - avgX) * (getY(data[debut]) - ay) -
          (ax - getX(data[debut])) * (avgY - ay)
        ) * 0.5
      if (aire > aireMax) {
        aireMax = aire
        prochainA = debut
      }
    }
    echantillon.push(data[prochainA])
    a = prochainA
  }

  echantillon.push(data[n - 1]) // toujours garder le dernier point
  return echantillon
}
