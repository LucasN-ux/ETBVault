import prisma from '../db/client'

// Requêtes d'agrégat sur l'historique de prix.
//
// Elles sont en SQL brut parce que Prisma ne sait pas faire `DISTINCT ON`, qui
// est ce qui permet de récupérer le dernier point de chaque ETB en une passe
// plutôt qu'en N requêtes. Les montants sont castés en `text` côté SQL puis
// convertis ici : sans ça Prisma renvoie des `Decimal` qui ne se sérialisent
// pas proprement en JSON.

export interface DernierPrix {
  prixActuel: number
  prixBas: number | null
  date: string
}

export interface Tendance {
  etbId: string
  prixActuel: number
  dateActuel: Date
  prixPrecedent: number | null
  datePrecedent: Date | null
  variationPct: number | null
}

export interface PointSparkline {
  date: string
  cmPrixMoyen: number
}

const jour = (d: Date): string => d.toISOString().split('T')[0]!

/** Dernier prix connu de chaque ETB, indexé par id. */
export async function dernierPrixParEtb(): Promise<Record<string, DernierPrix>> {
  const lignes = await prisma.$queryRaw<
    Array<{ etb_id: string; cm_prix_moyen: string; cm_prix_bas: string | null; date: Date }>
  >`
    SELECT DISTINCT ON (etb_id) etb_id, cm_prix_moyen, cm_prix_bas, date
    FROM prix_historique
    WHERE cm_prix_moyen IS NOT NULL
    ORDER BY etb_id, date DESC
  `

  const parEtb: Record<string, DernierPrix> = {}
  for (const l of lignes) {
    parEtb[l.etb_id] = {
      prixActuel: Number(l.cm_prix_moyen),
      prixBas: l.cm_prix_bas === null ? null : Number(l.cm_prix_bas),
      date: jour(l.date),
    }
  }
  return parEtb
}

/**
 * ETB classées par variation de prix sur les `jours` derniers jours.
 * Celles sans point de comparaison assez ancien sortent en fin de liste.
 */
export async function tendances(jours: number): Promise<Tendance[]> {
  const lignes = await prisma.$queryRaw<
    Array<{
      etb_id: string
      prix_actuel: string
      date_actuel: Date
      prix_precedent: string | null
      date_precedent: Date | null
      variation_pct: string | null
    }>
  >`
    WITH dernier AS (
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
    ),
    calcul AS (
      SELECT
        d.etb_id,
        d.prix_actuel,
        d.date_actuel,
        p.prix_precedent,
        p.date_precedent,
        CASE WHEN p.prix_precedent > 0
          THEN ROUND(((d.prix_actuel - p.prix_precedent) / p.prix_precedent * 100)::numeric, 1)
          ELSE NULL
        END AS variation_pct
      FROM dernier d
      LEFT JOIN precedent p ON d.etb_id = p.etb_id
    )
    SELECT etb_id, prix_actuel::text, date_actuel, prix_precedent::text, date_precedent, variation_pct::text
    FROM calcul
    -- Tri sur la colonne numérique de « calcul ». Une référence qualifiée est une
    -- expression, donc PostgreSQL ne la confond pas avec la sortie ::text — qui,
    -- elle, trierait « 9.5 » avant « 80.0 ».
    ORDER BY calcul.variation_pct DESC NULLS LAST
  `

  return lignes.map((l) => ({
    etbId: l.etb_id,
    prixActuel: Number(l.prix_actuel),
    dateActuel: l.date_actuel,
    prixPrecedent: l.prix_precedent === null ? null : Number(l.prix_precedent),
    datePrecedent: l.date_precedent,
    variationPct: l.variation_pct === null ? null : Number(l.variation_pct),
  }))
}

/** Mini-historiques de toutes les ETB en une requête, pour les courbes du catalogue. */
export async function sparklines(jours: number): Promise<Record<string, PointSparkline[]>> {
  const lignes = await prisma.$queryRaw<Array<{ etb_id: string; date: Date; cm_prix_moyen: string }>>`
    SELECT etb_id, date, cm_prix_moyen
    FROM prix_historique
    WHERE cm_prix_moyen IS NOT NULL
      AND date >= CURRENT_DATE - (${jours} * INTERVAL '1 day')
    ORDER BY etb_id, date ASC
  `

  const parEtb: Record<string, PointSparkline[]> = {}
  for (const l of lignes) {
    ;(parEtb[l.etb_id] ??= []).push({ date: jour(l.date), cmPrixMoyen: Number(l.cm_prix_moyen) })
  }
  return parEtb
}
