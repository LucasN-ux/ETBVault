// Séries Pokémon (blocs) — d'après les séries officielles TCGdex (locale FR).
// Clé = id de série TCGdex (stable), valeur = libellé FR affiché.
// « bw » normalisé en « Noir et Blanc » pour coller aux ETB curés existants.

export const SERIE_LABEL: Record<string, string> = {
  me: 'Méga-Évolution',
  sv: 'Écarlate et Violet',
  swsh: 'Épée et Bouclier',
  sm: 'Soleil et Lune',
  xy: 'XY',
  bw: 'Noir et Blanc',
  col: "L'appel des Légendes",
  hgss: 'HeartGold SoulSilver',
  pl: 'Platine',
  dp: 'Diamant & Perle',
  pop: 'POP',
  ex: 'EX',
  ecard: 'e-cards',
  neo: 'Neo',
  base: 'Base',
  tk: 'Kits du dresseur',
  mc: "Collection McDonald's",
  tcgp: 'Pocket',
  misc: 'Autre',
}

// Ordre d'affichage des séries (récentes → anciennes) pour le catalogue.
export const SERIE_ORDER: string[] = [
  'Méga-Évolution', 'Écarlate et Violet', 'Épée et Bouclier', 'Soleil et Lune',
  'XY', 'Noir et Blanc', "L'appel des Légendes", 'HeartGold SoulSilver', 'Platine',
  'Diamant & Perle', 'POP', 'EX', 'e-cards', 'Neo', 'Base', 'Kits du dresseur',
  "Collection McDonald's", 'Pocket', 'Autre',
]
