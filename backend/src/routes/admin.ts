import { Router } from 'express'
import prisma from '../db/client'
import { routeAsync } from '../lib/route-async'
import { requireAdmin } from '../middleware/auth'

// Administration : tout le routeur est réservé au rôle ADMIN.
const router = Router()
router.use(requireAdmin)

// La collecte des prix ne se déclenche pas ici. Elle vit dans routes/taches.ts,
// derrière un secret partagé, et n'est appelée que par le planificateur
// externe : rien de joignable depuis le site, même par un compte ADMIN.

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
