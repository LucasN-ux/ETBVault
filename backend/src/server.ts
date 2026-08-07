import app from './app'
import { config } from './lib/config'
import { mettreAJourPrixCartes, planifierPrixCartes } from './cron/prix-cartes'
import { planifierPrixETB } from './cron/prix-etb'
import { mettreAJourPrixDepuisCM } from './services/cm-download'

app.listen(config.port, () => {
  console.log(`Serveur ETBVault démarré sur le port ${config.port}`)

  if (config.cronsActifs) {
    planifierPrixETB()
    planifierPrixCartes()
  } else {
    console.log('[cron] Tâches planifiées désactivées (CRONS_ACTIFS=false)')
  }

  if (config.collecteAuDemarrage) {
    void collecterMaintenant()
  }
})

/**
 * Collecte immédiate, hors planification.
 *
 * Désactivée par défaut : elle ouvre un navigateur et se connecte à
 * Cardmarket, ce qu'un service qui redémarre souvent ne doit pas refaire à
 * chaque boot. Chaque source échoue indépendamment — un problème Cardmarket
 * ne doit pas empêcher la mise à jour des prix de cartes.
 */
async function collecterMaintenant(): Promise<void> {
  try {
    console.log('[démarrage] Collecte des prix ETB (Cardmarket)...')
    const { ok, sans_prix } = await mettreAJourPrixDepuisCM()
    console.log(`[démarrage] Prix ETB — ${ok} mis à jour, ${sans_prix} sans prix.`)
  } catch (err) {
    console.error('[démarrage] Échec collecte ETB :', err instanceof Error ? err.message : err)
  }

  try {
    console.log('[démarrage] Collecte des prix cartes (TCGdex)...')
    await mettreAJourPrixCartes()
  } catch (err) {
    console.error('[démarrage] Échec collecte cartes :', err instanceof Error ? err.message : err)
  }
}
