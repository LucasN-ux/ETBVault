import type { PrixHistorique } from '@prisma/client'
import type { Decimal } from '@prisma/client/runtime/library'
import prisma from '../db/client'

// Historique de prix d'une ETB donnée. Les vues transversales (toutes ETB
// confondues) sont dans marche.repo.ts.

/** Champs modifiables d'un point de prix. Tous optionnels : on n'écrase que ce qu'on fournit. */
export interface PointAEnregistrer {
  cmPrixMoyen?: number
  cmPrixBas?: number
  cmNbAnnonces?: number
  ebayPrixMoyen?: number
  origine?: string
}

export function listerHistorique(etbId: string): Promise<PrixHistorique[]> {
  return prisma.prixHistorique.findMany({ where: { etbId }, orderBy: { date: 'asc' } })
}

/** Historique utile au calcul de mouvement : uniquement les points valorisés. */
export function listerHistoriqueValorise(
  etbId: string,
): Promise<Array<{ date: Date; cmPrixMoyen: Decimal | null }>> {
  return prisma.prixHistorique.findMany({
    where: { etbId, cmPrixMoyen: { not: null } },
    orderBy: { date: 'asc' },
    select: { date: true, cmPrixMoyen: true },
  })
}

export function dernierPoint(etbId: string): Promise<PrixHistorique | null> {
  return prisma.prixHistorique.findFirst({
    where: { etbId, cmPrixMoyen: { not: null } },
    orderBy: { date: 'desc' },
  })
}

/** Un point par ETB et par jour : on écrase celui du jour s'il existe déjà. */
export function enregistrerPoint(
  etbId: string,
  date: Date,
  point: PointAEnregistrer,
): Promise<PrixHistorique> {
  return prisma.prixHistorique.upsert({
    where: { etbId_date: { etbId, date } },
    update: point,
    create: { etbId, date, ...point },
  })
}
