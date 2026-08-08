import { timingSafeEqual } from 'node:crypto'
import { Router, type NextFunction, type Request, type Response } from 'express'
import { introuvable } from '../lib/erreurs'
import { routeAsync } from '../lib/route-async'
import { config } from '../lib/config'
import { mettreAJourPrixCartes } from '../cron/prix-cartes'
import { mettreAJourPrixDepuisCM } from '../services/cm-download'

// Déclencheur de la collecte quotidienne, pour un planificateur externe.
//
// Pourquoi pas le cron interne : sur un hébergement qui met le service en
// veille faute de trafic, une tâche planifiée dans le processus ne part pas.
// Un appel venu de l'extérieur réveille le service et fait le travail.
//
// Pourquoi pas /api/admin/refresh : cette route-là exige un jeton de session,
// valable sept jours. Un planificateur ne peut pas s'en servir sans qu'on aille
// le renouveler à la main chaque semaine.

const router = Router()

/**
 * Compare deux secrets sans fuite de temps.
 *
 * Une comparaison `===` s'arrête au premier caractère différent : le temps de
 * réponse laisse alors deviner le secret, caractère par caractère.
 */
function secretValide(fourni: string): boolean {
  const attendu = Buffer.from(config.cronSecret, 'utf8')
  const recu = Buffer.from(fourni, 'utf8')
  if (attendu.length !== recu.length) return false
  return timingSafeEqual(attendu, recu)
}

/**
 * Exige le secret partagé.
 *
 * Répond 404 et non 401 : pour qui n'a pas le secret, la route est
 * indiscernable d'une route inexistante.
 */
function exigerSecret(req: Request, _res: Response, next: NextFunction): void {
  const fourni = req.get('X-Cron-Secret') ?? ''
  if (!fourni || !secretValide(fourni)) {
    throw introuvable(`Route inconnue : ${req.method} ${req.originalUrl}`)
  }
  next()
}

router.use(exigerSecret)

// POST /api/taches/collecte-prix
router.post(
  '/collecte-prix',
  routeAsync(async (_req, res) => {
    console.log('[tache] Collecte des prix déclenchée.')

    const { ok, sans_prix, inchanges } = await mettreAJourPrixDepuisCM()

    // Les prix de cartes viennent d'une autre source : leur échec ne doit pas
    // annuler une collecte ETB réussie.
    let cartes: 'ok' | 'echec' = 'ok'
    try {
      await mettreAJourPrixCartes()
    } catch (e) {
      cartes = 'echec'
      console.error('[tache] Prix cartes :', e instanceof Error ? e.message : e)
    }

    res.json({ etbMisAJour: ok, etbSansPrix: sans_prix, etbInchanges: inchanges, cartes })
  }),
)

export default router
