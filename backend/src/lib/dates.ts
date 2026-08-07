// Les colonnes `date` de prix_historique sont des DATE Postgres, sans heure.
// Prisma sérialise un objet Date en prenant sa partie UTC : construire la date
// à minuit **local** décale donc le jour enregistré dès qu'on est à l'est de
// Greenwich. À Paris en été, minuit local = 22h UTC la veille, et le point de
// prix du jour se retrouvait daté de la veille.
//
// Toutes les dates métier passent par ici, et sont donc à minuit UTC.

/** Minuit UTC du jour courant. */
export function aujourdhuiUtc(): Date {
  const maintenant = new Date()
  return new Date(
    Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate()),
  )
}

/** Minuit UTC d'une date au format YYYY-MM-DD. */
export function jourUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

/** Le jour précédent, à minuit UTC. */
export function veille(date: Date): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() - 1)
  return d
}
