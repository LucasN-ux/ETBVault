import { Router } from 'express'
import { introuvable } from '../lib/erreurs'
import { routeAsync } from '../lib/route-async'
import { exigerIdEtb } from '../lib/validation'
import * as repo from '../repositories/etbs.repo'
import { cartesDuSet } from '../services/cartes'

const router = Router()

// GET /api/etbs — catalogue complet, de la plus récente à la plus ancienne
router.get(
  '/',
  routeAsync(async (_req, res) => {
    res.json(await repo.listerEtbs())
  }),
)

// GET /api/etbs/:id
router.get(
  '/:id',
  routeAsync(async (req, res) => {
    const id = exigerIdEtb(req.params['id'])
    const etb = await repo.trouverEtb(id)
    if (!etb) throw introuvable('ETB non trouvée')
    res.json(etb)
  }),
)

// GET /api/etbs/:id/cartes — cartes du set, mises en cache au premier appel
router.get(
  '/:id/cartes',
  routeAsync(async (req, res) => {
    const id = exigerIdEtb(req.params['id'])
    const etb = await repo.trouverEtb(id)
    if (!etb) throw introuvable('ETB non trouvée')
    res.json(await cartesDuSet(etb.id, etb.setId))
  }),
)

export default router
