import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRequete } from './useRequete'

// Le point de ce hook : une requête qui échoue doit être visible. Avant, chaque
// écran faisait `.catch(() => {})` et restait bloqué sur son squelette de
// chargement, même quand l'API renvoyait 500 sur tout.

describe('useRequete', () => {
  it('expose les données en cas de succès', async () => {
    const appel = vi.fn().mockResolvedValue([{ id: 'sv01' }])
    const { result } = renderHook(() => useRequete(appel))

    expect(result.current.chargement).toBe(true)
    await waitFor(() => expect(result.current.chargement).toBe(false))

    expect(result.current.donnees).toEqual([{ id: 'sv01' }])
    expect(result.current.erreur).toBeNull()
  })

  it('expose l’erreur au lieu de rester en chargement', async () => {
    const panne = new Error('Serveur injoignable')
    const appel = vi.fn().mockRejectedValue(panne)
    const { result } = renderHook(() => useRequete(appel))

    await waitFor(() => expect(result.current.chargement).toBe(false))

    expect(result.current.erreur).toBe(panne)
    expect(result.current.donnees).toBeNull()
  })

  it('passe l’argument à l’appel', async () => {
    const appel = vi.fn().mockResolvedValue(null)
    renderHook(() => useRequete(appel, 'sv01'))
    await waitFor(() => expect(appel).toHaveBeenCalledWith('sv01'))
  })

  it('relance quand l’argument change, pas à chaque rendu', async () => {
    const appel = vi.fn().mockResolvedValue(null)
    const { rerender } = renderHook(({ id }) => useRequete(appel, id), {
      initialProps: { id: 'sv01' },
    })

    await waitFor(() => expect(appel).toHaveBeenCalledTimes(1))

    rerender({ id: 'sv01' })
    expect(appel).toHaveBeenCalledTimes(1)

    rerender({ id: 'swsh12' })
    await waitFor(() => expect(appel).toHaveBeenCalledTimes(2))
    expect(appel).toHaveBeenLastCalledWith('swsh12')
  })

  it('ignore la réponse d’une requête remplacée', async () => {
    // Une réponse lente pour sv01 ne doit pas écraser celle de swsh12 : sinon
    // la fiche affiche les données de l'ETB précédente.
    const appel = vi.fn((id) =>
      id === 'sv01'
        ? new Promise((resolve) => setTimeout(() => resolve('lent'), 40))
        : Promise.resolve('rapide'),
    )

    const { result, rerender } = renderHook(({ id }) => useRequete(appel, id), {
      initialProps: { id: 'sv01' },
    })
    rerender({ id: 'swsh12' })

    await waitFor(() => expect(result.current.donnees).toBe('rapide'))
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(result.current.donnees).toBe('rapide')
  })

  it('ne lance rien quand la requête est inactive', async () => {
    const appel = vi.fn().mockResolvedValue(null)
    const { result } = renderHook(() => useRequete(appel, '', { actif: false }))

    await waitFor(() => expect(result.current.chargement).toBe(false))
    expect(appel).not.toHaveBeenCalled()
  })

  it('permet de réessayer après une panne', async () => {
    const appel = vi
      .fn()
      .mockRejectedValueOnce(new Error('Serveur injoignable'))
      .mockResolvedValueOnce(['ok'])

    const { result } = renderHook(() => useRequete(appel))
    await waitFor(() => expect(result.current.erreur).not.toBeNull())

    result.current.recharger()

    await waitFor(() => expect(result.current.donnees).toEqual(['ok']))
    expect(result.current.erreur).toBeNull()
  })
})
