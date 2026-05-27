// Scraper Cardmarket — utilise Playwright (Chromium headless) pour contourner Cloudflare
// Principes :
//   - Navigateur réel → passe les challenges JS Cloudflare
//   - Délai aléatoire entre requêtes (3-8s) pour ne pas surcharger CM
//   - Parsing JSON-LD en priorité, DOM cheerio en fallback
//   - Jamais de scraping live — tout passe par le cache DB via le cron

import { chromium, type Browser, type Page } from 'playwright'
import * as cheerio from 'cheerio'

export interface ScrapeResult {
  prixBas:     number | null   // Prix "À partir de" (offre la moins chère)
  prixMoyen:   number | null   // Prix tendance 30j Cardmarket
  nbAnnonces:  number | null   // Nombre d'offres disponibles
}

// Délai aléatoire entre min et max ms
export function delaiAleatoire(minMs = 3000, maxMs = 8000): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs) + minMs)
  return new Promise((r) => setTimeout(r, ms))
}

// Parse un texte prix "12,34 €" ou "12.34" → nombre
function parsePrixTexte(texte: string): number | null {
  const propre = texte.replace(/[\s ]/g, '').replace(/[€$]/g, '')
  const match = propre.match(/\d+[,.]\d+/)
  if (!match) return null
  const val = parseFloat(match[0].replace(',', '.'))
  return isFinite(val) && val > 0 ? val : null
}

// Extraction JSON-LD — plus stable que les sélecteurs HTML
function extraireJsonLd(html: string): Partial<ScrapeResult> {
  const result: Partial<ScrapeResult> = {}
  const regex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1] ?? '{}') as Record<string, unknown>
      if (data['@type'] === 'Product') {
        const offers = data['offers'] as Record<string, unknown> | undefined
        if (offers) {
          if (offers['lowPrice'] != null) result.prixBas = parseFloat(String(offers['lowPrice']))
          if (offers['offerCount'] != null) result.nbAnnonces = parseInt(String(offers['offerCount']), 10)
        }
      }
    } catch { /* JSON malformé */ }
  }
  return result
}

// Extraction HTML cheerio — parsing des dt/dd de la page produit CM
function extraireHtml(html: string): Partial<ScrapeResult> {
  const result: Partial<ScrapeResult> = {}
  const $ = cheerio.load(html)

  $('dt').each((_, dt) => {
    const label = $(dt).text().trim().toLowerCase()
    const valeur = $(dt).next('dd').text().trim()

    // "De" / "From" → prix le plus bas
    if ((label === 'de' || label === 'from') && result.prixBas == null) {
      result.prixBas = parsePrixTexte(valeur)
    }
    // "Tendance des prix" / "Price Trend" → prix tendance
    else if ((label.includes('tendance') || label.includes('trend')) && result.prixMoyen == null) {
      result.prixMoyen = parsePrixTexte(valeur)
    }
    // "Articles disponibles" / "Available items" → nombre d'annonces
    else if (label.includes('articles disponibles') || label.includes('available items')) {
      const n = parseInt(valeur.replace(/\s/g, ''), 10)
      if (!isNaN(n)) result.nbAnnonces = n
    }
  })

  return result
}

// Instance Playwright partagée — évite de rouvrir Chromium à chaque appel
let browserInstance: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (browserInstance?.isConnected()) return browserInstance
  browserInstance = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled', // masque l'empreinte automation
    ],
  })
  return browserInstance
}

async function ouvrirPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'fr-FR',
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: {
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control':   'no-cache',
    },
  })
  const page = await context.newPage()

  // Masquer window.navigator.webdriver + plugins Chrome
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
    Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en'] })
  })

  return page
}

// Scrape une URL Cardmarket et retourne les prix
export async function scrapeCardmarket(cmUrl: string): Promise<ScrapeResult> {
  const browser = await getBrowser()
  const page = await ouvrirPage(browser)

  try {
    await page.goto(cmUrl, { waitUntil: 'load', timeout: 45_000 })

    // Attendre que Cloudflare résolve son challenge (titre "Un instant…")
    try {
      await page.waitForFunction(
        () => document.title !== 'Un instant…' && document.title !== 'Just a moment...',
        { timeout: 20_000 }
      )
    } catch {
      // Si challenge pas résolu en 20s, on essaie quand même d'extraire
    }
    await page.waitForTimeout(2_000)

    const html = await page.content()

    const ldData   = extraireJsonLd(html)
    const htmlData = extraireHtml(html)

    const result: ScrapeResult = {
      prixBas:    ldData.prixBas    ?? htmlData.prixBas    ?? null,
      prixMoyen:  ldData.prixMoyen  ?? htmlData.prixMoyen  ?? null,
      nbAnnonces: ldData.nbAnnonces ?? htmlData.nbAnnonces ?? null,
    }

    // Fallback : extraire directement depuis le DOM via Playwright
    if (result.prixBas === null) {
      result.prixBas = await page.evaluate(() => {
        const els = document.querySelectorAll('dl.row dd')
        for (const el of els) {
          const txt = el.textContent?.replace(/[\s ]/g, '').replace('€', '') ?? ''
          const m = txt.match(/\d+[,.]\d+/)
          if (m) return parseFloat(m[0].replace(',', '.'))
        }
        return null
      })
    }

    return result
  } finally {
    const context = page.context()
    await page.close()
    await context.close()
  }
}

// Fermer proprement le browser à l'arrêt du processus
process.on('exit', () => { browserInstance?.close().catch(() => {}) })
process.on('SIGINT', () => { browserInstance?.close().then(() => process.exit()) })
