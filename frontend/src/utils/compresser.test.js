import { describe, it, expect } from 'vitest'
import { compresserParSeuil, detecterTrous, insererTrous } from './compresser'

const jour = (i) => new Date(2026, 0, 1 + i).toISOString()
const pt = (i, v, origine) => ({ date: jour(i), cmPrixMoyen: v, ...(origine && { origine }) })

describe('compresserParSeuil', () => {
  it('retourne tel quel si <= 2 points', () => {
    const d = [pt(0, 100), pt(1, 105)]
    expect(compresserParSeuil(d, 0.01)).toEqual(d)
  })

  it('collapse le bruit sous le seuil (plat = premier + dernier)', () => {
    // oscille de ±0,4% autour de 100, seuil 1%
    const d = [pt(0, 100), pt(1, 100.4), pt(2, 99.7), pt(3, 100.2), pt(4, 99.8)]
    const out = compresserParSeuil(d, 0.01)
    expect(out).toHaveLength(2)
    expect(out[0]).toBe(d[0])
    expect(out.at(-1)).toBe(d.at(-1))
  })

  it('garde un point quand le mouvement franchit le seuil', () => {
    const d = [pt(0, 100), pt(1, 100.2), pt(2, 105), pt(3, 105.1)]
    const out = compresserParSeuil(d, 0.01)
    expect(out.some((p) => p.cmPrixMoyen === 105)).toBe(true)
  })

  it('accumule la dérive lente (comparaison au dernier point RETENU)', () => {
    // +0,4% par jour : chaque pas < 1% mais le cumul franchit
    const d = [pt(0, 100), pt(1, 100.4), pt(2, 100.8), pt(3, 101.2), pt(4, 101.6)]
    const out = compresserParSeuil(d, 0.01)
    // 101.2 est le premier à dépasser 1% du point retenu (100) → conservé
    expect(out.some((p) => p.cmPrixMoyen === 101.2)).toBe(true)
  })

  it('conserve toujours le dernier point (prix courant)', () => {
    const d = [pt(0, 100), pt(1, 100.1), pt(2, 100.2)]
    const out = compresserParSeuil(d, 0.01)
    expect(out.at(-1)).toBe(d.at(-1))
  })
})

describe('detecterTrous', () => {
  it('détecte un trou de collecte > gapJours', () => {
    const d = [pt(0, 100), pt(1, 101), pt(20, 102)] // 19 jours entre les 2 derniers
    const trous = detecterTrous(d, 10)
    expect(trous).toHaveLength(1)
  })

  it('ne signale pas un gap impliquant un point importé (historique épars)', () => {
    const d = [pt(0, 100, 'import_cm'), pt(30, 101, 'import_cm'), pt(31, 102)]
    const trous = detecterTrous(d, 10)
    expect(trous).toHaveLength(0)
  })

  it('aucun trou si la collecte est quotidienne', () => {
    const d = Array.from({ length: 15 }, (_, i) => pt(i, 100 + i))
    expect(detecterTrous(d, 10)).toHaveLength(0)
  })
})

describe('insererTrous', () => {
  it('insère un null entre deux points qui enjambent un trou', () => {
    const display = [pt(0, 100), pt(20, 102)]
    const trous = [[new Date(jour(0)).getTime(), new Date(jour(20)).getTime()]]
    const out = insererTrous(display, trous)
    expect(out).toHaveLength(3)
    expect(out[1].cmPrixMoyen).toBeNull()
    expect(out[1]._trou).toBe(true)
  })

  it('ne touche rien sans trou', () => {
    const display = [pt(0, 100), pt(1, 101)]
    expect(insererTrous(display, [])).toEqual(display)
  })
})
