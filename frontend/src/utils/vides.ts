// Valeurs de repli stables.
//
// `donnees ?? []` crée un nouveau tableau à chaque rendu, ce qui invalide les
// useMemo qui en dépendent et fait recalculer tout l'écran pour rien. Ces
// constantes partagées gardent une identité stable.

export const TABLEAU_VIDE: readonly never[] = Object.freeze([])
export const OBJET_VIDE: Readonly<Record<string, never>> = Object.freeze({})
