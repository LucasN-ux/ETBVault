import 'dotenv/config'
import prisma from './client'
import { fetchCmJson } from '../services/cm-session'

// Propage la série aux produits non classés via l'extension CM (idExpansion) :
// les produits d'une même extension partagent la même série. Si au moins un
// produit de l'extension a une série, on l'applique aux autres.
// Usage : npm run propager:series

const CM_PRODUCTS_URL = 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_6.json'

interface CmProduct { idProduct: number; idExpansion?: number }

async function main(): Promise<void> {
  const data = await fetchCmJson<{ products?: CmProduct[] }>(CM_PRODUCTS_URL)
  const expansionParId = new Map<number, number>()
  for (const p of data.products ?? []) {
    if (p.idExpansion) expansionParId.set(p.idProduct, p.idExpansion)
  }

  const produits = await prisma.produit.findMany({ select: { id: true, era: true, cmIdProducts: true } })

  // Série dominante par extension (parmi les produits déjà classés)
  const serieParExpansion = new Map<number, Map<string, number>>()
  const expansionDuProduit = new Map<string, number>()
  for (const p of produits) {
    const idp = p.cmIdProducts[0]
    const exp = idp ? expansionParId.get(idp) : undefined
    if (!exp) continue
    expansionDuProduit.set(p.id, exp)
    if (p.era) {
      const m = serieParExpansion.get(exp) ?? new Map<string, number>()
      m.set(p.era, (m.get(p.era) ?? 0) + 1)
      serieParExpansion.set(exp, m)
    }
  }
  const serieDominante = new Map<number, string>()
  for (const [exp, m] of serieParExpansion) {
    serieDominante.set(exp, [...m.entries()].sort((a, b) => b[1] - a[1])[0]![0])
  }

  let n = 0
  for (const p of produits) {
    if (p.era) continue
    const exp = expansionDuProduit.get(p.id)
    const era = exp ? serieDominante.get(exp) : undefined
    if (!era) continue
    await prisma.produit.update({ where: { id: p.id }, data: { era } })
    n++
  }
  console.log(`[propager:series] ${n} produits classés par propagation d'extension`)

  const restants = await prisma.produit.count({ where: { era: null } })
  console.log(`[propager:series] reste ${restants} produits sans série (aucune extension classée)`)
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect().finally(() => process.exit(1)) })
