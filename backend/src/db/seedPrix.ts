import 'dotenv/config'
import type { Etb } from '@prisma/client'
import prisma from './client'

// ⚠ DONNÉES FICTIVES — ce script GÉNÈRE des prix, il n'en collecte aucun.
//
// Il fabrique 12 mois d'historique plausible pour peupler un environnement de
// développement quand la collecte Cardmarket n'est pas configurée. Les prix
// sont tirés au hasard autour d'un profil par ère : ils ne veulent rien dire.
//
// À ne JAMAIS lancer sur la base de production : les points créés sont
// indiscernables des vrais une fois en base, et le site promet des faits.
//
// La vraie source est le Price Guide officiel Cardmarket (npm run refresh:etb).

interface ProfilEre {
  base: number
  varianceInit: number
  tendance: number
  annonces: [number, number]
}

const PROFILS: Record<string, ProfilEre> = {
  'Méga-Évolution': { base: 60, varianceInit: 0, tendance: 0.02, annonces: [5, 15] },
  'Écarlate et Violet': { base: 55, varianceInit: 0.1, tendance: 0.015, annonces: [10, 40] },
  'Épée et Bouclier': { base: 80, varianceInit: 0.3, tendance: 0.03, annonces: [8, 30] },
  'Soleil et Lune': { base: 120, varianceInit: 0.5, tendance: 0.04, annonces: [5, 20] },
  XY: { base: 180, varianceInit: 0.7, tendance: 0.05, annonces: [3, 12] },
  'Noir et Blanc': { base: 220, varianceInit: 0.8, tendance: 0.04, annonces: [2, 8] },
}

const PROFIL_PAR_DEFAUT: ProfilEre = {
  base: 60,
  varianceInit: 0.1,
  tendance: 0.01,
  annonces: [10, 30],
}

/** ETB dont la cote a fortement grimpé — pour que le jeu de test ne soit pas plat. */
const BOOSTS: Record<string, number> = {
  'sv03.5': 2.5,
  'sv08.5': 1.8,
  'swsh12.5': 1.6,
  swsh07: 1.7,
  swsh05: 1.5,
  sm115: 1.9,
  xy12: 1.8,
}

interface PointGenere {
  etbId: string
  date: Date
  cmPrixMoyen: number
  cmPrixBas: number
  cmNbAnnonces: number
  ebayPrixMoyen: number
}

const entre = (min: number, max: number): number => min + Math.random() * (max - min)
const deuxDecimales = (n: number): number => Math.round(n * 100) / 100

/** Minuit UTC du premier jour du mois, `moisAvant` mois en arrière. */
function premierDuMois(moisAvant: number): Date {
  const maintenant = new Date()
  return new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - moisAvant, 1))
}

function genererHistorique(etb: Etb, moisArriere = 12): PointGenere[] {
  const profil = (etb.era ? PROFILS[etb.era] : undefined) ?? PROFIL_PAR_DEFAUT
  const boost = BOOSTS[etb.id] ?? 1
  const prixRef = Number(etb.prixSortie ?? profil.base)

  const points: PointGenere[] = []
  for (let m = moisArriere; m >= 0; m--) {
    const progression = (moisArriere - m) / moisArriere
    const multiplicateur = 1 + profil.varianceInit * boost * progression + entre(-0.03, 0.03)
    const cmPrixMoyen = deuxDecimales(prixRef * multiplicateur)

    points.push({
      etbId: etb.id,
      date: premierDuMois(m),
      cmPrixMoyen,
      cmPrixBas: deuxDecimales(cmPrixMoyen * entre(0.75, 0.9)),
      cmNbAnnonces: Math.round(entre(profil.annonces[0], profil.annonces[1])),
      ebayPrixMoyen: deuxDecimales(cmPrixMoyen * entre(0.95, 1.1)),
    })
  }
  return points
}

async function seedPrix(): Promise<void> {
  console.warn('⚠  Génération de prix FICTIFS — usage développement uniquement.')

  const etbs = await prisma.etb.findMany()
  let total = 0

  for (const etb of etbs) {
    for (const point of genererHistorique(etb)) {
      const { etbId, date, ...valeurs } = point
      await prisma.prixHistorique.upsert({
        where: { etbId_date: { etbId, date } },
        update: { ...valeurs, origine: 'fictif' },
        create: { etbId, date, ...valeurs, origine: 'fictif' },
      })
      total++
    }
  }

  console.log(`✓ ${total} points fictifs créés pour ${etbs.length} ETB (origine = "fictif").`)
}

seedPrix()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    return prisma.$disconnect().finally(() => process.exit(1))
  })
