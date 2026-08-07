import type { NextFunction, Request, Response } from 'express'
import { ErreurHttp } from '../lib/erreurs'

// Route inconnue → 404 JSON (et pas la page HTML par défaut d'Express).
export function routeIntrouvable(req: Request, res: Response): void {
  res.status(404).json({ error: `Route inconnue : ${req.method} ${req.originalUrl}` })
}

// Gestionnaire d'erreur central, monté en dernier.
//
// Règle : seules les ErreurHttp sont des messages destinés au client. Tout le
// reste est un bug — on journalise la stack côté serveur et on renvoie un
// message générique. Auparavant chaque route faisait `res.json({ error: e.message })`,
// ce qui expédiait au client les erreurs Prisma, chemins de fichiers compris.
export function gestionnaireErreurs(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ErreurHttp) {
    res.status(err.statut).json({ error: err.message })
    return
  }

  console.error('[erreur]', err)
  res.status(500).json({ error: 'Erreur serveur' })
}
