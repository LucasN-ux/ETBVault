// Erreurs HTTP métier. Une route lève, le middleware d'erreur traduit.
// Tout ce qui n'est pas une ErreurHttp est considéré comme un bug : le client
// reçoit un message générique, les détails restent dans les logs serveur.

export class ErreurHttp extends Error {
  constructor(
    readonly statut: number,
    message: string,
  ) {
    super(message)
    this.name = 'ErreurHttp'
  }
}

export const requeteInvalide = (message: string) => new ErreurHttp(400, message)
export const nonAuthentifie = (message = 'Non authentifié') => new ErreurHttp(401, message)
export const interdit = (message = 'Accès refusé') => new ErreurHttp(403, message)
export const introuvable = (message = 'Ressource introuvable') => new ErreurHttp(404, message)
export const conflit = (message: string) => new ErreurHttp(409, message)
