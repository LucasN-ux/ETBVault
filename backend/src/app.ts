import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import listEndpoints from 'express-list-endpoints'
import swaggerUi from 'swagger-ui-express'
import { Prisma } from '@prisma/client'

import prisma from './db/client'
import { openapiSpec } from './docs/openapi'
import { config } from './lib/config'
import { routeAsync } from './lib/route-async'
import { gestionnaireErreurs, routeIntrouvable } from './middleware/erreurs'

import adminRouter from './routes/admin'
import authRouter from './routes/auth'
import etbsRouter from './routes/etbs'
import marcheRouter from './routes/marche'
import prixRouter from './routes/prix'
import vaultRouter from './routes/vault'

// Ce fichier ne fait que du câblage : middlewares, montage des routeurs, gestion
// d'erreur. Toute logique métier vit dans routes/ + repositories/ + services/.
const app = express()

/**
 * Nature d'une erreur Prisma, sans son message.
 *
 * Les messages Prisma citent l'hôte et la chaîne de connexion : ils restent
 * dans les journaux. Le type et le code (P1001, P2021…) suffisent à identifier
 * le problème et ne révèlent rien.
 */
function diagnostic(e: unknown): { type: string; code: string } {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return { type: 'requete', code: e.code }
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    return { type: 'connexion', code: e.errorCode ?? 'sans code' }
  }
  if (e instanceof Prisma.PrismaClientValidationError) {
    return { type: 'validation', code: 'sans code' }
  }
  return { type: e instanceof Error ? e.name : 'inconnu', code: 'sans code' }
}

// CORS restreint aux origines déclarées. Sans liste, tout est accepté : c'est
// le confort du développement local, jamais ce qu'on veut en production —
// l'API sert des routes authentifiées par jeton porteur.
app.use(
  cors(
    config.originesAutorisees.length > 0
      ? { origin: config.originesAutorisees, credentials: true }
      : {},
  ),
)
app.use(express.json())

// Le processus répond-il ? C'est la sonde de Render, et elle ne doit dépendre
// de rien d'autre : si elle échouait quand la base est indisponible, Render
// redémarrerait le service en boucle — sans rien réparer, et en rendant le
// diagnostic ci-dessous inaccessible au moment où il sert le plus.
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// La base répond-elle ? À interroger quand l'API renvoie des 500 : elle dit si
// le problème vient de la connexion ou d'une requête, sans avoir à ouvrir les
// journaux de l'hébergeur.
//
// Le message d'erreur reste côté serveur — Prisma y cite l'hôte et la chaîne
// de connexion. Seuls le type et le code (P1001, P2021…) sortent : ils
// suffisent à identifier le problème et ne révèlent rien.
app.get(
  '/health/base',
  routeAsync(async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.json({ base: 'ok' })
    } catch (e) {
      console.error('[health] Base injoignable :', e)
      res.status(503).json({ base: 'injoignable', ...diagnostic(e) })
    }
  }),
)

// Documentation interactive — http://localhost:3001/api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: 'ETBVault API' }))
app.get('/api/openapi.json', (_req, res) => res.json(openapiSpec))

// Introspection : liste des routes réellement montées
app.get('/api/routes', (_req, res) => {
  const routes = listEndpoints(app)
    .map((e) => ({ path: e.path, methods: e.methods }))
    .sort((a, b) => a.path.localeCompare(b.path))
  res.json({ total: routes.length, routes })
})

app.use('/api/auth', authRouter)
app.use('/api/vault', vaultRouter)
app.use('/api/admin', adminRouter)
app.use('/api', marcheRouter)
app.use('/api/etbs', etbsRouter)
app.use('/api/etbs/:id/prix', prixRouter)

// Toujours en dernier, et dans cet ordre.
app.use(routeIntrouvable)
app.use(gestionnaireErreurs)

export default app
