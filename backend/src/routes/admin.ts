import { Router } from 'express'
import prisma from '../db/client'
import { routeAsync } from '../lib/route-async'
import { requireAdmin } from '../middleware/auth'
import { mettreAJourPrixCartes } from '../cron/prix-cartes'
import { mettreAJourPrixDepuisCM } from '../services/cm-download'

// Administration : tout le routeur est réservé au rôle ADMIN.
const router = Router()
router.use(requireAdmin)

// POST /api/admin/refresh — relance la collecte des prix ETB puis cartes
router.post(
  '/refresh',
  routeAsync(async (_req, res) => {
    console.log('[admin] Rafraîchissement des prix ETB...')
    const { ok, sans_prix } = await mettreAJourPrixDepuisCM()
    console.log('[admin] Rafraîchissement des prix cartes...')
    await mettreAJourPrixCartes()
    res.json({ success: true, etbMisAJour: ok, etbSansPrix: sans_prix })
  }),
)

// GET /api/admin/users — liste des comptes
router.get(
  '/users',
  routeAsync(async (_req, res) => {
    res.json(
      await prisma.user.findMany({
        select: { id: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    )
  }),
)

export default router
