import app from './app'
import { mettreAJourPrixDepuisCM } from './services/cm-download'
import { mettreAJourPrixCartes } from './cron/prix-cartes'

const PORT = Number(process.env['PORT']) || 3001

app.listen(PORT, async () => {
  console.log(`Serveur ETBVault démarré sur le port ${PORT}`)
  await lancerMisesAJour()
})

async function lancerMisesAJour(): Promise<void> {
  // Prix ETB — Cardmarket (upsert, sans doublon)
  try {
    console.log('[startup] Mise à jour des prix ETB depuis Cardmarket...')
    const { ok, sans_prix } = await mettreAJourPrixDepuisCM()
    console.log(`[startup] Prix ETB — ${ok} mis à jour, ${sans_prix} sans prix.`)
  } catch (err) {
    console.error('[startup] Erreur prix ETB:', err instanceof Error ? err.message : err)
  }

  // Prix cartes — TCGdex (updateMany, idempotent)
  try {
    console.log('[startup] Mise à jour des prix cartes depuis TCGdex...')
    await mettreAJourPrixCartes()
  } catch (err) {
    console.error('[startup] Erreur prix cartes:', err instanceof Error ? err.message : err)
  }
}
