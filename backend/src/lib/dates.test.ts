import { aujourdhuiUtc, jourUtc, veille } from './dates'

// Les colonnes `date` de prix_historique sont des DATE Postgres et Prisma en
// sérialise la partie UTC. Une date construite à minuit local décalait donc le
// jour enregistré : à Paris en été, le prix du jour était daté de la veille.

describe('jourUtc', () => {
  it('place la date à minuit UTC', () => {
    const d = jourUtc('2026-08-07')
    expect(d.toISOString()).toBe('2026-08-07T00:00:00.000Z')
  })

  it('conserve le jour demandé, quel que soit le fuseau de la machine', () => {
    // C'est la régression : `new Date('2026-08-07')` suivi de setHours(0,0,0,0)
    // donnait le 6 août en UTC pour toute machine à l'est de Greenwich.
    expect(jourUtc('2026-08-07').getUTCDate()).toBe(7)
    expect(jourUtc('2026-01-01').getUTCFullYear()).toBe(2026)
    expect(jourUtc('2026-01-01').getUTCMonth()).toBe(0)
  })
})

describe('aujourdhuiUtc', () => {
  it('est à minuit pile', () => {
    const d = aujourdhuiUtc()
    expect(d.getUTCHours()).toBe(0)
    expect(d.getUTCMinutes()).toBe(0)
    expect(d.getUTCSeconds()).toBe(0)
    expect(d.getUTCMilliseconds()).toBe(0)
  })

  it('correspond au jour courant en UTC', () => {
    expect(aujourdhuiUtc().toISOString().slice(0, 10)).toBe(new Date().toISOString().slice(0, 10))
  })
})

describe('veille', () => {
  it('recule d’un jour', () => {
    expect(veille(jourUtc('2026-08-07')).toISOString()).toBe('2026-08-06T00:00:00.000Z')
  })

  it('franchit les débuts de mois et d’année', () => {
    expect(veille(jourUtc('2026-03-01')).toISOString().slice(0, 10)).toBe('2026-02-28')
    expect(veille(jourUtc('2026-01-01')).toISOString().slice(0, 10)).toBe('2025-12-31')
  })

  it('ne modifie pas la date reçue', () => {
    const origine = jourUtc('2026-08-07')
    veille(origine)
    expect(origine.toISOString()).toBe('2026-08-07T00:00:00.000Z')
  })
})
