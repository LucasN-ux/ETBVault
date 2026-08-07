import 'dotenv/config'
import prisma from './client'
import { infererEre } from '../services/cm-eres'

// Renseigne l'ère des produits qui n'en ont pas (ingérés), inférée depuis le nom.
// Ne touche pas les produits déjà dotés d'une ère (ETB curés). Usage : npm run enrich:eres

async function main(): Promise<void> {
  const sansEre = await prisma.etb.findMany({ where: { era: null }, select: { id: true, nom: true } })
  console.log(`[enrich:eres] ${sansEre.length} produits sans ère à traiter`)

  let majParEre = new Map<string, number>()
  let nonResolus = 0
  for (const p of sansEre) {
    const ere = infererEre(p.nom)
    if (!ere) { nonResolus++; continue }
    await prisma.etb.update({ where: { id: p.id }, data: { era: ere } })
    majParEre.set(ere, (majParEre.get(ere) ?? 0) + 1)
  }

  const resolus = sansEre.length - nonResolus
  console.log(`[enrich:eres] ${resolus} ères inférées · ${nonResolus} non résolus (→ « Autres »)`)
  for (const [ere, n] of [...majParEre.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${ere.padEnd(22)} ${n}`)
  }
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect().finally(() => process.exit(1)) })
