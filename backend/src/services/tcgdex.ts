// Accès à l'API TCGdex — cartes et métadonnées de sets.
// Seule source d'images du projet : les visuels de cartes et le logo de set.

const BASE_URL = 'https://api.tcgdex.net/v2/fr'
const TAILLE_LOT = 50

export interface CarteTcgdex {
  id: string
  name: string
  localId: string
  image?: string
  rarity?: string
  pricing?: { cardmarket?: { avg?: number } }
}

interface SetTcgdex {
  cards?: Array<{ id: string }>
}

async function json<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** Identifiants des cartes d'un set. Tableau vide si le set est inconnu de TCGdex. */
export async function idsCartesDuSet(setId: string): Promise<string[]> {
  const set = await json<SetTcgdex>(`${BASE_URL}/sets/${encodeURIComponent(setId)}`)
  return (set?.cards ?? []).map((c) => c.id)
}

/**
 * Détail des cartes, par lots de 50 en parallèle.
 * Les cartes que TCGdex ne renvoie pas sont simplement absentes du résultat :
 * un set partiellement disponible vaut mieux qu'une erreur.
 */
export async function detailsCartes(ids: string[]): Promise<CarteTcgdex[]> {
  const cartes: CarteTcgdex[] = []
  for (let i = 0; i < ids.length; i += TAILLE_LOT) {
    const lot = ids.slice(i, i + TAILLE_LOT)
    const resultats = await Promise.all(
      lot.map((id) => json<CarteTcgdex>(`${BASE_URL}/cards/${encodeURIComponent(id)}`)),
    )
    for (const carte of resultats) {
      if (carte) cartes.push(carte)
    }
  }
  return cartes
}

/** URL de l'image haute définition d'une carte, ou null si TCGdex n'en a pas. */
export function urlImageCarte(carte: CarteTcgdex): string | null {
  return carte.image ? `${carte.image}/high.webp` : null
}
