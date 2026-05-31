import 'dotenv/config'
import prisma from './client'
import { fetchCmJson } from '../services/cm-session'

// Propage le logo de set (TCGdex) aux produits sans image, via l'extension CM :
// les produits d'une même extension partagent le visuel du set. Usage : npm run enrich:images

const CM_PRODUCTS_URL = 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_6.json'

interface CmProduct { idProduct: number; idExpansion?: number }

async function main(): Promise<void> {
  const data = await fetchCmJson<{ products?: CmProduct[] }>(CM_PRODUCTS_URL)
  const expParId = new Map<number, number>()
  for (const p of data.products ?? []) if (p.idExpansion) expParId.set(p.idProduct, p.idExpansion)

  const produits = await prisma.produit.findMany({ select: { id: true, imageUrl: true, boxImageUrl: true, cmIdProducts: true } })

  // Logo connu par extension (depuis les produits déjà appariés à un set)
  const logoParExp = new Map<number, string>()
  const expDuProduit = new Map<string, number>()
  for (const p of produits) {
    const idp = p.cmIdProducts[0]
    const e = idp ? expParId.get(idp) : undefined
    if (!e) continue
    expDuProduit.set(p.id, e)
    if (p.imageUrl && !logoParExp.has(e)) logoParExp.set(e, p.imageUrl)
  }

  let n = 0
  for (const p of produits) {
    if (p.imageUrl || p.boxImageUrl) continue
    const e = expDuProduit.get(p.id)
    const logo = e ? logoParExp.get(e) : undefined
    if (!logo) continue
    await prisma.produit.update({ where: { id: p.id }, data: { imageUrl: logo } })
    n++
  }
  console.log(`[enrich:images] logo propagé sur ${n} produits`)
  const sans = await prisma.produit.count({ where: { AND: [{ imageUrl: null }, { boxImageUrl: null }] } })
  console.log(`[enrich:images] reste ${sans} produits sans image`)
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect().finally(() => process.exit(1)) })
