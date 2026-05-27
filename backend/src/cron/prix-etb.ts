// Cron job quotidien — mise à jour des prix ETB via le Price Guide Cardmarket
// Stratégie : téléchargement du fichier JSON officiel CM (légal, 1 seul appel/jour)
//   - Connexion CM avec les identifiants .env (CM_EMAIL + CM_PASSWORD)
//   - Tourne à 02:00 heure Paris (le fichier CM est régénéré la nuit)
//   - Met à jour un point par ETB et par jour dans prix_historique

import cron from 'node-cron'
import { mettreAJourPrixDepuisCM } from '../services/cm-download'

export async function mettreAJourPrixETB(): Promise<void> {
  console.log('[cron-etb] Début mise à jour prix ETB —', new Date().toISOString())
  try {
    const { ok, sans_prix } = await mettreAJourPrixDepuisCM()
    console.log(`[cron-etb] Terminé — ${ok} ETBs mis à jour, ${sans_prix} sans prix CM`)
  } catch (err) {
    console.error('[cron-etb] Erreur fatale:', err instanceof Error ? err.message : err)
  }
}

// 07:00 chaque matin — le Price Guide CM est régénéré dans la nuit
cron.schedule('0 7 * * *', mettreAJourPrixETB, { timezone: 'Europe/Paris' })

console.log('[cron] Job prix-etb planifié (07:00 Europe/Paris) — CM Price Guide')
