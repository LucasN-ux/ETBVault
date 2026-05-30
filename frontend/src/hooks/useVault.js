import { useState, useEffect, useCallback } from 'react'
import * as api from '../services/api'

// ─────────────────────────────────────────────────────────────────────────────
// useVault — coffre-fort persisté en base (compte requis).
// Les routes /api/vault exigent un JWT ; ce hook s'utilise donc dans une page
// protégée (cf. ProtectedRoute). Interface stable : { entries, loading, addEntry, removeEntry }.
// ─────────────────────────────────────────────────────────────────────────────

export function useVault() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    return api.fetchVault()
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { reload() }, [reload])

  async function addEntry({ etbId, prixAchat, quantite, dateAchat }) {
    const entry = await api.addVaultEntry({
      etbId,
      prixAchat: parseFloat(prixAchat),
      quantite: parseInt(quantite) || 1,
      dateAchat,
    })
    setEntries((prev) => [entry, ...prev])
  }

  async function removeEntry(id) {
    await api.removeVaultEntry(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  return { entries, loading, addEntry, removeEntry, reload }
}
