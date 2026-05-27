import { Router, type Request, type Response } from 'express'
import prisma from '../db/client'
import { calculerScore } from '../services/scoring'
import { scrapeCardmarket, delaiAleatoire } from '../services/scraper'

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
      where: { etbId: id },
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

  const { date, cmPrixMoyen, cmPrixBas, cmNbAnnonces, ebayPrixMoyen } = req.body as Record<string, unknown>

  if (!dateValide(date)) {
    res.status(400).json({ error: 'Champ date invalide (format YYYY-MM-DD attendu)' })
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
    const etb = await prisma.etb.findUnique({ where: { id } })
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
    }
    const entry = await prisma.prixHistorique.upsert({
      where: { etbId_date: { etbId: id, date: new Date(date) } },
      update: champsOptionnels,
      create: { etbId: id, date: new Date(date), ...champsOptionnels },
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
      where: { etbId: id, cmPrixMoyen: { not: null } },
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

// GET /api/etbs/:id/prix/score — calcule le score d'investissement
router.get('/score', async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  if (!etbIdValide(id)) {
    res.status(400).json({ error: 'Identifiant ETB invalide' })
    return
  }
  try {
    const etb = await prisma.etb.findUnique({ where: { id } })
    if (!etb) {
      res.status(404).json({ error: 'ETB non trouvée' })
      return
    }

    // Les 2 derniers points disponibles (données mensuelles)
    const historique = await prisma.prixHistorique.findMany({
      where: { etbId: id },
      orderBy: { date: 'asc' },
      take: -2,
    })

    // Valeur top-10 cartes du set
    const topCartes = await prisma.carte.findMany({
      where: { etbId: id, prixMarche: { gt: 0 } },
      orderBy: { prixMarche: 'desc' },
      take: 10,
    })
    const valeurTop10 = topCartes.reduce((s, c) => s + Number(c.prixMarche ?? 0), 0)

    const resultat = calculerScore(historique, etb.prixSortie, valeurTop10 || null)
    res.json({ etbId: id, ...resultat })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
})

// POST /api/etbs/:id/prix/refresh — déclenche un scraping immédiat (hors cron)
// Utile pour tester ou forcer une mise à jour manuelle
router.post('/refresh', async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  if (!etbIdValide(id)) {
    res.status(400).json({ error: 'Identifiant ETB invalide' })
    return
  }
  try {
    const etb = await prisma.etb.findUnique({ where: { id } })
    if (!etb) { res.status(404).json({ error: 'ETB non trouvée' }); return }
    if (!etb.cmUrl) {
      res.status(422).json({ error: 'Aucune URL Cardmarket configurée pour cette ETB' })
      return
    }

    // Délai poli avant de scraper (même en manuel)
    await delaiAleatoire(1_000, 3_000)
    const prix = await scrapeCardmarket(etb.cmUrl)

    const aujourd = new Date()
    aujourd.setHours(0, 0, 0, 0)

    const champsScrapés = {
      cmPrixBas:    prix.prixBas,
      cmPrixMoyen:  prix.prixMoyen ?? prix.prixBas,
      cmNbAnnonces: prix.nbAnnonces,
    }
    const entry = await prisma.prixHistorique.upsert({
      where: { etbId_date: { etbId: id, date: aujourd } },
      update: champsScrapés,
      create: { etbId: id, date: aujourd, ...champsScrapés },
    })

    res.json({ scraped: prix, saved: entry })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
})

export default router
