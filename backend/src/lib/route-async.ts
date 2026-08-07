import type { NextFunction, Request, RequestHandler, Response } from 'express'

// Express 4 n'attrape pas les rejets de promesse : sans ce wrapper, une erreur
// dans un handler `async` laisse la requête pendante jusqu'au timeout du client.
// `routeAsync` redirige le rejet vers le middleware d'erreur.
export function routeAsync(
  handler: (req: Request, res: Response) => Promise<unknown>,
): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next)
  }
}
