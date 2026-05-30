import { Router, type Request, type Response } from 'express'
import type { ProduitType } from '@prisma/client'
import prisma from '../db/client'

const router = Router()

const TYPES_PRODUIT = ['ETB', 'DISPLAY', 'BOOSTER', 'COFFRET', 'PREMIUM', 'TIN', 'BLISTER', 'AUTRE']

// Validation : un ID ETB ne contient que des lettres, chiffres, points et tirets
function etbIdValide(id: unknown): id is string {
  return typeof id === 'string' && /^[a-z0-9.\-]+$/i.test(id)
}

// GET /api/produits (alias /api/etbs) — filtrable par ?type=ETB|DISPLAY|...
router.get('/', async (req: Request, res: Response) => {
  try {
    const t = typeof req.query['type'] === 'string' ? req.query['type'].toUpperCase() : null
    const where = t && TYPES_PRODUIT.includes(t) ? { type: t as ProduitType } : {}
    const produits = await prisma.produit.findMany({ where, orderBy: { dateSortie: 'desc' } })
    res.json(produits)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
})

// GET /api/etbs/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  if (!etbIdValide(id)) {
    res.status(400).json({ error: 'Identifiant ETB invalide' })
    return
  }
  try {
    const etb = await prisma.produit.findUnique({ where: { id } })
    if (!etb) {
      res.status(404).json({ error: 'ETB non trouvée' })
      return
    }
    res.json(etb)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
})

// GET /api/etbs/:id/cartes — cartes du set (cache auto en base)
router.get('/:id/cartes', async (req: Request, res: Response) => {
  const { id } = req.params
  if (!etbIdValide(id)) {
    res.status(400).json({ error: 'Identifiant ETB invalide' })
    return
  }
  try {
    const cartesEnCache = await prisma.carte.findMany({
      where: { produitId: id },
      orderBy: { prixMarche: 'desc' },
    })
    if (cartesEnCache.length > 0) {
      res.json(cartesEnCache)
      return
    }

    const etb = await prisma.produit.findUnique({ where: { id } })
    if (!etb) {
      res.status(404).json({ error: 'ETB non trouvée' })
      return
    }

    // Récupérer la liste du set depuis TCGdex
    const setResponse = await fetch(`https://api.tcgdex.net/v2/fr/sets/${etb.setId}`)
    if (!setResponse.ok) {
      res.json([])
      return
    }
    const setData = await setResponse.json() as { cards?: Array<{ id: string }> }
    const cardsBasic = setData.cards ?? []
    if (cardsBasic.length === 0) {
      res.json([])
      return
    }

    // Fetch les détails par lots de 50 en parallèle
    interface TCGdexCard {
      id: string
      name: string
      localId: string
      image?: string
      rarity?: string
      pricing?: { cardmarket?: { avg?: number } }
    }
    const cartesDetaillees: TCGdexCard[] = []
    const batchSize = 50
    for (let i = 0; i < cardsBasic.length; i += batchSize) {
      const batch = cardsBasic.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map((c) =>
          fetch(`https://api.tcgdex.net/v2/fr/cards/${c.id}`)
            .then((r) => r.json() as Promise<TCGdexCard>)
            .catch(() => null)
        )
      )
      cartesDetaillees.push(...(results.filter(Boolean) as TCGdexCard[]))
    }

    await prisma.carte.createMany({
      data: cartesDetaillees.map((carte) => ({
        id: carte.id,
        produitId: id,
        nom: carte.name,
        numero: carte.localId,
        imageUrl: carte.image ? `${carte.image}/high.webp` : null,
        rarete: carte.rarity ?? null,
        prixMarche: carte.pricing?.cardmarket?.avg ?? null,
      })),
      skipDuplicates: true,
    })

    const cartes = await prisma.carte.findMany({
      where: { produitId: id },
      orderBy: { prixMarche: 'desc' },
    })
    res.json(cartes)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
})

export default router
