// Téléchargement des exports publics de Cardmarket.
//
// Ces fichiers — Price Guide et catalogue produits — sont servis en accès
// libre sur le S3 de Cardmarket. Vérifié : HTTP 200 sans en-tête
// d'authentification, sur les deux.
//
// Le code ouvrait auparavant Chromium via Playwright pour se connecter à un
// compte Cardmarket avant de les récupérer. C'était inutile, et coûteux : un
// navigateur complet à installer et à faire tourner, des identifiants à
// stocker en clair chez l'hébergeur, et une connexion automatisée qui casse
// au moindre changement du formulaire de login ou à l'activation d'une
// double authentification.

const BASE = 'https://downloads.s3.cardmarket.com/productCatalog'

/** Price Guide Pokémon — prix du jour de chaque produit. */
export const URL_PRICE_GUIDE = `${BASE}/priceGuide/price_guide_6.json`

/** Catalogue des produits non-singles (scellés). */
export const URL_CATALOGUE_PRODUITS = `${BASE}/productList/products_nonsingles_6.json`

/** Récupère un export Cardmarket. Lève si la réponse n'est pas exploitable. */
export async function telechargerJsonCm<T>(url: string): Promise<T> {
  const nom = url.split('/').pop()
  console.log(`[cardmarket] Téléchargement de ${nom}...`)

  const reponse = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(120_000),
  })
  if (!reponse.ok) {
    throw new Error(`Téléchargement ${nom} : ${reponse.status} ${reponse.statusText}`)
  }

  return (await reponse.json()) as T
}
