import type { Carte } from '@prisma/client'
import * as repo from '../repositories/etbs.repo'
import { detailsCartes, idsCartesDuSet, urlImageCarte } from './tcgdex'

/**
 * Cartes du set d'une ETB, avec cache en base.
 *
 * Premier appel : on interroge TCGdex et on enregistre. Appels suivants : on
 * sert le cache. Une ETB sans `setId`, ou dont le set est inconnu de TCGdex,
 * renvoie une liste vide — ce n'est pas une erreur, tous les sets ne sont pas
 * couverts.
 */
export async function cartesDuSet(etbId: string, setId: string | null): Promise<Carte[]> {
  const cache = await repo.listerCartes(etbId)
  if (cache.length > 0) return cache

  if (!setId) return []

  const ids = await idsCartesDuSet(setId)
  if (ids.length === 0) return []

  const cartes = await detailsCartes(ids)
  await repo.enregistrerCartes(
    cartes.map((carte) => ({
      id: carte.id,
      etbId,
      nom: carte.name,
      numero: carte.localId ?? null,
      imageUrl: urlImageCarte(carte),
      rarete: carte.rarity ?? null,
      prixMarche: carte.pricing?.cardmarket?.avg ?? null,
    })),
  )

  return repo.listerCartes(etbId)
}
