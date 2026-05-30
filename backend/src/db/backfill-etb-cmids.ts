import 'dotenv/config'
import prisma from './client'
import { ETB_PRODUCT_IDS } from '../services/cm-products'

// One-shot : renseigne cmIdProducts des 66+ ETB curés depuis le mapping statique,
// pour que le pipeline de prix DB-driven les couvre. Usage : npm run backfill:cmids

async function main(): Promise<void> {
  let n = 0
  for (const [id, ids] of Object.entries(ETB_PRODUCT_IDS)) {
    const r = await prisma.produit.updateMany({ where: { id }, data: { cmIdProducts: ids } })
    n += r.count
  }
  console.log(`[backfill] cmIdProducts renseignés pour ${n} ETB curés`)
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect().finally(() => process.exit(1)) })
