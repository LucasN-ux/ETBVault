// Inférence de l'ère (bloc) d'un produit scellé depuis son nom (les noms CM
// contiennent le nom du set). Couvre les ères modernes ; les anciens sets
// (pré-Noir & Blanc) ou non reconnus renvoient null → groupe « Autres » côté UI.
//
// Ordre IMPORTANT : du plus récent au plus ancien, premier mot-clé trouvé gagne
// (ex. « Prismatic Evolutions » doit matcher SV avant le « Evolutions » de XY).

const ERES_MOTS: Array<[string, string[]]> = [
  ['Méga-Évolution', ['mega evolution', 'mega brave', 'mega symphonia']],
  ['Écarlate et Violet', [
    'scarlet & violet', 'scarlet and violet', 'paldea evolved', 'paldean fates',
    'obsidian flames', 'paradox rift', 'temporal forces', 'twilight masquerade',
    'shrouded fable', 'stellar crown', 'surging sparks', 'prismatic evolution',
    'journey together', 'destined rivals', 'black bolt', 'white flare',
    'pokémon 151', 'pokemon 151', '151 ', 'scarlet ', 'violet ', 'paldea', 'terastal',
  ]],
  ['Épée et Bouclier', [
    'sword & shield', 'sword and shield', 'rebel clash', 'darkness ablaze',
    "champion's path", 'champions path', 'vivid voltage', 'shining fates',
    'battle styles', 'chilling reign', 'evolving skies', 'celebrations',
    'fusion strike', 'brilliant stars', 'astral radiance', 'pokémon go',
    'pokemon go', 'lost origin', 'silver tempest', 'crown zenith', 'galar', 'galarian',
  ]],
  ['Soleil et Lune', [
    'sun & moon', 'sun and moon', 'guardians rising', 'burning shadows',
    'shining legends', 'crimson invasion', 'ultra prism', 'forbidden light',
    'celestial storm', 'dragon majesty', 'lost thunder', 'team up',
    'detective pikachu', 'unbroken bonds', 'unified minds', 'hidden fates',
    'cosmic eclipse',
  ]],
  ['XY', [
    'kalos', 'flashfire', 'furious fists', 'phantom forces', 'primal clash',
    'double crisis', 'roaring skies', 'ancient origins', 'breakthrough',
    'breakpoint', 'fates collide', 'steam siege', 'generations', 'evolutions',
    'xy ',
  ]],
  ['Noir et Blanc', [
    'black & white', 'black and white', 'emerging powers', 'noble victories',
    'next destinies', 'dark explorers', 'dragons exalted', 'dragon vault',
    'boundaries crossed', 'plasma storm', 'plasma freeze', 'plasma blast',
    'legendary treasures',
  ]],
]

export function infererEre(nom: string): string | null {
  const n = ` ${nom.toLowerCase()} `
  for (const [ere, mots] of ERES_MOTS) {
    if (mots.some((m) => n.includes(m))) return ere
  }
  return null
}
