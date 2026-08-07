// Client HTTP unique. Toutes les requêtes de l'application passent par ici :
// c'est le seul endroit qui connaît l'URL de base, le jeton et la forme des
// erreurs renvoyées par le backend.

const BASE_URL = '/api'
const CLE_JETON = 'etbvault_token'

/**
 * Erreur d'appel API. `statut` porte le code HTTP (0 si le réseau a échoué),
 * ce qui permet aux écrans de distinguer « non connecté » de « serveur en
 * panne » sans reparser un message.
 */
export class ApiError extends Error {
  constructor(statut, message) {
    super(message)
    this.name = 'ApiError'
    this.statut = statut
  }

  get estReseau() {
    return this.statut === 0
  }

  get estAuth() {
    return this.statut === 401 || this.statut === 403
  }
}

export function lireJeton() {
  return localStorage.getItem(CLE_JETON)
}

export function ecrireJeton(jeton) {
  if (jeton) localStorage.setItem(CLE_JETON, jeton)
  else localStorage.removeItem(CLE_JETON)
}

/**
 * Appelle l'API et renvoie le JSON, ou lève une ApiError.
 *
 * Aucun appelant n'avale l'erreur ici : c'est délibéré. Les écrans doivent
 * pouvoir afficher « ça a raté » plutôt qu'un chargement infini.
 */
export async function appelApi(chemin, { methode = 'GET', corps, auth = false } = {}) {
  const entetes = {}
  if (corps !== undefined) entetes['Content-Type'] = 'application/json'
  if (auth) {
    const jeton = lireJeton()
    if (jeton) entetes.Authorization = `Bearer ${jeton}`
  }

  let reponse
  try {
    reponse = await fetch(`${BASE_URL}${chemin}`, {
      method: methode,
      headers: entetes,
      body: corps !== undefined ? JSON.stringify(corps) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Serveur injoignable')
  }

  const donnees = await reponse.json().catch(() => null)
  if (!reponse.ok) {
    throw new ApiError(reponse.status, donnees?.error ?? 'Erreur serveur')
  }
  return donnees
}
