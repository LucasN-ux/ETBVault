import { describe, it, expect } from 'vitest'
import { serieJours, serieMois } from './serieGraphe'

describe('serieJours', () => {
  it('renvoie [] si pas de données', () => {
    expect(serieJours([])).toEqual([])
    expect(serieJours(null)).toEqual([])
  })

  it('reporte le dernier prix connu sur les jours sans collecte (palier)', () => {
    const histo = [
      { date: '2026-05-20', cmPrixMoyen: 100 },
      { date: '2026-05-23', cmPrixMoyen: 110 },
    ]
    // Ancre = 2026-05-23. Fenêtre 7j = 05-17..05-23.
    // 05-17/18/19 : avant la 1re donnée → ignorés. Puis report de 100 jusqu'au 22, 110 le 23.
    expect(serieJours(histo)).toEqual([
      { date: '2026-05-20', prix: 100 },
      { date: '2026-05-21', prix: 100 },
      { date: '2026-05-22', prix: 100 },
      { date: '2026-05-23', prix: 110 },
    ])
  })

  it('ignore les prix invalides (null, 0, négatif)', () => {
    const histo = [
      { date: '2026-05-22', cmPrixMoyen: null },
      { date: '2026-05-23', cmPrixMoyen: 0 },
      { date: '2026-05-24', cmPrixMoyen: 50 },
    ]
    expect(serieJours(histo)).toEqual([{ date: '2026-05-24', prix: 50 }])
  })
})

describe('serieMois', () => {
  it('renvoie [] si pas de données', () => {
    expect(serieMois([])).toEqual([])
  })

  it('agrège chaque mois par médiane', () => {
    const histo = [
      { date: '2026-03-10', cmPrixMoyen: 300 },
      { date: '2026-03-20', cmPrixMoyen: 320 }, // mars : médiane(300,320) = 310
      { date: '2026-04-05', cmPrixMoyen: 400 }, // avril : 400
      { date: '2026-05-01', cmPrixMoyen: 500 },
      { date: '2026-05-31', cmPrixMoyen: 520 }, // mai : médiane(500,520) = 510
    ]
    expect(serieMois(histo)).toEqual([
      { mois: '2026-03', prix: 310, n: 2 },
      { mois: '2026-04', prix: 400, n: 1 },
      { mois: '2026-05', prix: 510, n: 2 },
    ])
  })

  it('médiane sur un nombre impair de points', () => {
    const histo = [
      { date: '2026-05-01', cmPrixMoyen: 10 },
      { date: '2026-05-10', cmPrixMoyen: 90 },
      { date: '2026-05-20', cmPrixMoyen: 20 }, // médiane(10,20,90) = 20 (robuste au pic 90)
    ]
    expect(serieMois(histo)).toEqual([{ mois: '2026-05', prix: 20, n: 3 }])
  })

  it('limite aux maxMois derniers mois', () => {
    const histo = [
      { date: '2026-03-10', cmPrixMoyen: 300 },
      { date: '2026-04-05', cmPrixMoyen: 400 },
      { date: '2026-05-01', cmPrixMoyen: 500 },
    ]
    expect(serieMois(histo, 2)).toEqual([
      { mois: '2026-04', prix: 400, n: 1 },
      { mois: '2026-05', prix: 500, n: 1 },
    ])
  })
})
