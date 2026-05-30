import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Auth maison : hachage bcrypt des mots de passe + JWT signés.
// Le secret est lu au moment de signer/vérifier (pas à l'import) pour ne pas
// faire planter les contextes qui n'en ont pas besoin (seed, cron).

const COST = 12
const EXPIRATION = '7d'

export type Role = 'USER' | 'ADMIN'
export interface JwtPayload {
  sub: string // id utilisateur
  role: Role
}

function getSecret(): string {
  const s = process.env['JWT_SECRET']
  if (!s) throw new Error('JWT_SECRET manquant dans .env')
  return s
}

export function hashPassword(motDePasse: string): Promise<string> {
  return bcrypt.hash(motDePasse, COST)
}

export function verifyPassword(motDePasse: string, hash: string): Promise<boolean> {
  return bcrypt.compare(motDePasse, hash)
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: EXPIRATION })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret())
    if (typeof decoded !== 'object' || decoded === null) return null
    const { sub, role } = decoded as Record<string, unknown>
    if (typeof sub !== 'string' || (role !== 'USER' && role !== 'ADMIN')) return null
    return { sub, role }
  } catch {
    return null
  }
}
