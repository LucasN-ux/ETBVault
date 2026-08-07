import { useEffect, useState, type ReactNode } from 'react'
import * as api from '../services/api'
import { lireVaultLocal, viderVaultLocal } from '../utils/vaultLocal'
import type { PositionCoffre, Utilisateur } from '../types/domaine'
import { AuthContext } from './authContexte'

// Authentification : jeton JWT en localStorage, profil restauré au chargement.
// Gère aussi la fusion du coffre anonyme vers le compte à la connexion.
// Le hook de consommation est dans hooks/useAuth.ts.

async function importerLocalesVersCompte(locales: readonly PositionCoffre[]): Promise<void> {
  for (const e of locales) {
    await api.addVaultEntry({ etbId: e.etbId, prixAchat: e.prixAchat, quantite: e.quantite, dateAchat: e.dateAchat }).catch(() => {})
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Utilisateur | null>(null)
  // Sans jeton il n'y a rien à restaurer : on démarre directement « chargé »,
  // plutôt que de repasser loading à false depuis l'effet.
  const [loading, setLoading] = useState(() => Boolean(api.lireJeton()))
  const [pendingImport, setPendingImport] = useState(0) // nb de positions locales en attente de confirmation
  const [vaultVersion, setVaultVersion] = useState(0)   // bump → force le rechargement du coffre

  // Restaure la session si un jeton est présent. Un jeton refusé (401) est
  // effacé ; une panne réseau ne l'est pas, sinon un backend momentanément
  // absent déconnecterait l'utilisateur pour de bon.
  useEffect(() => {
    if (!api.lireJeton()) return
    api.fetchMe()
      .then((d) => setUser(d.user))
      .catch((e) => {
        if (e instanceof api.ApiError && e.estAuth) api.ecrireJeton(null)
      })
      .finally(() => setLoading(false))
  }, [])

  // Stratégie C : compte vide → import auto silencieux ; compte déjà rempli → on propose.
  async function fusionnerCoffreLocal(): Promise<void> {
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

  async function login(email: string, motDePasse: string): Promise<Utilisateur> {
    const { token, user } = await api.login(email, motDePasse)
    api.ecrireJeton(token)
    await fusionnerCoffreLocal()
    setUser(user)
    return user
  }

  async function register(email: string, motDePasse: string): Promise<Utilisateur> {
    const { token, user } = await api.register(email, motDePasse)
    api.ecrireJeton(token)
    await fusionnerCoffreLocal()
    setUser(user)
    return user
  }

  function logout() {
    api.ecrireJeton(null)
    setUser(null)
    setPendingImport(0)
  }

  // Confirmation / refus de l'import quand le compte avait déjà des positions.
  async function confirmImport(): Promise<void> {
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
