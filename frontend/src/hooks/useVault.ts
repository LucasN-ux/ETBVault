import { useCallback, useEffect, useState } from 'react'
import * as api from '../services/api'
import type { NouvellePosition, PositionCoffre } from '../types/domaine'
import { ecrireVaultLocal, lireVaultLocal } from '../utils/vaultLocal'
import { useAuth } from './useAuth'

// ─────────────────────────────────────────────────────────────────────────────
// useVault — coffre à double mode :
//   • déconnecté → localStorage (coffre anonyme, essayable sans compte)
//   • connecté   → API /api/vault (persisté en base, scopé au compte)
// L'interface est la même dans les deux cas : les écrans n'ont pas à savoir
// lequel est actif.
// ─────────────────────────────────────────────────────────────────────────────

export interface Coffre {
  entries: PositionCoffre[]
  loading: boolean
  addEntry: (position: NouvellePosition) => Promise<void>
  removeEntry: (id: number) => Promise<void>
  reload: () => Promise<void>
}

const aujourdhui = (): string => new Date().toISOString().slice(0, 10)

export function useVault(): Coffre {
  const { user, loading: authLoading, vaultVersion } = useAuth()

  // Le coffre local est lisible immédiatement : on en part comme état initial
  // plutôt que de le poser depuis un effet.
  const [entriesCompte, setEntriesCompte] = useState<PositionCoffre[] | null>(null)
  const [entriesLocales, setEntriesLocales] = useState<PositionCoffre[]>(lireVaultLocal)
  const [chargementCompte, setChargementCompte] = useState(false)

  const entries = user ? (entriesCompte ?? []) : entriesLocales
  const loading = authLoading || (user ? entriesCompte === null || chargementCompte : false)

  const reload = useCallback(async (): Promise<void> => {
    if (authLoading) return
    if (!user) {
      setEntriesLocales(lireVaultLocal())
      return
    }
    setChargementCompte(true)
    try {
      setEntriesCompte(await api.fetchVault())
    } catch {
      setEntriesCompte([])
    } finally {
      setChargementCompte(false)
    }
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
    void reload()
  }, [reload])

  async function addEntry(position: NouvellePosition): Promise<void> {
    const base = {
      etbId: position.etbId,
      prixAchat: Number(position.prixAchat),
      quantite: Math.trunc(Number(position.quantite)) || 1,
      dateAchat: position.dateAchat ?? aujourdhui(),
    }

    if (user) {
      const creee = await api.addVaultEntry(base)
      setEntriesCompte((prev) => [creee, ...(prev ?? [])])
      return
    }

    // Hors compte, l'id ne sert qu'à distinguer les lignes localement.
    const locale: PositionCoffre = { id: Date.now(), ...base }
    setEntriesLocales((prev) => {
      const suivant = [locale, ...prev]
      ecrireVaultLocal(suivant)
      return suivant
    })
  }

  async function removeEntry(id: number): Promise<void> {
    if (user) {
      await api.removeVaultEntry(id)
      setEntriesCompte((prev) => (prev ?? []).filter((e) => e.id !== id))
      return
    }
    setEntriesLocales((prev) => {
      const suivant = prev.filter((e) => e.id !== id)
      ecrireVaultLocal(suivant)
      return suivant
    })
  }

  return { entries, loading, addEntry, removeEntry, reload }
}
