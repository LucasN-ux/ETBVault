// Seed données de prix historiques réalistes pour toutes les ETBs
// Génère 12 mois de données mensuelles avec des tendances cohérentes
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Profils de prix par ère — reflète la rareté et l'ancienneté
const PROFILS = {
  'Méga-Évolution': { base: 60, varianceInit: 0, tendance: 0.02, annonces: [5, 15] },
  'Écarlate et Violet': { base: 55, varianceInit: 0.1, tendance: 0.015, annonces: [10, 40] },
  'Épée et Bouclier': { base: 80, varianceInit: 0.3, tendance: 0.03, annonces: [8, 30] },
  'Soleil et Lune': { base: 120, varianceInit: 0.5, tendance: 0.04, annonces: [5, 20] },
  'XY': { base: 180, varianceInit: 0.7, tendance: 0.05, annonces: [3, 12] },
  'Noir et Blanc': { base: 220, varianceInit: 0.8, tendance: 0.04, annonces: [2, 8] },
}

// ETBs vedettes — celles qui ont beaucoup monté
const BOOSTS = {
  'sv03.5': 2.5,   // 151 — très populaire
  'sv08.5': 1.8,   // Évolutions Prismatiques
  'swsh12.5': 1.6, // Zénith Suprême
  'swsh07': 1.7,   // Épée et Bouclier Étoiles Brillantes
  'swsh05': 1.5,   // Épée et Bouclier — Batailles Stylées
  'sm115': 1.9,    // Soleil et Lune — Évolutions
  'xy12': 1.8,     // Évolutions XY
}

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function genererHistorique(etb, moisArriere = 12) {
  const profil = PROFILS[etb.era] || { base: 60, varianceInit: 0.1, tendance: 0.01, annonces: [10, 30] }
  const boost = BOOSTS[etb.id] || 1
  const prixRef = Number(etb.prixSortie || profil.base)

  const points = []
  const maintenant = new Date()

  for (let m = moisArriere; m >= 0; m--) {
    const date = new Date(maintenant)
    date.setMonth(date.getMonth() - m)
    date.setDate(1)
    date.setHours(0, 0, 0, 0)

    // Prix de base en fonction de l'ancienneté
    const progress = (moisArriere - m) / moisArriere
    const multiplicateur = 1 + profil.varianceInit * boost * progress + rand(-0.03, 0.03)
    const cmPrixMoyen = parseFloat((prixRef * multiplicateur).toFixed(2))
    const cmPrixBas = parseFloat((cmPrixMoyen * rand(0.75, 0.90)).toFixed(2))
    const cmNbAnnonces = Math.round(rand(profil.annonces[0], profil.annonces[1]))

    points.push({
      etbId: etb.id,
      date,
      cmPrixMoyen,
      cmPrixBas,
      cmNbAnnonces,
      ebayPrixMoyen: parseFloat((cmPrixMoyen * rand(0.95, 1.1)).toFixed(2)),
    })
  }

  return points
}

async function seedPrix() {
  console.log('Seeding prix historiques...')

  const etbs = await prisma.etb.findMany()
  let total = 0

  for (const etb of etbs) {
    const points = genererHistorique(etb, 12)

    for (const point of points) {
      await prisma.prixHistorique.upsert({
        where: { etbId_date: { etbId: point.etbId, date: point.date } },
        update: {
          cmPrixMoyen: point.cmPrixMoyen,
          cmPrixBas: point.cmPrixBas,
          cmNbAnnonces: point.cmNbAnnonces,
          ebayPrixMoyen: point.ebayPrixMoyen,
        },
        create: point,
      })
      total++
    }
  }

  console.log(`✓ ${total} points de prix créés pour ${etbs.length} ETBs`)
  await prisma.$disconnect()
}

seedPrix().catch((e) => {
  console.error(e)
  process.exit(1)
})
