import express from 'express'
import cors from 'cors'
import 'dotenv/config'

import etbsRouter from './routes/etbs'
import prixRouter from './routes/prix'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

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

// GET /api/era-stats?era=... — multiples de valorisation de tous les ETBs d'une même ère
// Permet de comparer un ETB par rapport à ses pairs de la même génération
app.get('/api/era-stats', async (req, res) => {
  const { default: prisma } = await import('./db/client')
  const era = req.query['era'] as string | undefined
  if (!era) { res.status(400).json({ error: 'Paramètre era requis' }); return }
  try {
    const etbs = await prisma.etb.findMany({
      where: { era },
      select: {
        id: true,
        nom: true,
        prixSortie: true,
        prixHistorique: {
          where: { cmPrixMoyen: { not: null } },
          orderBy: { date: 'desc' },
          take: 1,
          select: { cmPrixMoyen: true },
        },
      },
    })
    const avecPrix = etbs
      .filter((e) => e.prixSortie && e.prixHistorique[0]?.cmPrixMoyen)
      .map((e) => ({
        id: e.id,
        nom: e.nom,
        multiple: Math.round(Number(e.prixHistorique[0]!.cmPrixMoyen) / Number(e.prixSortie) * 100) / 100,
      }))
      .sort((a, b) => b.multiple - a.multiple)
    const avg = avecPrix.length > 0
      ? Math.round(avecPrix.reduce((s, e) => s + e.multiple, 0) / avecPrix.length * 100) / 100
      : 0
    res.json({ era, count: avecPrix.length, multiples: avecPrix, avgMultiple: avg })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
})

// POST /api/admin/refresh-prix — déclenche manuellement le téléchargement CM
// Utile pour tester ou forcer une mise à jour sans attendre le cron
app.post('/api/admin/refresh-prix', async (_req, res) => {
  const { mettreAJourPrixDepuisCM } = await import('./services/cm-download')
  try {
    const result = await mettreAJourPrixDepuisCM()
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erreur' })
  }
})

// Démarrage des cron jobs
import './cron/prix-cartes'
import './cron/prix-etb'

export default app
