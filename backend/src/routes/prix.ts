import { Router } from 'express'
import { introuvable } from '../lib/erreurs'
import { jourUtc } from '../lib/dates'
import { routeAsync } from '../lib/route-async'
import {
  exigerDateIso,
  exigerEntierPositif,
  exigerIdEtb,
  exigerOrigine,
  exigerPrix,
} from '../lib/validation'
import * as etbsRepo from '../repositories/etbs.repo'
import * as prixRepo from '../repositories/prix.repo'
import { detecterMouvement } from '../services/mouvement'

// Monté sur /api/etbs/:id/prix — mergeParams donne accès au :id du parent.
const router = Router({ mergeParams: true })

// GET /api/etbs/:id/prix — historique complet
router.get(
  '/',
  routeAsync(async (req, res) => {
    const id = exigerIdEtb(req.params['id'])
    res.json(await prixRepo.listerHistorique(id))
  }),
)

// GET /api/etbs/:id/prix/latest — dernier point valorisé
router.get(
  '/latest',
  routeAsync(async (req, res) => {
    const id = exigerIdEtb(req.params['id'])
    const dernier = await prixRepo.dernierPoint(id)
    if (!dernier) throw introuvable('Aucun prix disponible')
    res.json(dernier)
  }),
)

// GET /api/etbs/:id/prix/mouvement — mouvement de prix adapté à la volatilité
// propre de l'ETB. Constate, ne recommande pas.
router.get(
  '/mouvement',
  routeAsync(async (req, res) => {
    const id = exigerIdEtb(req.params['id'])
    const etb = await etbsRepo.trouverEtb(id)
    if (!etb) throw introuvable('ETB non trouvée')

    const historique = await prixRepo.listerHistoriqueValorise(id)
    res.json({ etbId: id, ...detecterMouvement(historique) })
  }),
)

// POST /api/etbs/:id/prix — ajoute ou écrase le point d'une date (usage cron/interne)
router.post(
  '/',
  routeAsync(async (req, res) => {
    const id = exigerIdEtb(req.params['id'])
    const corps = req.body as Record<string, unknown>

    const date = exigerDateIso(corps['date'])
    const point: prixRepo.PointAEnregistrer = {}
    if (corps['cmPrixMoyen'] !== undefined) point.cmPrixMoyen = exigerPrix(corps['cmPrixMoyen'], 'cmPrixMoyen')
    if (corps['cmPrixBas'] !== undefined) point.cmPrixBas = exigerPrix(corps['cmPrixBas'], 'cmPrixBas')
    if (corps['ebayPrixMoyen'] !== undefined) point.ebayPrixMoyen = exigerPrix(corps['ebayPrixMoyen'], 'ebayPrixMoyen')
    if (corps['cmNbAnnonces'] !== undefined) point.cmNbAnnonces = exigerEntierPositif(corps['cmNbAnnonces'], 'cmNbAnnonces')
    if (corps['origine'] !== undefined) point.origine = exigerOrigine(corps['origine'])

    const etb = await etbsRepo.trouverEtb(id)
    if (!etb) throw introuvable('ETB non trouvée')

    res.json(await prixRepo.enregistrerPoint(id, jourUtc(date), point))
  }),
)

export default router
