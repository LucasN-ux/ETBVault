import { useContext } from 'react'
import { AuthContext } from '../context/authContexte'

// Dans son propre fichier : un module qui exporte à la fois un composant et un
// hook casse le Fast Refresh de Vite.
export function useAuth() {
  const contexte = useContext(AuthContext)
  if (!contexte) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return contexte
}
