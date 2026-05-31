import { useState, useEffect, useCallback } from 'react'
import * as api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { lireVaultLocal, ecrireVaultLocal } from '../utils/vaultLocal'

// ─────────────────────────────────────────────────────────────────────────────
// useVault — coffre à double mode :
//   • déconnecté → localStorage (coffre anonyme, essayable sans compte)
//   • connecté   → API /api/vault (persisté en base, scopé au compte)
// Interface stable : { entries, loading, addEntry, removeEntry }.
// ─────────────────────────────────────────────────────────────────────────────

export function useVault() {
  const { user, loading: authLoading, vaultVersion } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    if (authLoading) return Promise.resolve()
    if (user) {
      setLoading(true)
      return api.fetchVault().then(setEntries).catch(() => setEntries([])).finally(() => setLoading(false))
    }
    setEntries(lireVaultLocal())
    setLoading(false)
    return Promise.resolve()
  }, [user, authLoading, vaultVersion])

  useEffect(() => { reload() }, [reload])

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
