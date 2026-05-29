// Script de mise à jour des box_image_url en base
// Usage : node src/db/update-box-images.js
//
// Lit tous les fichiers dans frontend/public/boxes/
// Le nom du fichier = l'ID de l'ETB (ex: sv01.jpg → etb id "sv01")
// Met à jour box_image_url avec l'URL publique /boxes/<fichier>

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()
const BOXES_DIR = path.join(__dirname, '../../../frontend/public/boxes')

async function main() {
  const fichiers = fs.readdirSync(BOXES_DIR).filter((f) =>
    /\.(jpg|jpeg|png|webp|avif)$/i.test(f)
  )

  if (fichiers.length === 0) {
    console.log('Aucune image trouvée dans frontend/public/boxes/')
    return
  }

  console.log(`${fichiers.length} image(s) trouvée(s)`)

  let ok = 0
  let introuvable = 0

  for (const fichier of fichiers) {
    const etbId = path.parse(fichier).name        // "sv01.jpg" → "sv01"
    const url = `/boxes/${fichier}`               // URL publique Vite

    const result = await prisma.etb.updateMany({
      where: { id: etbId },
      data: { boxImageUrl: url },
    })

    if (result.count === 0) {
      console.warn(`  ✗ ${fichier} — aucun ETB avec l'id "${etbId}"`)
      introuvable++
    } else {
      console.log(`  ✓ ${etbId} → ${url}`)
      ok++
    }
  }

  console.log(`\nTerminé : ${ok} mis à jour, ${introuvable} non trouvés.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
