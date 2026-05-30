import { Router } from 'express'
import prisma from '../db/client'
import { hashPassword, verifyPassword, signToken, type Role } from '../lib/auth'
import { requireAuth } from '../middleware/auth'

const router = Router()

function emailValide(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

// L'email admin (.env) reçoit automatiquement le rôle ADMIN à l'inscription.
function roleParDefaut(email: string): Role {
  const admin = process.env['ADMIN_EMAIL']?.trim().toLowerCase()
  return admin && email === admin ? 'ADMIN' : 'USER'
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const motDePasse = String(req.body?.motDePasse ?? req.body?.password ?? '')
  if (!emailValide(email)) {
    res.status(400).json({ error: 'Email invalide' })
    return
  }
  if (motDePasse.length < 8) {
    res.status(400).json({ error: 'Mot de passe trop court (8 caractères minimum)' })
    return
  }
  const existe = await prisma.user.findUnique({ where: { email } })
  if (existe) {
    res.status(409).json({ error: 'Email déjà utilisé' })
    return
  }
  const user = await prisma.user.create({
    data: { email, motDePasseHash: await hashPassword(motDePasse), role: roleParDefaut(email) },
  })
  const token = signToken({ sub: user.id, role: user.role })
  res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } })
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const motDePasse = String(req.body?.motDePasse ?? req.body?.password ?? '')
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await verifyPassword(motDePasse, user.motDePasseHash))) {
    res.status(401).json({ error: 'Identifiants incorrects' })
    return
  }
  const token = signToken({ sub: user.id, role: user.role })
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } })
})

// GET /api/auth/me — profil de l'utilisateur connecté
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) {
    res.status(404).json({ error: 'Utilisateur introuvable' })
    return
  }
  res.json({ user: { id: user.id, email: user.email, role: user.role } })
})

export default router
