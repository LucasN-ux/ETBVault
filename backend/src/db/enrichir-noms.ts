import 'dotenv/config'
import prisma from './client'

// Pose le nom d'affichage FR (`nomFr`) sans toucher au `nom` exact CM (lien CM).
// Produit rattaché à un set → [Type FR] + nom de set FR (TCGdex).
// Produit sans set → francisation des mots de type dans le nom EN.
// Usage : npm run enrich:noms

const TCGDEX_FR = 'https://api.tcgdex.net/v2/fr'

const TYPE_FR: Record<string, string> = {
  ETB: 'Coffret Dresseur d’Élite',
  DISPLAY: 'Display',
  BOOSTER: 'Booster',
  COFFRET: 'Coffret',
  PREMIUM: 'Coffret Premium',
  TIN: 'Pokébox',
  BLISTER: 'Blister',
  AUTRE: '',
}

// Francisation des mots de type (ordre : expressions longues d'abord).
const REMPL: Array<[RegExp, string]> = [
  [/Elite Trainer Box/gi, 'Coffret Dresseur d’Élite'],
  [/Booster Bundle/gi, 'Bundle'],
  [/Booster Box/gi, 'Display'],
  [/Booster Pack/gi, 'Booster'],
  [/Premium Collection/gi, 'Coffret Premium'],
  [/Collection Box/gi, 'Coffret'],
  [/Build & Battle Box/gi, 'Build & Battle'],
  [/Build & Battle Stadium/gi, 'Build & Battle'],
  [/\bTins?\b/gi, 'Pokébox'],
  [/\bCase\b/gi, 'Carton'],
]
function franciser(nom: string): string {
  let s = nom
  for (const [re, fr] of REMPL) s = s.replace(re, fr)
  return s
}

async function main(): Promise<void> {
  const produits = await prisma.etb.findMany({ select: { id: true, nom: true, type: true, setId: true } })
  const setIds = [...new Set(produits.map((p) => p.setId).filter((s): s is string => !!s))]
  console.log(`[enrich:noms] ${produits.length} produits · ${setIds.length} sets (noms FR TCGdex)`)

  const setFr = new Map<string, string>()
  for (const sid of setIds) {
    const d = await fetch(`${TCGDEX_FR}/sets/${sid}`).then((r) => r.json()).catch(() => null) as { name?: string } | null
    if (d?.name) setFr.set(sid, d.name)
  }

  let avecSet = 0
  let francises = 0
  for (const p of produits) {
    let nomFr: string
    if (p.setId && setFr.get(p.setId)) {
      const t = TYPE_FR[p.type] ?? ''
      nomFr = (t ? `${t} ` : '') + setFr.get(p.setId)
      avecSet++
    } else {
      nomFr = franciser(p.nom)
      francises++
    }
    await prisma.etb.update({ where: { id: p.id }, data: { nomFr } })
  }
  console.log(`[enrich:noms] ${avecSet} via set FR TCGdex · ${francises} par francisation du nom EN`)
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect().finally(() => process.exit(1)) })
