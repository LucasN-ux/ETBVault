import 'dotenv/config'
import { fetchCmJson } from '../services/cm-session'

// Découverte : télécharge le catalogue CM non-singles et liste les catégories
// (idCategory → nb de produits Pokémon + exemples de noms), pour décider du
// mapping catégorie CM → ProduitType. Usage : npm run cm:categories

const CM_PRODUCTS_URL = 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_6.json'

interface CmProduct {
  idProduct: number
  name: string
  idCategory: number
  categoryName?: string
  idExpansion?: number
  expansionName?: string
}

async function main(): Promise<void> {
  const data = await fetchCmJson<Record<string, unknown>>(CM_PRODUCTS_URL)
  console.log('[cm-categories] clés racine :', Object.keys(data))

  const products = (data['products'] as CmProduct[] | undefined) ?? []
  console.log(`[cm-categories] ${products.length} produits non-singles`)
  if (products[0]) console.log('[cm-categories] exemple de produit :', JSON.stringify(products[0]))

  const parCategorie = new Map<string, { count: number; exemples: string[] }>()
  for (const p of products) {
    const key = `${p.idCategory}${p.categoryName ? ' · ' + p.categoryName : ''}`
    const e = parCategorie.get(key) ?? { count: 0, exemples: [] }
    e.count++
    if (e.exemples.length < 3) e.exemples.push(p.name)
    parCategorie.set(key, e)
  }

  console.log('\n=== Catégories (idCategory · nom) → nb produits ===')
  for (const [key, { count, exemples }] of [...parCategorie.entries()].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`\n[${key}] — ${count} produits`)
    console.log('   ex:', exemples.join(' | '))
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
