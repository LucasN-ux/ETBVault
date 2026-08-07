import { useState, useEffect, useCallback } from 'react'
import * as api from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { lireVaultLocal, ecrireVaultLocal } from '../utils/vaultLocal'

// ─────────────────────────────────────────────────────────────────────────────
// useVault — coffre à double mode :
//   • déconnecté → localStorage (coffre anonyme, essayable sans compte)
//   • connecté   → API /api/vault (persisté en base, scopé au compte)
// Interface stable : { entries, loading, addEntry, removeEntry }.
// ─────────────────────────────────────────────────────────────────────────────

export function useVault() {
  const { user, loading: authLoading, vaultVersion } = useAuth()
  // Le coffre local est lisible immédiatement : on en part comme état initial
  // plutôt que de le poser depuis un effet.
  const [entriesCompte, setEntriesCompte] = useState(null)
  const [entriesLocales, setEntriesLocales] = useState(lireVaultLocal)
  const [chargementCompte, setChargementCompte] = useState(false)

  const entries = user ? (entriesCompte ?? []) : entriesLocales
  const loading = authLoading || (user ? entriesCompte === null || chargementCompte : false)

  const reload = useCallback(() => {
    if (authLoading) return Promise.resolve()
    if (!user) {
      setEntriesLocales(lireVaultLocal())
      return Promise.resolve()
    }
    setChargementCompte(true)
    return api
      .fetchVault()
      .then(setEntriesCompte)
      .catch(() => setEntriesCompte([]))
      .finally(() => setChargementCompte(false))
    // `vaultVersion` n'est pas lu dans le corps : c'est un compteur que la
    // fusion du coffre local incrémente pour forcer un rechargement. Le retirer
    // casserait la reprise des positions locales à la connexion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, vaultVersion])

  useEffect(() => {
    // `reload` marque le chargement de façon synchrone, et c'est voulu : sans
    // ça, le coffre du compte s'afficherait vide le temps de la requête, comme
    // si l'utilisateur n'avait aucune position.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload()
  }, [reload])

  const setEntries = user ? setEntriesCompte : setEntriesLocales

  async function addEntry({ etbId, prixAchat, quantite, dateAchat }) {
    const base = {
      etbId,
      prixAchat: parseFloat(prixAchat),
      quantite: parseInt(quantite) || 1,
      dateAchat: dateAchat ?? new Date().toISOString().split('T')[0],
    }
    if (user) {
      const entry = await api.addVaultEntry(base)
      setEntries((prev) => [entry, ...prev])
    } else {
      const entry = { id: Date.now(), ...base }
      setEntries((prev) => {
        const next = [entry, ...prev]
        ecrireVaultLocal(next)
        return next
      })
    }
  }

  async function removeEntry(id) {
    if (user) {
      await api.removeVaultEntry(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
    } else {
      setEntries((prev) => {
        const next = prev.filter((e) => e.id !== id)
        ecrireVaultLocal(next)
        return next
      })
    }
  }

  return { entries, loading, addEntry, removeEntry, reload }
}
