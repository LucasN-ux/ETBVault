import { Router } from 'express'
import prisma from '../db/client'
import { requireAdmin } from '../middleware/auth'

// Routes d'administration : toutes réservées au rôle ADMIN.
const router = Router()
router.use(requireAdmin)

// POST /api/admin/refresh — relance les mises à jour de prix ETB (CM) + cartes (TCGdex)
router.post('/refresh', async (_req, res) => {
  const { mettreAJourPrixDepuisCM } = await import('../services/cm-download')
  const { mettreAJourPrixCartes } = await import('../cron/prix-cartes')
  try {
    console.log('[admin/refresh] Lancement mise à jour ETB...')
    const { ok, sans_prix } = await mettreAJourPrixDepuisCM()
    console.log('[admin/refresh] Lancement mise à jour cartes...')
    await mettreAJourPrixCartes()
    res.json({ success: true, etbMisAJour: ok, etbSansPrix: sans_prix })
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erreur' })
  }
})

// GET /api/admin/users — liste des comptes (pour le panel admin)
router.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json(users)
})

export default router
