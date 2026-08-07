// Contrat de l'API, vu du navigateur.
//
// Ce sont les modèles Prisma une fois sérialisés en JSON : les `Decimal`
// arrivent en chaîne, les `DateTime` en ISO. D'où les `string` là où le backend
// manipule des nombres et des dates — les convertir est le travail des écrans,
// pas du type.

export type Role = 'USER' | 'ADMIN'

/** Elite Trainer Box — l'entité centrale du catalogue. */
export interface Etb {
  id: string
  /** Nom exact Cardmarket (EN), sert au lien CM. */
  nom: string
  /** Nom d'affichage FR (TCGdex). Absent pour les ETB non appariées. */
  nomFr: string | null
  setId: string | null
  era: string | null
  /** Logo de set TCGdex — unique source d'image du projet. */
  imageUrl: string | null
  dateSortie: string | null
  prixSortie: string | null
  contenu: unknown
  cmUrl: string | null
  /** idProduct Cardmarket. Vide = cette ETB n'aura jamais de prix. */
  cmIdProducts: number[]
}

export interface Carte {
  id: string
  etbId: string
  nom: string
  numero: string | null
  imageUrl: string | null
  rarete: string | null
  prixMarche: string | null
  misAJour: string
}

/** Un point de prix : un par ETB et par jour. */
export interface PointPrix {
  id: number
  etbId: string
  date: string
  cmPrixMoyen: string | null
  cmPrixBas: string | null
  cmNbAnnonces: number | null
  ebayPrixMoyen: string | null
  /** `collecte` (cron quotidien) ou `import_cm` (amorçage rétroactif). */
  origine: string
}

/** Position du coffre. Sérialisée par le backend, déjà en nombres. */
export interface PositionCoffre {
  id: number
  etbId: string
  prixAchat: number
  quantite: number
  /** YYYY-MM-DD */
  dateAchat: string
}

/** Ce qu'un écran envoie pour créer une position. */
export interface NouvellePosition {
  etbId: string
  prixAchat: number | string
  quantite: number | string
  dateAchat?: string
}

// ── Vues transversales du marché ─────────────────────────────────────────────

export interface DernierPrix {
  prixActuel: number
  prixBas: number | null
  date: string
}

/** Indexé par id d'ETB. */
export type PrixParEtb = Record<string, DernierPrix>

export interface Tendance {
  etbId: string
  prixActuel: number
  dateActuel: string
  prixPrecedent: number | null
  datePrecedent: string | null
  /** null = pas de point de comparaison assez ancien, pas « 0 % ». */
  variationPct: number | null
}

export interface PointSparkline {
  date: string
  cmPrixMoyen: number
}

export type SparklinesParEtb = Record<string, PointSparkline[]>

// ── Comptes ──────────────────────────────────────────────────────────────────

export interface Utilisateur {
  id: string
  email: string
  role: Role
}

export interface UtilisateurAdmin extends Utilisateur {
  createdAt: string
}

export interface Session {
  token: string
  user: Utilisateur
}
