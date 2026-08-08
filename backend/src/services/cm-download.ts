// Collecte du Price Guide Cardmarket.
//
// Source unique et volontairement légale : l'export officiel publié par
// Cardmarket — https://www.cardmarket.com/en/Pokemon/Data — récupéré une fois
// par jour. Pas de scraping de pages, retiré à dessein (commit c981b54).

import prisma from '../db/client'
import { aujourdhuiUtc, veille } from '../lib/dates'
import { telechargerJsonCm, URL_PRICE_GUIDE } from './cm-json'

interface EntreePriceGuide {
  idProduct: number
  trend: number | null
  low: number | null
}

/** Prix du jour indexés par idProduct Cardmarket. */
type IndexPrix = Record<number, { trend: number | null; low: number | null }>

async function telechargerPrixGuide(): Promise<IndexPrix> {
  const data = await telechargerJsonCm<{ priceGuides?: EntreePriceGuide[] }>(URL_PRICE_GUIDE)
  const entrees = data.priceGuides ?? []
  console.log(`[cm-download] ${entrees.length} entrées dans le Price Guide`)

  const index: IndexPrix = {}
  for (const entree of entrees) {
    index[entree.idProduct] = {
      trend: entree.trend != null ? Number(entree.trend) : null,
      low: entree.low != null ? Number(entree.low) : null,
    }
  }
  return index
}

function calculerPrix(
  prixIndex: IndexPrix,
  ids: number[],
): { cmPrixMoyen: number | null; cmPrixBas: number | null } {
  if (!ids || ids.length === 0) return { cmPrixMoyen: null, cmPrixBas: null }

  const trends: number[] = []
  const lows: number[] = []

  for (const id of ids) {
    const p = prixIndex[id]
    if (p?.trend != null) trends.push(p.trend)
    if (p?.low != null) lows.push(p.low)
  }

  return {
    cmPrixMoyen: trends.length > 0
      ? Math.round((trends.reduce((s, v) => s + v, 0) / trends.length) * 100) / 100
      : null,
    cmPrixBas: lows.length > 0 ? Math.min(...lows) : null,
  }
}

export async function mettreAJourPrixDepuisCM(): Promise<{ ok: number; sans_prix: number; inchanges: number }> {
  const prixIndex = await telechargerPrixGuide()

  const aujourd = aujourdhuiUtc()

  // Seules les ETB reliées à au moins un idProduct CM peuvent avoir un prix.
  const etbs = await prisma.etb.findMany({
    where: { cmIdProducts: { isEmpty: false } },
    select: { id: true, cmIdProducts: true },
  })
  let ok = 0
  let sans_prix = 0
  let inchanges = 0

  for (const { id: etbId, cmIdProducts } of etbs) {
    const { cmPrixMoyen, cmPrixBas } = calculerPrix(prixIndex, cmIdProducts)

    if (cmPrixMoyen === null) {
      sans_prix++
      continue
    }

    // Dernier prix connu en base (toutes dates confondues)
    const dernierEnDB = await prisma.prixHistorique.findFirst({
      where: { etbId: etbId, cmPrixMoyen: { not: null } },
      orderBy: { date: 'desc' },
      select: { date: true, cmPrixMoyen: true },
    })

    const dernierPrix = dernierEnDB ? Number(dernierEnDB.cmPrixMoyen) : null
    const prixChange = dernierPrix === null || Math.abs(cmPrixMoyen - dernierPrix) >= 0.01

    if (!prixChange) {
      inchanges++
      continue
    }

    // Si le dernier prix connu date d'avant aujourd'hui, on pose un palier à la
    // veille : le graphique reste en escalier au lieu d'interpoler une pente
    // qui n'a jamais existé.
    if (dernierEnDB && dernierEnDB.date < aujourd) {
      const dateVeille = veille(aujourd)
      await prisma.prixHistorique.upsert({
        where: { etbId_date: { etbId, date: dateVeille } },
        update: { cmPrixMoyen: dernierPrix, cmPrixBas: null },
        create: { etbId, date: dateVeille, cmPrixMoyen: dernierPrix ?? cmPrixMoyen, cmPrixBas: null },
      })
    }

    // Nouveau prix du jour
    await prisma.prixHistorique.upsert({
      where: { etbId_date: { etbId: etbId, date: aujourd } },
      update: { cmPrixMoyen, cmPrixBas },
      create: { etbId: etbId, date: aujourd, cmPrixMoyen, cmPrixBas },
    })

    console.log(`[cm-download] ✓ ${etbId}: ${dernierPrix ?? '—'}€ → ${cmPrixMoyen}€`)
    ok++
  }

  console.log(`[cm-download] ${ok} mis à jour, ${inchanges} inchangés, ${sans_prix} sans prix.`)
  return { ok, sans_prix, inchanges }
}
