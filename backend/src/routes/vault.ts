import { Router } from 'express'
import type { VaultEntry } from '@prisma/client'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'

// Coffre-fort : toutes les routes exigent un login et sont scopées à req.user.id.
const router = Router()
router.use(requireAuth)

function serialize(e: VaultEntry) {
  return {
    id: e.id,
    etbId: e.etbId,
    prixAchat: Number(e.prixAchat),
    quantite: e.quantite,
    dateAchat: e.dateAchat.toISOString().split('T')[0]!,
  }
}

// GET /api/vault — positions de l'utilisateur
router.get('/', async (req, res) => {
  const entries = await prisma.vaultEntry.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  })
  res.json(entries.map(serialize))
})

// POST /api/vault — ajoute une position
router.post('/', async (req, res) => {
  const etbId = String(req.body?.etbId ?? '')
  const prixAchat = Number(req.body?.prixAchat)
  const quantite = Math.max(1, Math.floor(Number(req.body?.quantite) || 1))
  const dateAchat = req.body?.dateAchat ? new Date(String(req.body.dateAchat)) : new Date()
  if (!etbId || !(prixAchat > 0)) {
    res.status(400).json({ error: 'etbId et prixAchat (> 0) requis' })
    return
  }
  const etb = await prisma.etb.findUnique({ where: { id: etbId } })
  if (!etb) {
    res.status(404).json({ error: 'ETB inconnue' })
    return
  }
  const entry = await prisma.vaultEntry.create({
    data: { userId: req.user!.id, etbId, prixAchat, quantite, dateAchat },
  })
  res.status(201).json(serialize(entry))
})

// DELETE /api/vault/:id — retire une position (si elle appartient à l'utilisateur)
router.delete('/:id', async (req, res) => {
  const id = Number(req.params['id'])
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'id invalide' })
    return
  }
  const entry = await prisma.vaultEntry.findUnique({ where: { id } })
  if (!entry || entry.userId !== req.user!.id) {
    res.status(404).json({ error: 'Position introuvable' })
    return
  }
  await prisma.vaultEntry.delete({ where: { id } })
  res.json({ success: true })
})

export default router
