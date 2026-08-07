// Série quotidienne de la valeur du coffre dans le temps.
//
// Règles : une position compte à partir de sa date d'achat ; le dernier prix
// connu est reporté sur les jours sans relevé ; avant le premier relevé, on
// retient le prix d'achat — faute de mieux, et pour ne pas inventer de
// plus-value là où on n'a aucune donnée.

/** Position, réduite à ce dont le calcul a besoin. */
export interface PositionValorisable {
  etbId: string
  prixAchat: number
  quantite: number
  /** YYYY-MM-DD */
  dateAchat: string
}

/** Relevé de prix, réduit à ce dont le calcul a besoin. */
export interface ReleveJournalier {
  /** YYYY-MM-DD */
  date: string
  cmPrixMoyen: number | string | null
}

export interface PointValeur {
  date: string
  valeur: number
  investi: number
}

/** Historiques indexés par ETB, chacun en ordre chronologique. */
export type HistoriqueParEtb = Record<string, ReleveJournalier[] | undefined>

const arrondi = (n: number): number => Math.round(n * 100) / 100

export function valeurHistorique(
  positions: readonly PositionValorisable[] | null | undefined,
  historiques: HistoriqueParEtb = {},
): PointValeur[] {
  if (!positions || positions.length === 0) return []

  const premierAchat = positions.map((p) => p.dateAchat).sort()[0]!

  // Axe temporel : toutes les dates où quelque chose a pu changer — un achat
  // ou un relevé de prix. Inutile de générer les jours intermédiaires, la
  // valeur y est constante par construction.
  const dates = new Set<string>()
  for (const p of positions) dates.add(p.dateAchat)
  for (const historique of Object.values(historiques)) {
    for (const releve of historique ?? []) dates.add(releve.date)
  }
  const axe = [...dates].filter((d) => d >= premierAchat).sort()
  if (axe.length === 0) return []

  /** Dernier relevé à cette date ou avant, sinon null. */
  function prixA(etbId: string, jour: string): number | null {
    const historique = historiques[etbId]
    if (!historique || historique.length === 0) return null
    let prix: number | null = null
    for (const releve of historique) {
      if (releve.date <= jour) prix = Number(releve.cmPrixMoyen)
      else break
    }
    return prix
  }

  return axe.map((jour) => {
    let valeur = 0
    let investi = 0
    for (const position of positions) {
      if (position.dateAchat > jour) continue
      const quantite = position.quantite || 1
      investi += position.prixAchat * quantite
      const prix = prixA(position.etbId, jour)
      valeur += (prix ?? position.prixAchat) * quantite
    }
    return { date: jour, valeur: arrondi(valeur), investi: arrondi(investi) }
  })
}
