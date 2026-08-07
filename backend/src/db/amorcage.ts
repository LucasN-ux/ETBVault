import prisma from './client'
import { relierEtbACardmarket } from './backfill-etb-cmids'
import { semerCatalogue } from './seed'

/**
 * Remplit le catalogue au premier démarrage, s'il est vide.
 *
 * Une base fraîchement créée est vide : l'API répond `[]`, le site s'affiche
 * sans la moindre erreur et sans le moindre produit. Le symptôme ne dit rien
 * de la cause, et l'oubli est facile — d'où cet amorçage automatique.
 *
 * Ne fait rien dès qu'une ETB existe : aucune donnée n'est écrasée, et un
 * catalogue vidé volontairement ne se remplit pas dans le dos de l'opérateur
 * au redémarrage suivant... sauf s'il est vraiment vide, ce qui est le seul
 * cas où l'on ne peut rien perdre.
 */
export async function amorcerCatalogueSiVide(): Promise<void> {
  const existantes = await prisma.etb.count()
  if (existantes > 0) {
    console.log(`[amorçage] ${existantes} ETB déjà en base, rien à faire.`)
    return
  }

  console.log('[amorçage] Catalogue vide — insertion des ETB curées...')
  await semerCatalogue()
  await relierEtbACardmarket()
  console.log('[amorçage] Catalogue prêt. Les prix arriveront à la première collecte.')
}
