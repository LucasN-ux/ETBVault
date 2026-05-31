// Ordre d'affichage des séries Pokémon (récent → ancien), partagé catalogue + sidebar.
// Les séries présentes mais hors de cette liste sont ajoutées à la fin.
export const SERIE_ORDER = [
  'Méga-Évolution', 'Écarlate et Violet', 'Épée et Bouclier', 'Soleil et Lune', 'XY',
  'Noir et Blanc', "L'appel des Légendes", 'HeartGold SoulSilver', 'Platine', 'Diamant & Perle',
  'Legendary Collection', 'e-cards', 'Neo', 'Gym', 'POP', 'EX', 'Base',
  'Kits du dresseur', "Collection McDonald's", 'Pocket', 'Autre',
]

// Ordonne les séries réellement présentes (connues d'abord dans l'ordre, puis le reste alpha).
export function ordonnerSeries(eras) {
  const set = new Set(eras.filter(Boolean))
  const connues = SERIE_ORDER.filter((s) => set.has(s))
  const autres = [...set].filter((s) => !SERIE_ORDER.includes(s)).sort((a, b) => a.localeCompare(b, 'fr'))
  return [...connues, ...autres]
}
