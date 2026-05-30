import { chromium } from 'playwright'

// Session Cardmarket authentifiée (Playwright) réutilisable : login + GET JSON
// sur le S3 officiel CM. Factorisé depuis cm-download.ts pour servir aussi à
// l'ingestion du catalogue produits (cm-catalog.ts).

// Récupère un JSON sur le S3 CM via une session authentifiée.
export async function fetchCmJson<T>(url: string): Promise<T> {
  const login = process.env['CM_EMAIL']
  const mdp = process.env['CM_PASSWORD']
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
    console.log('[cm-session] Connexion à Cardmarket...')
    await page.goto('https://www.cardmarket.com/fr/Pokemon/Account/Login', { waitUntil: 'load' })
    await page.waitForFunction(
      () => document.title !== 'Un instant…' && document.title !== 'Just a moment...',
      { timeout: 20_000 },
    )
    const cookieBtn = page.locator('button[type="submit"]:has-text("essentiels")')
    if (await cookieBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await cookieBtn.click()
      await page.waitForTimeout(500)
    }
    await page.fill('input[name="username"]', login)
    await page.fill('input[name="userPassword"]', mdp)
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'commit', timeout: 15_000 }).catch(() => {}),
      page.locator('input[type="submit"]').first().click(),
    ])
    await page.waitForTimeout(500)
    console.log('[cm-session] Connecté. Téléchargement', url.split('/').pop())

    const response = await context.request.get(url)
    if (!response.ok()) throw new Error(`Erreur téléchargement: ${response.status()} ${response.statusText()}`)
    return (await response.json()) as T
  } finally {
    await context.close()
    await browser.close()
  }
}
