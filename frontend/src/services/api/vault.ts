import type { NouvellePosition, PositionCoffre } from '../../types/domaine'
import { appelApi } from './client'

// Coffre persisté en base. Le coffre anonyme (localStorage) est géré par
// utils/vaultLocal.ts — useVault choisit l'un ou l'autre selon la session.

export function fetchVault(): Promise<PositionCoffre[]> {
  return appelApi<PositionCoffre[]>('/vault', { auth: true })
}

export function addVaultEntry(position: NouvellePosition): Promise<PositionCoffre> {
  return appelApi<PositionCoffre>('/vault', { methode: 'POST', corps: position, auth: true })
}

export function removeVaultEntry(id: number): Promise<{ success: true }> {
  return appelApi<{ success: true }>(`/vault/${id}`, { methode: 'DELETE', auth: true })
}
