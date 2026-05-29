import { describe, it, expect } from 'vitest'
import { lttb } from './lttb'

const pt = (i, v) => ({ date: new Date(2026, 0, 1 + i).toISOString(), cmPrixMoyen: v })

describe('lttb', () => {
  it('retourne les données telles quelles si le seuil >= nb de points', () => {
    const data = [pt(0, 10), pt(1, 20), pt(2, 30)]
    expect(lttb(data, 5)).toEqual(data)
    expect(lttb(data, 3)).toEqual(data)
  })

  it('retourne les données si seuil < 3 (LTTB invalide)', () => {
    const data = [pt(0, 10), pt(1, 20), pt(2, 30), pt(3, 40)]
    expect(lttb(data, 2)).toEqual(data)
  })

  it('réduit à exactement `seuil` points', () => {
    const data = Array.from({ length: 100 }, (_, i) => pt(i, i))
    expect(lttb(data, 10)).toHaveLength(10)
  })

  it('conserve toujours le premier et le dernier point', () => {
    const data = Array.from({ length: 100 }, (_, i) => pt(i, Math.sin(i)))
    const out = lttb(data, 10)
    expect(out[0]).toBe(data[0])
    expect(out.at(-1)).toBe(data.at(-1))
  })

  it('préserve un pic marqué', () => {
    // Série plate avec un pic net au milieu
    const data = Array.from({ length: 100 }, (_, i) => pt(i, i === 50 ? 1000 : 10))
    const out = lttb(data, 10)
    expect(out.some((p) => p.cmPrixMoyen === 1000)).toBe(true)
  })
})
