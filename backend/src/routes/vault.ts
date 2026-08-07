import { Router } from 'express'
import type { VaultEntry } from '@prisma/client'
import prisma from '../db/client'
import { aujourdhuiUtc, jourUtc } from '../lib/dates'
import { introuvable, requeteInvalide } from '../lib/erreurs'
import { routeAsync } from '../lib/route-async'
import { exigerIdEtb } from '../lib/validation'
import * as etbsRepo from '../repositories/etbs.repo'
import { requireAuth } from '../middleware/auth'

// Coffre : toutes les routes exigent un login et sont scopées à req.user.id.
const router = Router()
router.use(requireAuth)

// Le front parle en nombres et en dates ISO ; Prisma en Decimal et en Date.
function serialiser(e: VaultEntry) {
  return {
    id: e.id,
    etbId: e.etbId,
    prixAchat: Number(e.prixAchat),
    quantite: e.quantite,
    dateAchat: e.dateAchat.toISOString().split('T')[0]!,
  }
}

// GET /api/vault — positions de l'utilisateur
router.get(
  '/',
  routeAsync(async (req, res) => {
    const positions = await prisma.vaultEntry.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    })
    res.json(positions.map(serialiser))
  }),
)

// POST /api/vault — ajoute une position
router.post(
  '/',
  routeAsync(async (req, res) => {
    const corps = req.body as Record<string, unknown>

    const etbId = exigerIdEtb(corps['etbId'])
    const prixAchat = Number(corps['prixAchat'])
    if (!Number.isFinite(prixAchat) || prixAchat <= 0) {
      throw requeteInvalide('prixAchat doit être un nombre strictement positif')
    }
    const quantite = Math.max(1, Math.floor(Number(corps['quantite']) || 1))
    const dateAchat = corps['dateAchat'] === undefined
      ? aujourdhuiUtc()
      : jourUtc(String(corps['dateAchat']).slice(0, 10))

    if (!(await etbsRepo.trouverEtb(etbId))) throw introuvable('ETB inconnue')

    const position = await prisma.vaultEntry.create({
      data: { userId: req.user!.id, etbId, prixAchat, quantite, dateAchat },
    })
    res.status(201).json(serialiser(position))
  }),
)

// DELETE /api/vault/:id — retire une position de l'utilisateur
router.delete(
  '/:id',
  routeAsync(async (req, res) => {
    const id = Number(req.params['id'])
    if (!Number.isInteger(id)) throw requeteInvalide('id invalide')

    const position = await prisma.vaultEntry.findUnique({ where: { id } })
    // Même réponse qu'une position inexistante : on ne révèle pas l'existence
    // d'une position appartenant à quelqu'un d'autre.
    if (!position || position.userId !== req.user!.id) throw introuvable('Position introuvable')

    await prisma.vaultEntry.delete({ where: { id } })
    res.json({ success: true })
  }),
)

export default router
