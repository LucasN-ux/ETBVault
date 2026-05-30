import 'dotenv/config'
import prisma from './client'
import { ingererCatalogueCM } from '../services/cm-catalog'

// Seed des produits scellés (hors ETB curés) depuis le catalogue officiel CM.
// Idempotent (createMany skipDuplicates). Usage : npm run seed:produits

async function main(): Promise<void> {
  console.log('[seed:produits] Ingestion du catalogue CM...')
  const { total, retenus, ignoresETB, inseres } = await ingererCatalogueCM()
  console.log(`[seed:produits] ${total} produits CM · ${retenus} retenus (catégories choisies) · ${ignoresETB} ETB déjà curés ignorés · ${inseres} insérés`)

  const parType = await prisma.produit.groupBy({ by: ['type'], _count: true })
  console.log('[seed:produits] Répartition en base :')
  for (const r of parType.sort((a, b) => b._count - a._count)) {
    console.log(`   ${String(r.type).padEnd(8)} ${r._count}`)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); return prisma.$disconnect().finally(() => process.exit(1)) })
