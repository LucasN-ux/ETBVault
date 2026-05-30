import { createContext, useContext, useEffect, useState } from 'react'
import * as api from '../services/api'

// Contexte d'authentification : token JWT en localStorage, profil restauré au chargement.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restaure la session si un token est présent.
  useEffect(() => {
    if (!api.getToken()) {
      setLoading(false)
      return
    }
    api.fetchMe()
      .then((d) => setUser(d.user))
      .catch(() => api.setToken(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email, motDePasse) {
    const { token, user } = await api.login(email, motDePasse)
    api.setToken(token)
    setUser(user)
    return user
  }

  async function register(email, motDePasse) {
    const { token, user } = await api.register(email, motDePasse)
    api.setToken(token)
    setUser(user)
    return user
  }

  function logout() {
    api.setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
