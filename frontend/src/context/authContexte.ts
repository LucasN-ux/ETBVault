import { createContext } from 'react'
import type { Utilisateur } from '../types/domaine'

// Dans son propre fichier : un module qui exporte un composant et autre chose
// casse le Fast Refresh de Vite. Le provider est dans AuthContext.tsx, le hook
// de consommation dans hooks/useAuth.ts.

export interface Auth {
  user: Utilisateur | null
  loading: boolean
  login: (email: string, motDePasse: string) => Promise<Utilisateur>
  register: (email: string, motDePasse: string) => Promise<Utilisateur>
  logout: () => void
  /** Nombre de positions locales en attente de confirmation d'import. */
  pendingImport: number
  confirmImport: () => Promise<void>
  dismissImport: () => void
  /** Compteur : incrémenté après une fusion pour forcer le rechargement du coffre. */
  vaultVersion: number
}

export const AuthContext = createContext<Auth | null>(null)
