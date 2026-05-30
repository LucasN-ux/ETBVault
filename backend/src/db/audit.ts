import 'dotenv/config'
import prisma from './client'

// Audit de complétude des données produits, par type. Usage : npx tsx src/db/audit.ts
async function main(): Promise<void> {
  const produits = await prisma.produit.findMany({
    select: { id: true, type: true, era: true, setId: true, dateSortie: true, imageUrl: true, boxImageUrl: true, cmIdProducts: true },
  })
  const prix = await prisma.prixHistorique.groupBy({ by: ['produitId'], _count: true })
  const avecPrix = new Set(prix.map((p) => p.produitId))

  const types = [...new Set(produits.map((p) => p.type))]
  console.log('TYPE      total  era  setId  date  image  cmIds  prix')
  for (const t of types.sort()) {
    const l = produits.filter((p) => p.type === t)
    const c = (f: (p: typeof l[number]) => boolean) => l.filter(f).length
    console.log(
      `${String(t).padEnd(9)} ${String(l.length).padStart(5)} ${String(c((p) => !!p.era)).padStart(4)} ${String(c((p) => !!p.setId)).padStart(6)} ${String(c((p) => !!p.dateSortie)).padStart(5)} ${String(c((p) => !!(p.imageUrl || p.boxImageUrl))).padStart(6)} ${String(c((p) => p.cmIdProducts.length > 0)).padStart(6)} ${String(c((p) => avecPrix.has(p.id))).padStart(5)}`,
    )
  }
  console.log(`\nTOTAL produits : ${produits.length}`)

  // ETB sans ère (= invisibles dans la vue groupée par ère du catalogue)
  const etbSansEre = produits.filter((p) => p.type === 'ETB' && !p.era)
  console.log(`\nETB sans ère (cachés dans la vue groupée) : ${etbSansEre.length}`)
  console.log('   ex:', etbSansEre.slice(0, 8).map((p) => p.id).join(', '))
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect().finally(() => process.exit(1)) })
