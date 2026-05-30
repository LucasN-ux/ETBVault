import { Router, type Request, type Response } from 'express'
import prisma from '../db/client'
import { detecterMouvement } from '../services/mouvement'

// mergeParams permet d'accéder à :id défini dans app.ts
const router = Router({ mergeParams: true })

function etbIdValide(id: unknown): id is string {
  return typeof id === 'string' && /^[a-z0-9.\-]+$/i.test(id)
}

function dateValide(d: unknown): d is string {
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
}

function prixValide(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v) && v >= 0
}

// GET /api/etbs/:id/prix — historique des prix
router.get('/', async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  if (!etbIdValide(id)) {
    res.status(400).json({ error: 'Identifiant ETB invalide' })
    return
  }
  try {
    const historique = await prisma.prixHistorique.findMany({
      where: { produitId: id },
      orderBy: { date: 'asc' },
    })
    res.json(historique)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
})

// POST /api/etbs/:id/prix — ajoute un point de prix (usage interne/cron)
router.post('/', async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  if (!etbIdValide(id)) {
    res.status(400).json({ error: 'Identifiant ETB invalide' })
    return
  }

  const { date, cmPrixMoyen, cmPrixBas, cmNbAnnonces, ebayPrixMoyen, origine } = req.body as Record<string, unknown>

  if (!dateValide(date)) {
    res.status(400).json({ error: 'Champ date invalide (format YYYY-MM-DD attendu)' })
    return
  }
  if (origine !== undefined && origine !== 'collecte' && origine !== 'import_cm') {
    res.status(400).json({ error: "origine doit valoir 'collecte' ou 'import_cm'" })
    return
  }
  if (cmPrixMoyen !== undefined && !prixValide(cmPrixMoyen)) {
    res.status(400).json({ error: 'cmPrixMoyen doit être un nombre positif' })
    return
  }
  if (cmPrixBas !== undefined && !prixValide(cmPrixBas)) {
    res.status(400).json({ error: 'cmPrixBas doit être un nombre positif' })
    return
  }
  if (cmNbAnnonces !== undefined && (typeof cmNbAnnonces !== 'number' || !Number.isInteger(cmNbAnnonces) || cmNbAnnonces < 0)) {
    res.status(400).json({ error: 'cmNbAnnonces doit être un entier positif' })
    return
  }

  try {
    const etb = await prisma.produit.findUnique({ where: { id } })
    if (!etb) {
      res.status(404).json({ error: 'ETB non trouvée' })
      return
    }

    // On ne passe que les champs fournis — null explicite pour mettre à zéro
    const champsOptionnels = {
      ...(cmPrixMoyen !== undefined && { cmPrixMoyen: cmPrixMoyen as number }),
      ...(cmPrixBas !== undefined && { cmPrixBas: cmPrixBas as number }),
      ...(cmNbAnnonces !== undefined && { cmNbAnnonces: cmNbAnnonces as number }),
      ...(ebayPrixMoyen !== undefined && { ebayPrixMoyen: ebayPrixMoyen as number }),
      ...(origine !== undefined && { origine: origine as string }),
    }
    const entry = await prisma.prixHistorique.upsert({
      where: { produitId_date: { produitId: id, date: new Date(date) } },
      update: champsOptionnels,
      create: { produitId: id, date: new Date(date), ...champsOptionnels },
    })
    res.json(entry)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
})

// GET /api/etbs/:id/prix/latest — dernier point de prix connu
router.get('/latest', async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  if (!etbIdValide(id)) {
    res.status(400).json({ error: 'Identifiant ETB invalide' })
    return
  }
  try {
    const dernier = await prisma.prixHistorique.findFirst({
      where: { produitId: id, cmPrixMoyen: { not: null } },
      orderBy: { date: 'desc' },
    })
    if (!dernier) {
      res.status(404).json({ error: 'Aucun prix disponible' })
      return
    }
    res.json(dernier)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
})

// GET /api/etbs/:id/prix/mouvement — détecte les mouvements de prix (court/long terme),
// adaptés à la volatilité propre de l'ETB. Remplace l'ancien score d'investissement.
router.get('/mouvement', async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
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

    // Tout l'historique de prix (collecte + import), pour calculer la volatilité propre
    const historique = await prisma.prixHistorique.findMany({
      where: { produitId: id, cmPrixMoyen: { not: null } },
      orderBy: { date: 'asc' },
      select: { date: true, cmPrixMoyen: true },
    })

    const resultat = detecterMouvement(historique)
    res.json({ produitId: id, ...resultat })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
})

export default router
