import { appelApi } from './client'

// Réservé au rôle ADMIN — le backend rejette les autres en 403.

export function fetchUsers() {
  return appelApi('/admin/users', { auth: true })
}

/** Relance la collecte des prix (Cardmarket puis TCGdex). Peut durer. */
export function adminRefresh() {
  return appelApi('/admin/refresh', { methode: 'POST', auth: true })
}
