import { describe, it, expect } from 'vitest'
import { valeurHistorique } from './valeurHistorique'

describe('valeurHistorique', () => {
  it('retourne vide sans positions', () => {
    expect(valeurHistorique([], {})).toEqual([])
  })

  it('calcule valeur et investi avec report du dernier prix', () => {
    const entries = [{ etbId: 'sv01', prixAchat: 50, quantite: 2, dateAchat: '2026-01-01' }]
    const hist = { sv01: [{ date: '2026-01-01', cmPrixMoyen: 60 }, { date: '2026-01-03', cmPrixMoyen: 70 }] }
    const serie = valeurHistorique(entries, hist)
    expect(serie).toEqual([
      { date: '2026-01-01', valeur: 120, investi: 100 }, // 60×2
      { date: '2026-01-03', valeur: 140, investi: 100 }, // 70×2
    ])
  })

  it('une position ne compte qu’à partir de sa date d’achat', () => {
    const entries = [
      { etbId: 'a', prixAchat: 10, quantite: 1, dateAchat: '2026-01-01' },
      { etbId: 'b', prixAchat: 20, quantite: 1, dateAchat: '2026-01-05' },
    ]
    const hist = {
      a: [{ date: '2026-01-01', cmPrixMoyen: 10 }],
      b: [{ date: '2026-01-05', cmPrixMoyen: 25 }],
    }
    const serie = valeurHistorique(entries, hist)
    expect(serie.find((p) => p.date === '2026-01-01')).toEqual({ date: '2026-01-01', valeur: 10, investi: 10 })
    expect(serie.find((p) => p.date === '2026-01-05')).toEqual({ date: '2026-01-05', valeur: 35, investi: 30 })
  })

  it('avant le 1er prix connu, prend le prix d’achat', () => {
    const entries = [{ etbId: 'a', prixAchat: 40, quantite: 1, dateAchat: '2026-01-01' }]
    const hist = { a: [{ date: '2026-01-04', cmPrixMoyen: 55 }] }
    const serie = valeurHistorique(entries, hist)
    // 1er point = date d'achat, pas encore de prix → prix d'achat
    expect(serie[0]).toEqual({ date: '2026-01-01', valeur: 40, investi: 40 })
    expect(serie[serie.length - 1]).toEqual({ date: '2026-01-04', valeur: 55, investi: 40 })
  })
})
