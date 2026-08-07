// Ordre d'affichage des séries Pokémon (récent → ancien), partagé catalogue et rail.
// Les séries présentes mais hors de cette liste sont ajoutées à la fin.

export const SERIE_ORDER: readonly string[] = [
  'Méga-Évolution', 'Écarlate et Violet', 'Épée et Bouclier', 'Soleil et Lune', 'XY',
  'Noir et Blanc', "L'appel des Légendes", 'HeartGold SoulSilver', 'Platine', 'Diamant & Perle',
  'Legendary Collection', 'e-cards', 'Neo', 'Gym', 'POP', 'EX', 'Base',
  'Kits du dresseur', "Collection McDonald's", 'Pocket', 'Autre',
]

/** Séries réellement présentes : les connues dans l'ordre, puis le reste en alphabétique. */
export function ordonnerSeries(eras: ReadonlyArray<string | null | undefined>): string[] {
  const presentes = new Set(eras.filter((e): e is string => Boolean(e)))
  const connues = SERIE_ORDER.filter((s) => presentes.has(s))
  const autres = [...presentes]
    .filter((s) => !SERIE_ORDER.includes(s))
    .sort((a, b) => a.localeCompare(b, 'fr'))
  return [...connues, ...autres]
}
