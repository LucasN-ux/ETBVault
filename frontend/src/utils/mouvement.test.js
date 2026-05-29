import { describe, it, expect } from 'vitest'
import {
  detecterMouvement,
  seuilAffichage,
  flecheMouvement,
  couleurMouvement,
  NIVEAU_LABEL,
} from './mouvement'

// Génère une série { date, cmPrixMoyen }, du plus ancien au plus récent
function serie(n, stepDays, valueFn) {
  return Array.from({ length: n }, (_, i) => ({
    date: new Date(2026, 0, 1 + i * stepDays).toISOString(),
    cmPrixMoyen: valueFn(i),
  }))
}

describe('seuilAffichage', () => {
  it('renvoie le défaut (1%) si volatilité absente/invalide', () => {
    expect(seuilAffichage(null)).toBe(0.01)
    expect(seuilAffichage(0)).toBe(0.01)
    expect(seuilAffichage(-1)).toBe(0.01)
    expect(seuilAffichage(NaN)).toBe(0.01)
  })

  it('applique le plancher pour une ETB très stable', () => {
    expect(seuilAffichage(0.0001)).toBe(0.005) // 2.5*σ < plancher → 0,5%
  })

  it('applique le plafond pour une ETB très volatile', () => {
    expect(seuilAffichage(0.1)).toBe(0.05) // 2.5*σ > plafond → 5%
  })

  it('vaut 2.5·σ entre plancher et plafond', () => {
    expect(seuilAffichage(0.01)).toBeCloseTo(0.025, 5)
  })
})

describe('detecterMouvement — cas limites', () => {
  it('série vide → données insuffisantes, horizons indisponibles', () => {
    const r = detecterMouvement([])
    expect(r.donneesInsuffisantes).toBe(true)
    expect(r.volatilite).toBeNull()
    expect(r.courtTerme.niveau).toBe('indisponible')
    expect(r.longTerme.niveau).toBe('indisponible')
  })

  it('cold start (<30 points) → seuils absolus, z null, volatilité null', () => {
    // 10 points hebdo sur ~63 jours, hausse nette ~+20%
    const d = serie(10, 7, (i) => 100 + i * (20 / 9))
    const r = detecterMouvement(d)
    expect(r.donneesInsuffisantes).toBe(true)
    expect(r.volatilite).toBeNull()
    expect(r.courtTerme.z).toBeNull()
    expect(r.courtTerme.direction).toBe('hausse')
    expect(r.courtTerme.niveau).not.toBe('faible')
    expect(r.courtTerme.niveau).not.toBe('indisponible')
  })
})

describe('detecterMouvement — historique fourni (z-score)', () => {
  // 200 points quotidiens : tendance haussière + bruit (pour σ > 0)
  const d = serie(200, 1, (i) => 100 + i * 0.1 + (i % 2 === 0 ? 0.5 : -0.5))
  const r = detecterMouvement(d)

  it('calcule une volatilité robuste positive', () => {
    expect(r.donneesInsuffisantes).toBe(false)
    expect(r.volatilite).toBeGreaterThan(0)
  })

  it('court terme : hausse, z fini, niveau classé', () => {
    expect(r.courtTerme.variationPct).toBeGreaterThan(0)
    expect(Number.isFinite(r.courtTerme.z)).toBe(true)
    expect(['faible', 'moyen', 'fort']).toContain(r.courtTerme.niveau)
  })

  it('long terme : hausse sur 180 jours', () => {
    expect(r.longTerme.direction).toBe('hausse')
    expect(r.longTerme.variationPct).toBeGreaterThan(0)
  })

  it('détecte une baisse quand le prix recule', () => {
    const baisse = serie(200, 1, (i) => 200 - i * 0.1 + (i % 2 === 0 ? 0.5 : -0.5))
    const rb = detecterMouvement(baisse)
    expect(rb.courtTerme.direction).toBe('baisse')
  })
})

describe('helpers d’affichage', () => {
  it('flecheMouvement', () => {
    expect(flecheMouvement({ niveau: 'fort', direction: 'hausse' })).toBe('↑')
    expect(flecheMouvement({ niveau: 'moyen', direction: 'baisse' })).toBe('↓')
    expect(flecheMouvement({ niveau: 'faible', direction: 'hausse' })).toBe('→')
    expect(flecheMouvement({ niveau: 'indisponible', direction: 'indisponible' })).toBe('→')
  })

  it('couleurMouvement', () => {
    expect(couleurMouvement({ niveau: 'fort', direction: 'hausse' })).toContain('green')
    expect(couleurMouvement({ niveau: 'fort', direction: 'baisse' })).toContain('red')
    expect(couleurMouvement({ niveau: 'faible', direction: 'hausse' })).toContain('gray')
  })

  it('NIVEAU_LABEL', () => {
    expect(NIVEAU_LABEL.faible).toBe('Faible')
    expect(NIVEAU_LABEL.fort).toBe('Fort')
  })
})
