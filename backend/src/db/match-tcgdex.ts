import 'dotenv/config'
import prisma from './client'

// Apparie les produits sans setId au catalogue de sets TCGdex (par correspondance
// du nom du set dans le nom du produit), pour récupérer setId, logo, date de sortie
// et affiner l'ère via la série. Usage : npm run match:tcgdex

const TCGDEX = 'https://api.tcgdex.net/v2/en'
const ERA_PAR_SERIE: Record<string, string> = {
  sv: 'Écarlate et Violet', swsh: 'Épée et Bouclier', sm: 'Soleil et Lune',
  xy: 'XY', bw: 'Noir et Blanc', me: 'Méga-Évolution',
}
// Noms de sets trop courts/ambigus à ignorer pour le substring match.
const DENY = new Set(['xy', 'ex', 'dp'])

interface SetResume { id: string; name: string; logo?: string }
interface SetDetail { id: string; releaseDate?: string; serie?: { id: string; name: string } }

async function main(): Promise<void> {
  const sets = (await fetch(`${TCGDEX}/sets`).then((r) => r.json())) as SetResume[]
  const cands = sets
    .filter((s) => s.name && s.name.length >= 3 && !DENY.has(s.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length) // plus longue correspondance d'abord

  const produits = await prisma.produit.findMany({ where: { setId: null }, select: { id: true, nom: true } })
  console.log(`[match:tcgdex] ${produits.length} produits sans setId · ${cands.length} sets candidats`)

  const detailCache = new Map<string, SetDetail | null>()
  async function detail(id: string): Promise<SetDetail | null> {
    if (!detailCache.has(id)) {
      detailCache.set(id, await fetch(`${TCGDEX}/sets/${id}`).then((r) => r.json()).catch(() => null) as SetDetail | null)
    }
    return detailCache.get(id) ?? null
  }

  let matched = 0
  for (const p of produits) {
    const n = p.nom.toLowerCase()
    const set = cands.find((s) => n.includes(s.name.toLowerCase()))
    if (!set) continue
    const d = await detail(set.id)
    const data: { setId: string; imageUrl?: string; dateSortie?: Date; era?: string } = { setId: set.id }
    if (set.logo) data.imageUrl = `${set.logo}.webp`
    if (d?.releaseDate) data.dateSortie = new Date(d.releaseDate)
    const ere = d?.serie?.id ? ERA_PAR_SERIE[d.serie.id] : undefined
    if (ere) data.era = ere
    await prisma.produit.update({ where: { id: p.id }, data })
    matched++
  }
  console.log(`[match:tcgdex] ${matched}/${produits.length} produits appariés (setId + logo + date + série)`)
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect().finally(() => process.exit(1)) })
