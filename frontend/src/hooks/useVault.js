import { useState, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// useVault — couche d'abstraction du Vault personnel
//
// V1 : localStorage (pas d'auth, usage solo)
// V2 : remplacer les 3 fonctions locales par des appels API
//      sans toucher à Vault.jsx ni à l'interface du hook
//
// Interface stable pour la V2 :
//   POST   /api/vault          { etbId, prixAchat, quantite, dateAchat }
//   DELETE /api/vault/:id
//   GET    /api/vault          → VaultEntry[]
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'etbvault_vault'

function lireStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function ecrireStorage(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function useVault() {
  const [entries, setEntries] = useState(lireStorage)
  const [loading] = useState(false)

  // Sync localStorage à chaque changement
  useEffect(() => {
    ecrireStorage(entries)
  }, [entries])

  // ── V1 : opérations locales ────────────────────────────────────────────────
  // En V2, remplacer chaque fonction par un appel fetch + setEntries(await res.json())

  function addEntry({ etbId, prixAchat, quantite, dateAchat }) {
    const entry = {
      id: Date.now(),              // V2 : id retourné par l'API
      etbId,
      prixAchat: parseFloat(prixAchat),
      quantite: parseInt(quantite) || 1,
      dateAchat: dateAchat ?? new Date().toISOString().split('T')[0],
    }
    setEntries((prev) => [...prev, entry])
  }

  function removeEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  function updateEntry(id, changes) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...changes } : e))
    )
  }

  return { entries, loading, addEntry, removeEntry, updateEntry }
}
