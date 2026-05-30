import type { Request, Response, NextFunction } from 'express'
import { verifyToken, type Role } from '../lib/auth'

// Étend Express.Request avec l'utilisateur authentifié.
export interface AuthUser {
  id: string
  role: Role
}
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

// Exige un JWT valide (en-tête `Authorization: Bearer <token>`).
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Non authentifié' })
    return
  }
  const payload = verifyToken(header.slice(7))
  if (!payload) {
    res.status(401).json({ error: 'Session invalide ou expirée' })
    return
  }
  req.user = { id: payload.sub, role: payload.role }
  next()
}

// Exige un utilisateur authentifié ET de rôle ADMIN.
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Accès réservé à l’administrateur' })
      return
    }
    next()
  })
}
