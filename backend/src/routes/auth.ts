import { Router } from 'express'
import prisma from '../db/client'
import { conflit, introuvable, nonAuthentifie, requeteInvalide } from '../lib/erreurs'
import { routeAsync } from '../lib/route-async'
import { hashPassword, signToken, verifyPassword, type Role } from '../lib/auth'
import { requireAuth } from '../middleware/auth'

const router = Router()

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LONGUEUR_MDP_MIN = 8

// L'email désigné dans .env reçoit le rôle ADMIN à l'inscription.
function roleParDefaut(email: string): Role {
  const admin = process.env['ADMIN_EMAIL']?.trim().toLowerCase()
  return admin && email === admin ? 'ADMIN' : 'USER'
}

function lireIdentifiants(corps: unknown): { email: string; motDePasse: string } {
  const c = (corps ?? {}) as Record<string, unknown>
  return {
    email: String(c['email'] ?? '').trim().toLowerCase(),
    motDePasse: String(c['motDePasse'] ?? c['password'] ?? ''),
  }
}

function reponseSession(token: string, user: { id: string; email: string; role: Role }) {
  return { token, user: { id: user.id, email: user.email, role: user.role } }
}

// POST /api/auth/register
router.post(
  '/register',
  routeAsync(async (req, res) => {
    const { email, motDePasse } = lireIdentifiants(req.body)
    if (!EMAIL.test(email)) throw requeteInvalide('Email invalide')
    if (motDePasse.length < LONGUEUR_MDP_MIN) {
      throw requeteInvalide(`Mot de passe trop court (${LONGUEUR_MDP_MIN} caractères minimum)`)
    }
    if (await prisma.user.findUnique({ where: { email } })) {
      throw conflit('Email déjà utilisé')
    }

    const user = await prisma.user.create({
      data: {
        email,
        motDePasseHash: await hashPassword(motDePasse),
        role: roleParDefaut(email),
      },
    })
    res.status(201).json(reponseSession(signToken({ sub: user.id, role: user.role }), user))
  }),
)

// POST /api/auth/login
router.post(
  '/login',
  routeAsync(async (req, res) => {
    const { email, motDePasse } = lireIdentifiants(req.body)
    const user = await prisma.user.findUnique({ where: { email } })
    // Message identique que l'email soit inconnu ou le mot de passe faux :
    // sinon la route devient un oracle d'existence de comptes.
    if (!user || !(await verifyPassword(motDePasse, user.motDePasseHash))) {
      throw nonAuthentifie('Identifiants incorrects')
    }
    res.json(reponseSession(signToken({ sub: user.id, role: user.role }), user))
  }),
)

// GET /api/auth/me — profil de l'utilisateur connecté
router.get(
  '/me',
  requireAuth,
  routeAsync(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) throw introuvable('Utilisateur introuvable')
    res.json({ user: { id: user.id, email: user.email, role: user.role } })
  }),
)

export default router
