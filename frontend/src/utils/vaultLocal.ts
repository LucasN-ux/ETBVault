import type { PositionCoffre } from '../types/domaine'

// Coffre anonyme : stockage local, utilisé tant que l'utilisateur n'est pas
// connecté. À la connexion, ces positions sont fusionnées vers le compte
// (cf. context/AuthContext.tsx).

const CLE = 'etbvault_vault'

export function lireVaultLocal(): PositionCoffre[] {
  try {
    const brut: unknown = JSON.parse(localStorage.getItem(CLE) ?? '[]')
    // Le localStorage est modifiable par l'utilisateur : on ne fait pas
    // confiance à sa forme, on écarte tout ce qui n'est pas un tableau.
    return Array.isArray(brut) ? (brut as PositionCoffre[]) : []
  } catch {
    return []
  }
}

export function ecrireVaultLocal(positions: PositionCoffre[]): void {
  localStorage.setItem(CLE, JSON.stringify(positions))
}

export function viderVaultLocal(): void {
  localStorage.removeItem(CLE)
}
