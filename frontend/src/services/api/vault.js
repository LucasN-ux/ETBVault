import { appelApi } from './client'

// Coffre persisté en base. Le coffre anonyme (localStorage) est géré par
// utils/vaultLocal.js — useVault choisit l'un ou l'autre selon la session.

export function fetchVault() {
  return appelApi('/vault', { auth: true })
}

export function addVaultEntry(position) {
  return appelApi('/vault', { methode: 'POST', corps: position, auth: true })
}

export function removeVaultEntry(id) {
  return appelApi(`/vault/${id}`, { methode: 'DELETE', auth: true })
}
