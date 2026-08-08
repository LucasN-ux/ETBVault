import type { UtilisateurAdmin } from '../../types/domaine'
import { appelApi } from './client'

// Réservé au rôle ADMIN — le backend rejette les autres en 403.

export function fetchUsers(): Promise<UtilisateurAdmin[]> {
  return appelApi<UtilisateurAdmin[]>('/admin/users', { auth: true })
}
