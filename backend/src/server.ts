import app from './app'
import prisma from './db/client'
import { mettreAJourPrixDepuisCM } from './services/cm-download'
import { mettreAJourPrixCartes } from './cron/prix-cartes'

const PORT = Number(process.env['PORT']) || 3001

app.listen(PORT, async () => {
  console.log(`Serveur ETBVault démarré sur le port ${PORT}`)
  await verifierMisesAJourDuJour()
})

// Au démarrage, lance les mises à jour manquantes pour aujourd'hui
async function verifierMisesAJourDuJour(): Promise<void> {
  const aujourd = new Date()
  aujourd.setHours(0, 0, 0, 0)

  await verifierPrixETB(aujourd)
  await verifierPrixCartes(aujourd)
}

async function verifierPrixETB(aujourd: Date): Promise<void> {
  try {
    const existant = await prisma.prixHistorique.findFirst({
      where: { date: aujourd, cmPrixMoyen: { not: null } },
    })
    if (existant) {
      console.log('[startup] Prix ETB du jour déjà en DB.')
      return
    }
    console.log('[startup] Prix ETB manquants — lancement de la mise à jour CM...')
    const { ok, sans_prix } = await mettreAJourPrixDepuisCM()
    console.log(`[startup] Prix ETB — ${ok} mis à jour, ${sans_prix} sans prix.`)
  } catch (err) {
    console.error('[startup] Erreur prix ETB:', err instanceof Error ? err.message : err)
  }
}

async function verifierPrixCartes(aujourd: Date): Promise<void> {
  try {
    const existant = await prisma.carte.findFirst({
      where: { misAJour: { gte: aujourd } },
    })
    if (existant) {
      console.log('[startup] Prix cartes du jour déjà en DB.')
      return
    }
    console.log('[startup] Prix cartes manquants — lancement de la mise à jour TCGdex...')
    await mettreAJourPrixCartes()
    console.log('[startup] Prix cartes mis à jour.')
  } catch (err) {
    console.error('[startup] Erreur prix cartes:', err instanceof Error ? err.message : err)
  }
}
