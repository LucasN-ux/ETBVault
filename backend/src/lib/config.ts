// Configuration lue depuis l'environnement, en un seul endroit.
//
// Les valeurs par défaut sont celles du développement local. Tout ce qui est
// coûteux ou visible de l'extérieur (collecte Cardmarket, tâches planifiées,
// origines autorisées) est donc désactivé ou permissif ici, et doit être
// activé explicitement en production.

function booleen(valeur: string | undefined, defaut: boolean): boolean {
  if (valeur === undefined || valeur === '') return defaut
  return valeur === 'true' || valeur === '1'
}

function liste(valeur: string | undefined): string[] {
  if (!valeur) return []
  return valeur
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

export const config = {
  port: Number(process.env['PORT']) || 3001,

  /**
   * Origines autorisées à appeler l'API (CORS).
   * Vide = toutes, ce qui convient en local mais jamais en production :
   * l'API sert des routes authentifiées par jeton porteur.
   */
  originesAutorisees: liste(process.env['ORIGINES_AUTORISEES']),

  /**
   * Lancer la collecte des prix au démarrage du serveur.
   *
   * Faux par défaut, et c'est important en hébergement : un service qui
   * redémarre à chaque déploiement — ou qui se réveille après une mise en
   * veille — relancerait une connexion Cardmarket à chaque fois. La collecte
   * se déclenche par tâche planifiée ou par POST /api/admin/refresh.
   */
  collecteAuDemarrage: booleen(process.env['COLLECTE_AU_DEMARRAGE'], false),

  /**
   * Planifier les tâches quotidiennes dans le processus du serveur.
   *
   * N'a de sens que si le processus tourne en continu. Sur un hébergement qui
   * met le service en veille faute de trafic, les tâches ne se déclencheront
   * pas : utiliser un planificateur externe qui appelle /api/admin/refresh.
   */
  cronsActifs: booleen(process.env['CRONS_ACTIFS'], true),
} as const
