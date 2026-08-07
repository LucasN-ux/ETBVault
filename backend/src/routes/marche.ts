import { Router } from 'express'
import { routeAsync } from '../lib/route-async'
import { lireJours } from '../lib/validation'
import * as marche from '../repositories/marche.repo'

// Vues transversales du marché : elles portent sur toutes les ETB à la fois,
// contrairement à /api/etbs/:id/prix qui porte sur une seule.
const router = Router()

// GET /api/prix — dernier prix de chaque ETB, en un appel
router.get(
  '/prix',
  routeAsync(async (_req, res) => {
    res.json(await marche.dernierPrixParEtb())
  }),
)

// GET /api/tendances?jours=7|30|90 — ETB classées par variation récente
router.get(
  '/tendances',
  routeAsync(async (req, res) => {
    const jours = lireJours(req.query['jours'], 7, 1, 365)
    res.json(await marche.tendances(jours))
  }),
)

// GET /api/sparklines?jours=30 — mini-historiques pour les courbes du catalogue
router.get(
  '/sparklines',
  routeAsync(async (req, res) => {
    const jours = lireJours(req.query['jours'], 30, 7, 400)
    res.json(await marche.sparklines(jours))
  }),
)

export default router
