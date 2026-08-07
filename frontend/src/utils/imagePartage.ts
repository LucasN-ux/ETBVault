// Génère un PNG de partage du coffre (dessiné au canvas → couleurs hex, pas d'oklch).
// On ne montre QUE la valeur et la plus-value % (jamais le prix d'achat — règle n°8).
import { eur0, pct } from './format'
import type { PointValeur } from './valeurHistorique'

/** Ce que l'image montre — jamais le prix d'achat. */
export interface StatsPartage {
  valeur: number
  plPct: number
  positive: boolean
  serie?: readonly PointValeur[]
}

export type ResultatPartage = 'partage' | 'annule' | 'telechargement'

const COL = {
  bg: '#17130d', card: '#211c14', border: '#3a3328',
  text: '#f5f0e6', muted: '#9a9387', accent: '#e6b54a', up: '#46c08a', down: '#e8604c',
}

export async function genererImagePartage({ valeur, plPct, positive, serie = [] }: StatsPartage): Promise<Blob> {
  const W = 1200
  const H = 630
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const x = c.getContext('2d')
  if (!x) throw new Error('Canvas 2D indisponible')

  // fond + cadre
  x.fillStyle = COL.bg
  x.fillRect(0, 0, W, H)
  x.fillStyle = COL.card
  roundRect(x, 48, 48, W - 96, H - 96, 28)
  x.fill()
  x.strokeStyle = COL.border
  x.lineWidth = 2
  roundRect(x, 48, 48, W - 96, H - 96, 28)
  x.stroke()

  // marque
  x.fillStyle = COL.accent
  x.font = 'bold 34px Geist, system-ui, sans-serif'
  x.fillText('etbVault', 96, 132)
  x.fillStyle = COL.muted
  x.font = '24px Geist, system-ui, sans-serif'
  x.fillText('MON COFFRE', 96, 176)

  // valeur
  x.fillStyle = COL.text
  x.font = 'bold 118px Geist, system-ui, sans-serif'
  x.fillText(eur0(valeur), 96, 320)

  // plus-value %
  const col = positive ? COL.up : COL.down
  x.fillStyle = col
  x.font = 'bold 56px Geist, system-ui, sans-serif'
  x.fillText(`${positive ? '▲' : '▼'} ${pct(plPct)}`, 96, 400)

  // mini-courbe
  if (serie.length >= 2) dessinerSparkline(x, serie, 96, 440, W - 192, 90, col)

  // bas de carte
  x.fillStyle = COL.muted
  x.font = '24px Geist, system-ui, sans-serif'
  x.fillText('Des faits, pas des conseils · etbvault', 96, H - 88)

  return new Promise<Blob>((resoudre, rejeter) =>
    c.toBlob((blob) => (blob ? resoudre(blob) : rejeter(new Error('Export PNG impossible'))), 'image/png'),
  )
}

function dessinerSparkline(
  x: CanvasRenderingContext2D,
  serie: readonly PointValeur[],
  ox: number,
  oy: number,
  w: number,
  h: number,
  color: string,
): void {
  const vals = serie.map((p) => p.valeur)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  x.strokeStyle = color
  x.lineWidth = 4
  x.lineJoin = 'round'
  x.beginPath()
  serie.forEach((p, i) => {
    const px = ox + (i / (serie.length - 1)) * w
    const py = oy + h - ((p.valeur - min) / span) * h
    if (i === 0) x.moveTo(px, py)
    else x.lineTo(px, py)
  })
  x.stroke()
}

function roundRect(
  x: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  r: number,
): void {
  x.beginPath()
  x.moveTo(left + r, top)
  x.arcTo(left + w, top, left + w, top + h, r)
  x.arcTo(left + w, top + h, left, top + h, r)
  x.arcTo(left, top + h, left, top, r)
  x.arcTo(left, top, left + w, top, r)
  x.closePath()
}

// Partage natif (mobile) avec image, sinon téléchargement + copie du lien.
export async function partagerCoffre(stats: StatsPartage): Promise<ResultatPartage> {
  const blob = await genererImagePartage(stats)
  const file = new File([blob], 'mon-coffre-etbvault.png', { type: 'image/png' })
  const texte = `Mon coffre Pokémon scellé : ${eur0(stats.valeur)} (${pct(stats.plPct)}) — suivi sur etbVault`
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: texte })
      return 'partage'
    } catch {
      return 'annule'
    }
  }
  // repli desktop : téléchargement
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'mon-coffre-etbvault.png'
  a.click()
  URL.revokeObjectURL(url)
  return 'telechargement'
}
