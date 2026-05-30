import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import listEndpoints from 'express-list-endpoints'
import swaggerUi from 'swagger-ui-express'
import { openapiSpec } from './docs/openapi'

import etbsRouter from './routes/etbs'
import prixRouter from './routes/prix'
import authRouter from './routes/auth'
import vaultRouter from './routes/vault'
import adminRouter from './routes/admin'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Documentation interactive Swagger UI — http://localhost:3001/api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: 'ETBVault API' }))
app.get('/api/openapi.json', (_req, res) => res.json(openapiSpec))

// GET /api/routes — liste toutes les routes enregistrées (introspection dev)
app.get('/api/routes', (_req, res) => {
  const routes = listEndpoints(app)
    .map((e) => ({ path: e.path, methods: e.methods }))
    .sort((a, b) => a.path.localeCompare(b.path))
  res.json({ total: routes.length, routes })
})

app.use('/api/auth', authRouter)
app.use('/api/vault', vaultRouter)
app.use('/api/admin', adminRouter)
app.use('/api/etbs', etbsRouter)
app.use('/api/etbs/:id/prix', prixRouter)

// GET /api/prix — derniers prix CM pour toutes les ETBs (1 appel = tout le vault)
app.get('/api/prix', async (_req, res) => {
  const { default: prisma } = await import('./db/client')
  try {
    const rows = await prisma.$queryRaw<Array<{ etb_id: string; cm_prix_moyen: string; cm_prix_bas: string; date: Date }>>`
      SELECT DISTINCT ON (etb_id) etb_id, cm_prix_moyen, cm_prix_bas, date
      FROM prix_historique
      WHERE cm_prix_moyen IS NOT NULL
      ORDER BY etb_id, date DESC
    `
    const map: Record<string, { prixActuel: number; prixBas: number | null; date: string }> = {}
    for (const r of rows) {
      map[r.etb_id] = {
        prixActuel: Number(r.cm_prix_moyen),
        prixBas: r.cm_prix_bas ? Number(r.cm_prix_bas) : null,
        date: r.date.toISOString().split('T')[0]!,
      }
    }
    res.json(map)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
})

// GET /api/tendances?jours=7|30|90 — ETBs triées par momentum récent
// Pour chaque ETB : prix actuel vs prix il y a N jours → variation %
// C'est ça qui permet d'identifier ce qui bouge MAINTENANT
app.get('/api/tendances', async (req, res) => {
  const { default: prisma } = await import('./db/client')
  const jours = Math.min(365, Math.max(1, Number(req.query['jours']) || 7))
  try {
    const rows = await prisma.$queryRaw<Array<{
      etb_id: string
      prix_actuel: string
      date_actuel: Date
      prix_precedent: string | null
      date_precedent: Date | null
      variation_pct: string | null
    }>>`
      WITH latest AS (
        SELECT DISTINCT ON (etb_id) etb_id, cm_prix_moyen AS prix_actuel, date AS date_actuel
        FROM prix_historique
        WHERE cm_prix_moyen IS NOT NULL
        ORDER BY etb_id, date DESC
      ),
      precedent AS (
        SELECT DISTINCT ON (etb_id) etb_id, cm_prix_moyen AS prix_precedent, date AS date_precedent
        FROM prix_historique
        WHERE cm_prix_moyen IS NOT NULL
          AND date <= CURRENT_DATE - (${jours} * INTERVAL '1 day')
        ORDER BY etb_id, date DESC
      )
      SELECT
        l.etb_id,
        l.prix_actuel::text,
        l.date_actuel,
        p.prix_precedent::text,
        p.date_precedent,
        CASE WHEN p.prix_precedent > 0
          THEN ROUND(((l.prix_actuel - p.prix_precedent) / p.prix_precedent * 100)::numeric, 1)::text
          ELSE NULL
        END AS variation_pct
      FROM latest l
      LEFT JOIN precedent p ON l.etb_id = p.etb_id
      ORDER BY variation_pct DESC NULLS LAST
    `
    const result = rows.map(r => ({
      etbId: r.etb_id,
      prixActuel: Number(r.prix_actuel),
      dateActuel: r.date_actuel,
      prixPrecedent: r.prix_precedent ? Number(r.prix_precedent) : null,
      datePrecedent: r.date_precedent,
      variationPct: r.variation_pct ? Number(r.variation_pct) : null,
    }))
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
})

// GET /api/sparklines?jours=30 — mini-historique de prix pour TOUTES les ETBs
// en 1 seule requête (alimente les mini-courbes du catalogue / home).
// Retour : { etbId: [{ date, cmPrixMoyen }] } (ordre chronologique).
app.get('/api/sparklines', async (req, res) => {
  const { default: prisma } = await import('./db/client')
  const jours = Math.min(400, Math.max(7, Number(req.query['jours']) || 30))
  try {
    const rows = await prisma.$queryRaw<Array<{ etb_id: string; date: Date; cm_prix_moyen: string }>>`
      SELECT etb_id, date, cm_prix_moyen
      FROM prix_historique
      WHERE cm_prix_moyen IS NOT NULL
        AND date >= CURRENT_DATE - (${jours} * INTERVAL '1 day')
      ORDER BY etb_id, date ASC
    `
    const map: Record<string, Array<{ date: string; cmPrixMoyen: number }>> = {}
    for (const r of rows) {
      ;(map[r.etb_id] ??= []).push({
        date: r.date.toISOString().split('T')[0]!,
        cmPrixMoyen: Number(r.cm_prix_moyen),
      })
    }
    res.json(map)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
})

// Démarrage des cron jobs
import './cron/prix-cartes'
import './cron/prix-etb'

export default app
