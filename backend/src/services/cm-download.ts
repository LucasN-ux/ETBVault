// Service de téléchargement du Price Guide Cardmarket
// Connexion via Playwright (session authentifiée), fetch JSON via l'API CM
// Source légale : export officiel CM Data — https://www.cardmarket.com/en/Pokemon/Data

import { chromium } from 'playwright'
import prisma from '../db/client'
import { ETB_PRODUCT_IDS } from './cm-products'

interface CmPrixEntry {
  idProduct: number
  trend: number | null
  low: number | null
}

// URL directe vers le Price Guide Pokémon sur le S3 de Cardmarket
const CM_PRICE_GUIDE_URL = 'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json'

async function telechargerPrixGuide(): Promise<Record<number, { trend: number | null; low: number | null }>> {
  const login = process.env.CM_EMAIL
  const mdp = process.env.CM_PASSWORD
  if (!login || !mdp) throw new Error('CM_EMAIL et CM_PASSWORD non configurés dans .env')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
    Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en'] })
  })

  try {
    const page = await context.newPage()

    // ── Connexion ──────────────────────────────────────────────────────────────
    console.log('[cm-download] Connexion à Cardmarket...')
    await page.goto('https://www.cardmarket.com/fr/Pokemon/Account/Login', { waitUntil: 'load' })

    // Attendre résolution challenge Cloudflare si présent
    await page.waitForFunction(
      () => document.title !== 'Un instant…' && document.title !== 'Just a moment...',
      { timeout: 20_000 },
    )

    // Accepter les cookies si la modale est présente
    const cookieBtn = page.locator('button[type="submit"]:has-text("essentiels")')
    if (await cookieBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await cookieBtn.click()
      await page.waitForTimeout(500)
    }

    await page.fill('input[name="username"]', login)
    await page.fill('input[name="userPassword"]', mdp)

    // Soumettre le formulaire et attendre la navigation (même si elle aboutit sur une 404)
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'commit', timeout: 15_000 }).catch(() => {}),
      page.locator('input[type="submit"]').first().click(),
    ])
    await page.waitForTimeout(500)
    console.log('[cm-download] Connecté.')

    // ── Téléchargement du Price Guide ─────────────────────────────────────────
    // L'URL S3 est accessible via la session authentifiée
    console.log('[cm-download] Téléchargement du Price Guide...')
    const response = await context.request.get(CM_PRICE_GUIDE_URL)
    if (!response.ok()) throw new Error(`Erreur téléchargement: ${response.status()} ${response.statusText()}`)

    const data = await response.json() as { priceGuides?: CmPrixEntry[] }
    const priceGuides = data.priceGuides ?? []
    console.log(`[cm-download] ${priceGuides.length} entrées dans le Price Guide`)

    const index: Record<number, { trend: number | null; low: number | null }> = {}
    for (const entry of priceGuides) {
      index[entry.idProduct] = {
        trend: entry.trend != null ? Number(entry.trend) : null,
        low: entry.low != null ? Number(entry.low) : null,
      }
    }
    return index
  } finally {
    await context.close()
    await browser.close()
  }
}

function calculerPrixPourETB(
  prixIndex: Record<number, { trend: number | null; low: number | null }>,
  etbId: string,
): { cmPrixMoyen: number | null; cmPrixBas: number | null } {
  const ids = ETB_PRODUCT_IDS[etbId]
  if (!ids || ids.length === 0) return { cmPrixMoyen: null, cmPrixBas: null }

  const trends: number[] = []
  const lows: number[] = []

  for (const id of ids) {
    const p = prixIndex[id]
    if (p?.trend != null) trends.push(p.trend)
    if (p?.low != null) lows.push(p.low)
  }

  return {
    cmPrixMoyen: trends.length > 0
      ? Math.round((trends.reduce((s, v) => s + v, 0) / trends.length) * 100) / 100
      : null,
    cmPrixBas: lows.length > 0 ? Math.min(...lows) : null,
  }
}

export async function mettreAJourPrixDepuisCM(): Promise<{ ok: number; sans_prix: number; inchanges: number }> {
  const prixIndex = await telechargerPrixGuide()

  const aujourd = new Date()
  aujourd.setHours(0, 0, 0, 0)

  const etbIds = Object.keys(ETB_PRODUCT_IDS)
  let ok = 0
  let sans_prix = 0
  let inchanges = 0

  for (const etbId of etbIds) {
    const { cmPrixMoyen, cmPrixBas } = calculerPrixPourETB(prixIndex, etbId)

    if (cmPrixMoyen === null) {
      console.warn(`[cm-download] ${etbId}: aucun prix tendance disponible`)
      sans_prix++
      continue
    }

    // Dernier prix connu en base (toutes dates confondues)
    const dernierEnDB = await prisma.prixHistorique.findFirst({
      where: { produitId: etbId, cmPrixMoyen: { not: null } },
      orderBy: { date: 'desc' },
      select: { date: true, cmPrixMoyen: true },
    })

    const dernierPrix = dernierEnDB ? Number(dernierEnDB.cmPrixMoyen) : null
    const prixChange = dernierPrix === null || Math.abs(cmPrixMoyen - dernierPrix) >= 0.01

    if (!prixChange) {
      inchanges++
      continue
    }

    // Si le prix vient d'une entrée antérieure à aujourd'hui, on insère d'abord
    // un point "palier" à la veille pour que le graphique soit en escalier
    if (dernierEnDB && dernierEnDB.date < aujourd) {
      const veille = new Date(aujourd)
      veille.setDate(veille.getDate() - 1)
      await prisma.prixHistorique.upsert({
        where: { produitId_date: { produitId: etbId, date: veille } },
        update: { cmPrixMoyen: dernierPrix, cmPrixBas: null },
        create: { produitId: etbId, date: veille, cmPrixMoyen: dernierPrix ?? cmPrixMoyen, cmPrixBas: null },
      })
    }

    // Nouveau prix du jour
    await prisma.prixHistorique.upsert({
      where: { produitId_date: { produitId: etbId, date: aujourd } },
      update: { cmPrixMoyen, cmPrixBas },
      create: { produitId: etbId, date: aujourd, cmPrixMoyen, cmPrixBas },
    })

    console.log(`[cm-download] ✓ ${etbId}: ${dernierPrix ?? '—'}€ → ${cmPrixMoyen}€`)
    ok++
  }

  console.log(`[cm-download] ${ok} mis à jour, ${inchanges} inchangés, ${sans_prix} sans prix.`)
  return { ok, sans_prix, inchanges }
}
