import { createContext } from 'react'

// Dans son propre fichier : un module qui exporte un composant et autre chose
// casse le Fast Refresh de Vite. Le provider est dans AuthContext.jsx, le hook
// de consommation dans hooks/useAuth.js.
export const AuthContext = createContext(null)
