// Cron job quotidien — mise à jour des prix des cartes via TCGdex
// Tourne tous les jours à minuit

import cron from 'node-cron'
import prisma from '../db/client'

interface TCGdexCardDetail {
  id: string
  pricing?: { cardmarket?: { avg?: number } }
}

interface TCGdexSetCard {
  id: string
}

interface TCGdexSet {
  cards?: TCGdexSetCard[]
}

export async function mettreAJourPrixCartes(): Promise<void> {
  console.log('[cron] Début mise à jour prix cartes —', new Date().toISOString())

  try {
    const etbs = await prisma.etb.findMany({
      where: { cartes: { some: {} } },
      select: { id: true, setId: true },
    })

    let total = 0

    for (const etb of etbs) {
      const setRes = await fetch(`https://api.tcgdex.net/v2/fr/sets/${etb.setId}`)
      if (!setRes.ok) continue
      const setData = await setRes.json() as TCGdexSet
      const cardsBasic = setData.cards ?? []

      const batchSize = 50
      for (let i = 0; i < cardsBasic.length; i += batchSize) {
        const batch = cardsBasic.slice(i, i + batchSize)
        const results = await Promise.all(
          batch.map((c) =>
            fetch(`https://api.tcgdex.net/v2/fr/cards/${c.id}`)
              .then((r) => r.json() as Promise<TCGdexCardDetail>)
              .catch(() => null)
          )
        )

        for (const carte of results.filter((r): r is TCGdexCardDetail => r !== null)) {
          if (!carte.pricing?.cardmarket?.avg) continue
          await prisma.carte.updateMany({
            where: { id: carte.id },
            data: {
              prixMarche: carte.pricing.cardmarket.avg,
              misAJour: new Date(),
            },
          })
          total++
        }
      }
    }

    console.log(`[cron] Prix cartes mis à jour : ${total} cartes`)

    // Snapshot quotidien : valeur top 10 cartes par ETB → stocké dans prix_historique
    // Permet de suivre l'évolution du ratio cartes/boîte dans le temps (signal spéculatif)
    await snapshotValeurTop10Cartes()
  } catch (err) {
    console.error('[cron] Erreur mise à jour prix cartes :', err instanceof Error ? err.message : err)
  }
}

async function snapshotValeurTop10Cartes(): Promise<void> {
  const aujourd = new Date()
  aujourd.setHours(0, 0, 0, 0)

  const etbs = await prisma.etb.findMany({
    where: { cartes: { some: {} } },
    select: { id: true },
  })

  let nb = 0
  for (const etb of etbs) {
    const top10 = await prisma.carte.findMany({
      where: { etbId: etb.id, prixMarche: { gt: 0 } },
      orderBy: { prixMarche: 'desc' },
      take: 10,
    })
    const valeur = top10.reduce((s, c) => s + Number(c.prixMarche ?? 0), 0)
    if (valeur <= 0) continue

    await prisma.prixHistorique.upsert({
      where: { etbId_date: { etbId: etb.id, date: aujourd } },
      update: { valeurTop10Cartes: valeur },
      create: { etbId: etb.id, date: aujourd, valeurTop10Cartes: valeur },
    })
    nb++
  }
  console.log(`[cron] Snapshot valeur top 10 cartes : ${nb} ETBs`)
}

// 07:30 chaque matin — après la mise à jour des prix ETB
cron.schedule('30 7 * * *', mettreAJourPrixCartes, {
  timezone: 'Europe/Paris',
})

console.log('[cron] Job prix-cartes planifié (07:30 Europe/Paris)')
