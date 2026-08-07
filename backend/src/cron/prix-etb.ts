// Cron job quotidien — mise à jour des prix ETB via le Price Guide Cardmarket
// Stratégie : téléchargement du fichier JSON officiel CM (légal, 1 seul appel/jour)
//   - Connexion CM avec les identifiants .env (CM_EMAIL + CM_PASSWORD)
//   - Planifié à 07:00 heure Paris (le fichier CM est régénéré dans la nuit)
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

/**
 * Planifie la collecte quotidienne — appelée explicitement par le serveur.
 *
 * Volontairement pas un effet de bord à l'import : `app.ts` importe ce module,
 * et tout ce qui importe l'app (script, test) planifiait donc des tâches sans
 * le vouloir.
 */
export function planifierPrixETB(): void {
  cron.schedule('0 7 * * *', mettreAJourPrixETB, { timezone: 'Europe/Paris' })
  console.log('[cron] prix-etb planifié — 07:00 Europe/Paris (Price Guide CM)')
}
