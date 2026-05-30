import type { ProduitType } from '@prisma/client'
import prisma from '../db/client'
import { fetchCmJson } from './cm-session'
import { ETB_PRODUCT_IDS } from './cm-products'
import { infererEre } from './cm-eres'

// Ingestion du catalogue produits scellés depuis l'export officiel CM
// (products_nonsingles_6.json), filtré aux catégories retenues et mappé vers ProduitType.
// Les ETB déjà curés (cm-products.ts) sont ignorés pour éviter les doublons.

const CM_PRODUCTS_URL = 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_6.json'

interface CmProduct {
  idProduct: number
  name: string
  idCategory: number
  idExpansion?: number
}

// Catégories CM retenues → type (1015 « Box Set » est traité à part).
const CATEGORIE_TYPE: Record<number, ProduitType> = {
  1016: 'ETB',
  53: 'DISPLAY',
  52: 'BOOSTER',
  1014: 'TIN',
  1083: 'BLISTER',
}

function typePourProduit(p: CmProduct): ProduitType | null {
  if (p.idCategory === 1015) return /premium collection/i.test(p.name) ? 'PREMIUM' : 'COFFRET'
  return CATEGORIE_TYPE[p.idCategory] ?? null
}

function* chunks<T>(arr: T[], taille: number): Generator<T[]> {
  for (let i = 0; i < arr.length; i += taille) yield arr.slice(i, i + taille)
}

export async function ingererCatalogueCM(): Promise<{ total: number; retenus: number; ignoresETB: number; inseres: number }> {
  const data = await fetchCmJson<{ products?: CmProduct[] }>(CM_PRODUCTS_URL)
  const products = data.products ?? []

  // idProduct déjà couverts par les ETB curés existants → on ne recrée pas.
  const dejaCouverts = new Set<number>(Object.values(ETB_PRODUCT_IDS).flat())

  const records: Array<{ id: string; nom: string; type: ProduitType; era: string | null; cmIdProducts: number[] }> = []
  let ignoresETB = 0
  for (const p of products) {
    const type = typePourProduit(p)
    if (!type) continue // catégorie non retenue
    if (dejaCouverts.has(p.idProduct)) { ignoresETB++; continue }
    records.push({ id: `cm-${p.idProduct}`, nom: p.name, type, era: infererEre(p.name), cmIdProducts: [p.idProduct] })
  }

  let inseres = 0
  for (const chunk of chunks(records, 500)) {
    const res = await prisma.produit.createMany({ data: chunk, skipDuplicates: true })
    inseres += res.count
  }

  return { total: products.length, retenus: records.length, ignoresETB, inseres }
}
