import 'dotenv/config'
import prisma from './client'
import { SERIE_LABEL } from '../services/cm-series'

// Pose la VRAIE série (era) de chaque produit ayant un setId, d'après la série
// du set TCGdex — couvre tous les blocs (Base, EX, DP, … jusqu'à Méga-Évolution),
// pas seulement les 6 ères modernes. N'utilise pas d'appariement par nom (sûr).
// Usage : npm run enrich:series

const TCGDEX = 'https://api.tcgdex.net/v2/en'

async function main(): Promise<void> {
  const produits = await prisma.produit.findMany({
    where: { NOT: { setId: null } },
    select: { id: true, setId: true },
  })
  const setIds = [...new Set(produits.map((p) => p.setId).filter((s): s is string => !!s))]
  console.log(`[enrich:series] ${produits.length} produits avec setId · ${setIds.length} sets distincts`)

  // série (libellé FR) par setId
  const serieParSet = new Map<string, string>()
  for (const sid of setIds) {
    const d = await fetch(`${TCGDEX}/sets/${sid}`).then((r) => r.json()).catch(() => null) as { serie?: { id: string; name: string } } | null
    if (d?.serie?.id) serieParSet.set(sid, SERIE_LABEL[d.serie.id] ?? d.serie.name)
  }

  let n = 0
  const parSerie = new Map<string, number>()
  for (const p of produits) {
    const era = p.setId ? serieParSet.get(p.setId) : undefined
    if (!era) continue
    await prisma.produit.update({ where: { id: p.id }, data: { era } })
    parSerie.set(era, (parSerie.get(era) ?? 0) + 1)
    n++
  }
  console.log(`[enrich:series] ${n} produits rattachés à leur série`)
  for (const [s, c] of [...parSerie.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${s.padEnd(24)} ${c}`)
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect().finally(() => process.exit(1)) })
