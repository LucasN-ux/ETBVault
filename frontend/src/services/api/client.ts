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
  readonly statut: number

  constructor(statut: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.statut = statut
  }

  get estReseau(): boolean {
    return this.statut === 0
  }

  get estAuth(): boolean {
    return this.statut === 401 || this.statut === 403
  }
}

export function lireJeton(): string | null {
  return localStorage.getItem(CLE_JETON)
}

export function ecrireJeton(jeton: string | null): void {
  if (jeton) localStorage.setItem(CLE_JETON, jeton)
  else localStorage.removeItem(CLE_JETON)
}

interface OptionsAppel {
  methode?: 'GET' | 'POST' | 'DELETE'
  corps?: unknown
  auth?: boolean
}

/**
 * Appelle l'API et renvoie le JSON typé, ou lève une ApiError.
 *
 * `T` décrit ce que le backend est censé renvoyer : c'est une déclaration, pas
 * une validation. Aucun appelant n'avale l'erreur ici, et c'est délibéré — les
 * écrans doivent pouvoir afficher « ça a raté » plutôt qu'un chargement infini.
 */
export async function appelApi<T>(
  chemin: string,
  { methode = 'GET', corps, auth = false }: OptionsAppel = {},
): Promise<T> {
  const entetes: Record<string, string> = {}
  if (corps !== undefined) entetes['Content-Type'] = 'application/json'
  if (auth) {
    const jeton = lireJeton()
    if (jeton) entetes['Authorization'] = `Bearer ${jeton}`
  }

  let reponse: Response
  try {
    reponse = await fetch(`${BASE_URL}${chemin}`, {
      method: methode,
      headers: entetes,
      body: corps !== undefined ? JSON.stringify(corps) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Serveur injoignable')
  }

  const donnees: unknown = await reponse.json().catch(() => null)
  if (!reponse.ok) {
    const message =
      typeof donnees === 'object' && donnees !== null && 'error' in donnees
        ? String((donnees as { error: unknown }).error)
        : 'Erreur serveur'
    throw new ApiError(reponse.status, message)
  }
  return donnees as T
}
