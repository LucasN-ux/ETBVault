import type { Carte, Etb } from '@prisma/client'
import prisma from '../db/client'

// Accès en base aux ETB et à leurs cartes. Aucune règle métier ici : le
// repository sait lire et écrire, il ne sait pas quoi faire d'un résultat vide.

/** Toutes les ETB, de la plus récente à la plus ancienne. */
export function listerEtbs(): Promise<Etb[]> {
  return prisma.etb.findMany({ orderBy: { dateSortie: 'desc' } })
}

export function trouverEtb(id: string): Promise<Etb | null> {
  return prisma.etb.findUnique({ where: { id } })
}

/** Cartes déjà en cache pour cette ETB, les plus chères d'abord. */
export function listerCartes(etbId: string): Promise<Carte[]> {
  return prisma.carte.findMany({ where: { etbId }, orderBy: { prixMarche: 'desc' } })
}

export interface NouvelleCarte {
  id: string
  etbId: string
  nom: string
  numero: string | null
  imageUrl: string | null
  rarete: string | null
  prixMarche: number | null
}

/** Insère les cartes absentes du cache. Idempotent. */
export async function enregistrerCartes(cartes: NouvelleCarte[]): Promise<number> {
  if (cartes.length === 0) return 0
  const { count } = await prisma.carte.createMany({ data: cartes, skipDuplicates: true })
  return count
}
