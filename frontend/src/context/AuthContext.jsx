import { createContext, useContext, useEffect, useState } from 'react'
import * as api from '../services/api'
import { lireVaultLocal, viderVaultLocal } from '../utils/vaultLocal'

// Contexte d'authentification : token JWT en localStorage, profil restauré au chargement.
// Gère aussi la fusion du coffre anonyme (localStorage) vers le compte à la connexion.
const AuthContext = createContext(null)

async function importerLocalesVersCompte(locales) {
  for (const e of locales) {
    await api.addVaultEntry({ etbId: e.etbId, prixAchat: e.prixAchat, quantite: e.quantite, dateAchat: e.dateAchat }).catch(() => {})
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingImport, setPendingImport] = useState(0) // nb de positions locales en attente de confirmation
  const [vaultVersion, setVaultVersion] = useState(0)   // bump → force le rechargement du coffre

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

  // Stratégie C : compte vide → import auto silencieux ; compte déjà rempli → on propose.
  async function fusionnerCoffreLocal() {
    const locales = lireVaultLocal()
    if (!locales.length) return
    const compte = await api.fetchVault().catch(() => null)
    if (compte === null) return
    if (compte.length === 0) {
      await importerLocalesVersCompte(locales)
      viderVaultLocal()
      setVaultVersion((v) => v + 1)
    } else {
      setPendingImport(locales.length)
    }
  }

  async function login(email, motDePasse) {
    const { token, user } = await api.login(email, motDePasse)
    api.setToken(token)
    await fusionnerCoffreLocal()
    setUser(user)
    return user
  }

  async function register(email, motDePasse) {
    const { token, user } = await api.register(email, motDePasse)
    api.setToken(token)
    await fusionnerCoffreLocal()
    setUser(user)
    return user
  }

  function logout() {
    api.setToken(null)
    setUser(null)
    setPendingImport(0)
  }

  // Confirmation / refus de l'import quand le compte avait déjà des positions.
  async function confirmImport() {
    await importerLocalesVersCompte(lireVaultLocal())
    viderVaultLocal()
    setPendingImport(0)
    setVaultVersion((v) => v + 1)
  }
  function dismissImport() {
    setPendingImport(0) // on garde le coffre local intact
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, pendingImport, confirmImport, dismissImport, vaultVersion }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
