import type { UtilisateurAdmin } from '../../types/domaine'
import { appelApi } from './client'

// Réservé au rôle ADMIN — le backend rejette les autres en 403.

export function fetchUsers(): Promise<UtilisateurAdmin[]> {
  return appelApi<UtilisateurAdmin[]>('/admin/users', { auth: true })
}

export interface ResultatRefresh {
  success: boolean
  etbMisAJour: number
  etbSansPrix: number
}

/** Relance la collecte des prix (Cardmarket puis TCGdex). Peut durer. */
export function adminRefresh(): Promise<ResultatRefresh> {
  return appelApi<ResultatRefresh>('/admin/refresh', { methode: 'POST', auth: true })
}
