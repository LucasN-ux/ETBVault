import { ErreurHttp } from './erreurs'
import {
  exigerDateIso,
  exigerEntierPositif,
  exigerIdEtb,
  exigerOrigine,
  exigerPrix,
  lireJours,
} from './validation'

// Chaque validateur renvoie la valeur ou lève une ErreurHttp 400. Aucun ne
// renvoie de booléen : l'appelant n'a rien à décider.

const leve400 = (fn: () => unknown) => {
  expect(fn).toThrow(ErreurHttp)
  try {
    fn()
  } catch (e) {
    expect((e as ErreurHttp).statut).toBe(400)
  }
}

describe('exigerIdEtb', () => {
  it('accepte les identifiants du catalogue', () => {
    expect(exigerIdEtb('sv01')).toBe('sv01')
    expect(exigerIdEtb('swsh12.5')).toBe('swsh12.5')
    expect(exigerIdEtb('cel25')).toBe('cel25')
  })

  it('rejette ce qui pourrait servir à sortir du catalogue', () => {
    leve400(() => exigerIdEtb('../../etc/passwd'))
    leve400(() => exigerIdEtb("sv01'; DROP TABLE etbs;--"))
    leve400(() => exigerIdEtb('sv 01'))
    leve400(() => exigerIdEtb(''))
    leve400(() => exigerIdEtb(undefined))
    leve400(() => exigerIdEtb(42))
  })
})

describe('exigerDateIso', () => {
  it('accepte le format YYYY-MM-DD', () => {
    expect(exigerDateIso('2026-08-07')).toBe('2026-08-07')
  })

  it('rejette les autres formats', () => {
    leve400(() => exigerDateIso('07/08/2026'))
    leve400(() => exigerDateIso('2026-8-7'))
    leve400(() => exigerDateIso('2026-08-07T12:00:00Z'))
    leve400(() => exigerDateIso(null))
  })
})

describe('exigerPrix', () => {
  it('accepte les nombres positifs, zéro compris', () => {
    expect(exigerPrix(0, 'cmPrixMoyen')).toBe(0)
    expect(exigerPrix(59.9, 'cmPrixMoyen')).toBe(59.9)
  })

  it('rejette le négatif, le non-fini et le non-nombre', () => {
    leve400(() => exigerPrix(-1, 'cmPrixMoyen'))
    leve400(() => exigerPrix(Number.NaN, 'cmPrixMoyen'))
    leve400(() => exigerPrix(Number.POSITIVE_INFINITY, 'cmPrixMoyen'))
    leve400(() => exigerPrix('59.9', 'cmPrixMoyen'))
  })

  it('nomme le champ fautif dans le message', () => {
    expect(() => exigerPrix(-1, 'cmPrixBas')).toThrow(/cmPrixBas/)
  })
})

describe('exigerEntierPositif', () => {
  it('accepte les entiers positifs', () => {
    expect(exigerEntierPositif(0, 'cmNbAnnonces')).toBe(0)
    expect(exigerEntierPositif(12, 'cmNbAnnonces')).toBe(12)
  })

  it('rejette les décimaux et les négatifs', () => {
    leve400(() => exigerEntierPositif(1.5, 'cmNbAnnonces'))
    leve400(() => exigerEntierPositif(-3, 'cmNbAnnonces'))
  })
})

describe('exigerOrigine', () => {
  it('accepte les deux provenances connues', () => {
    expect(exigerOrigine('collecte')).toBe('collecte')
    expect(exigerOrigine('import_cm')).toBe('import_cm')
  })

  it('rejette toute autre valeur', () => {
    leve400(() => exigerOrigine('manuel'))
    leve400(() => exigerOrigine(undefined))
  })
})

describe('lireJours', () => {
  it('borne la valeur demandée', () => {
    expect(lireJours('30', 7, 1, 365)).toBe(30)
    expect(lireJours('9999', 7, 1, 365)).toBe(365)
    expect(lireJours('3', 30, 7, 400)).toBe(7)
  })

  it('retombe sur le défaut quand la valeur est absente ou illisible', () => {
    // C'est un paramètre de confort : on ne rejette pas la requête pour ça.
    expect(lireJours(undefined, 7, 1, 365)).toBe(7)
    expect(lireJours('abc', 7, 1, 365)).toBe(7)
    expect(lireJours('0', 7, 1, 365)).toBe(7)
    expect(lireJours('-5', 7, 1, 365)).toBe(7)
  })

  it('tronque les décimaux', () => {
    expect(lireJours('30.9', 7, 1, 365)).toBe(30)
  })
})
