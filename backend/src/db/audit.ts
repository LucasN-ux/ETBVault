import 'dotenv/config'
import prisma from './client'

// Complétude des données du catalogue ETB. Usage : npm run audit
//
// Sert à repérer ce qui manque avant de se demander pourquoi le site affiche un
// trou : une ETB sans cmIdProducts n'aura jamais de prix, une ETB sans ère est
// invisible dans la vue groupée du catalogue.

async function main(): Promise<void> {
  const etbs = await prisma.etb.findMany({
    select: {
      id: true,
      era: true,
      setId: true,
      dateSortie: true,
      imageUrl: true,
      cmIdProducts: true,
    },
  })

  const groupes = await prisma.prixHistorique.groupBy({ by: ['etbId'], _count: true })
  const avecPrix = new Set(groupes.map((g) => g.etbId))

  const compter = (predicat: (e: (typeof etbs)[number]) => boolean) => etbs.filter(predicat).length
  const ligne = (label: string, n: number) =>
    console.log(`  ${label.padEnd(22)} ${String(n).padStart(4)} / ${etbs.length}`)

  console.log(`\nCatalogue ETB — ${etbs.length} entrées\n`)
  ligne('ère renseignée', compter((e) => !!e.era))
  ligne('set TCGdex', compter((e) => !!e.setId))
  ligne('date de sortie', compter((e) => !!e.dateSortie))
  ligne('image (logo de set)', compter((e) => !!e.imageUrl))
  ligne('idProduct Cardmarket', compter((e) => e.cmIdProducts.length > 0))
  ligne('historique de prix', compter((e) => avecPrix.has(e.id)))

  const sansEre = etbs.filter((e) => !e.era)
  if (sansEre.length > 0) {
    console.log(`\nSans ère — invisibles dans la vue groupée du catalogue (${sansEre.length}) :`)
    console.log(`  ${sansEre.map((e) => e.id).join(', ')}`)
  }

  const sansPrixPossible = etbs.filter((e) => e.cmIdProducts.length === 0)
  if (sansPrixPossible.length > 0) {
    console.log(`\nSans idProduct Cardmarket — n'auront jamais de prix (${sansPrixPossible.length}) :`)
    console.log(`  ${sansPrixPossible.map((e) => e.id).join(', ')}`)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    return prisma.$disconnect().finally(() => process.exit(1))
  })
