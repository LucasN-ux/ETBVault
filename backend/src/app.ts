import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import listEndpoints from 'express-list-endpoints'
import swaggerUi from 'swagger-ui-express'

import { openapiSpec } from './docs/openapi'
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

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

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

// Planification des mises à jour quotidiennes
import './cron/prix-cartes'
import './cron/prix-etb'

export default app
