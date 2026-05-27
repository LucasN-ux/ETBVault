require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const TCGDEX_ASSETS = 'https://assets.tcgdex.net/fr'

function seriesPath(setId) {
  if (setId.startsWith('sv')) return 'sv'
  if (setId.startsWith('swsh') || setId === 'cel25' || setId === 'pgo') return 'swsh'
  if (setId.startsWith('sm')) return 'sm'
  if (setId.startsWith('xy')) return 'xy'
  if (setId.startsWith('bw')) return 'bw'
  if (setId.startsWith('me')) return 'me'
  return setId
}

function logoUrl(setId) {
  return `${TCGDEX_ASSETS}/${seriesPath(setId)}/${setId}/logo.webp`
}

// URLs Cardmarket — format : chemin relatif depuis cardmarket.com
// ⚠ À vérifier manuellement si une URL renvoie 404 après seed
// Les ETBs trop récentes (ME era) ou sans page CM connue restent à null
const CM = 'https://www.cardmarket.com'
const CM_ETBS = {
  // ── Écarlate et Violet ─────────────────────────────────────────────────
  // sv01: SV de base — deux ETBs sur CM (Scarlet + Violet), on prend Scarlet
  'sv01':    `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Scarlet-Elite-Trainer-Box`,
  'sv02':    `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Paldea-Evolved-Elite-Trainer-Box`,
  'sv03':    `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Obsidian-Flames-Elite-Trainer-Box`,
  'sv03.5':  `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Pokemon-151-Elite-Trainer-Box`,
  // sv04: Faille Paradoxe — deux ETBs (Garde-de-Fer + Rugit-Lune), on prend Garde-de-Fer
  'sv04':    `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Paradox-Rift-Iron-Valiant-Elite-Trainer-Box`,
  'sv04.5':  `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Paldean-Fates-Elite-Trainer-Box`,
  // sv05: Forces Temporelles — deux ETBs (Walking Wake + Iron Leaves), on prend Iron Leaves
  'sv05':    `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Temporal-Forces-Iron-Leaves-Elite-Trainer-Box`,
  'sv06':    `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Twilight-Masquerade-Elite-Trainer-Box`,
  'sv06.5':  `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Shrouded-Fable-Elite-Trainer-Box`,
  'sv07':    `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Stellar-Crown-Elite-Trainer-Box`,
  'sv08':    `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Surging-Sparks-Elite-Trainer-Box`,
  'sv08.5':  `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Prismatic-Evolutions-Elite-Trainer-Box`,
  'sv09':    `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Journey-Together-Elite-Trainer-Box`,
  'sv10':    `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Destined-Rivals-Elite-Trainer-Box`,
  // sv10.5w et sv10.5b — trop récents, URL non confirmée
  // ── Épée et Bouclier ───────────────────────────────────────────────────
  'swsh1':   `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Sword-Shield-Elite-Trainer-Box`,
  'swsh2':   `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Rebel-Clash-Elite-Trainer-Box`,
  'swsh3':   `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Darkness-Ablaze-Elite-Trainer-Box`,
  'swsh4':   `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Vivid-Voltage-Elite-Trainer-Box`,
  'swsh4.5': `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Shining-Fates-Elite-Trainer-Box`,
  'swsh5':   `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Battle-Styles-Elite-Trainer-Box`,
  'swsh6':   `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Chilling-Reign-Elite-Trainer-Box`,
  'swsh7':   `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Evolving-Skies-Elite-Trainer-Box`,
  'swsh8':   `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Fusion-Strike-Elite-Trainer-Box`,
  'cel25':   `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Celebrations-Elite-Trainer-Box`,
  'swsh9':   `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Brilliant-Stars-Elite-Trainer-Box`,
  'swsh10':  `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Astral-Radiance-Elite-Trainer-Box`,
  'pgo':     `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Pokemon-GO-Elite-Trainer-Box`,
  'swsh11':  `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Lost-Origin-Elite-Trainer-Box`,
  'swsh12':  `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Silver-Tempest-Elite-Trainer-Box`,
  'swsh12.5':`${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Crown-Zenith-Elite-Trainer-Box`,
  // ── Soleil et Lune ──────────────────────────────────────────────────────
  'sm1':     `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Sun-Moon-Elite-Trainer-Box`,
  'sm2':     `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Guardians-Rising-Elite-Trainer-Box`,
  'sm3':     `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Burning-Shadows-Elite-Trainer-Box`,
  'sm4':     `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Crimson-Invasion-Elite-Trainer-Box`,
  'sm5':     `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Ultra-Prism-Elite-Trainer-Box`,
  'sm6':     `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Forbidden-Light-Elite-Trainer-Box`,
  'sm7':     `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Celestial-Storm-Elite-Trainer-Box`,
  'sm8':     `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Lost-Thunder-Elite-Trainer-Box`,
  'sm9':     `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Team-Up-Elite-Trainer-Box`,
  'sm10':    `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Unbroken-Bonds-Elite-Trainer-Box`,
  'sm11':    `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Unified-Minds-Elite-Trainer-Box`,
  'sm115':   `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Hidden-Fates-Elite-Trainer-Box`,
  'sm12':    `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/Cosmic-Eclipse-Elite-Trainer-Box`,
  // ── XY ──────────────────────────────────────────────────────────────────
  'xy1':     `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/XY-Elite-Trainer-Box`,
  'xy12':    `${CM}/fr/Pokemon/Products/Elite-Trainer-Boxes/XY-Evolutions-Elite-Trainer-Box`,
}

// Toutes les ETBs classées par ère — IDs TCGdex
const ETBS = [
  // ── Méga-Évolution (2025-2026) ────────────────────────────────────────────
  { id: 'me04',    era: 'Méga-Évolution', nom: 'Chaos Ascendant',              dateSortie: '2026-05-22', prixSortie: 59.99,   contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'me03',    era: 'Méga-Évolution', nom: 'Ordre Parfait',                dateSortie: '2026-03-27', prixSortie: 59.99,   contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'me02.5',  era: 'Méga-Évolution', nom: 'Héros Ascendants',             dateSortie: '2026-01-30', prixSortie: 59.99,   contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'me02',    era: 'Méga-Évolution', nom: 'Flammes Fantasmagoriques',     dateSortie: '2025-11-14', prixSortie: 59.99,   contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'me01',    era: 'Méga-Évolution', nom: 'Méga-Évolution',               dateSortie: '2025-09-26', prixSortie: 59.99,   contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },

  // ── Écarlate et Violet (2023-2025) ────────────────────────────────────────
  { id: 'sv10.5w', era: 'Écarlate et Violet', nom: 'Flamme Blanche',           dateSortie: '2025-07-18', prixSortie: 59.99, contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'sv10.5b', era: 'Écarlate et Violet', nom: 'Foudre Noire',             dateSortie: '2025-07-18', prixSortie: 59.99, contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'sv10',    era: 'Écarlate et Violet', nom: 'Rivaux Prédestinés',       dateSortie: '2025-05-30', prixSortie: 59.99,  contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'sv09',    era: 'Écarlate et Violet', nom: 'Voyage Ensemble',          dateSortie: '2025-03-28', prixSortie: 59.99,   contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'sv08.5',  era: 'Écarlate et Violet', nom: 'Évolutions Prismatiques',  dateSortie: '2025-01-17', prixSortie: 59.99,  contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'sv08',    era: 'Écarlate et Violet', nom: 'Étincelles Déferlantes',   dateSortie: '2024-11-01', prixSortie: 59.99,   contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'sv07',    era: 'Écarlate et Violet', nom: 'Couronne Stellaire',       dateSortie: '2024-09-13', prixSortie: 54.99,   contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'sv06.5',  era: 'Écarlate et Violet', nom: 'Fable Nébuleuse',          dateSortie: '2024-08-02', prixSortie: 54.99,  contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'sv06',    era: 'Écarlate et Violet', nom: 'Mascarade du Crépuscule',  dateSortie: '2024-05-24', prixSortie: 54.99,   contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'sv05',    era: 'Écarlate et Violet', nom: 'Forces Temporelles',       dateSortie: '2024-03-22', prixSortie: 54.99,  contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'sv04.5',  era: 'Écarlate et Violet', nom: 'Destins de Paldea',        dateSortie: '2024-01-26', prixSortie: 54.99,  contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'sv04',    era: 'Écarlate et Violet', nom: 'Rift Paradoxe',            dateSortie: '2023-11-03', prixSortie: 54.99,  contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'sv03.5',  era: 'Écarlate et Violet', nom: 'Écarlate et Violet — 151', dateSortie: '2023-09-22', prixSortie: 54.99,  contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'sv03',    era: 'Écarlate et Violet', nom: 'Flammes Obsidiennes',      dateSortie: '2023-08-11', prixSortie: 54.99,   contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'sv02',    era: 'Écarlate et Violet', nom: 'Évolution à Paldea',       dateSortie: '2023-06-09', prixSortie: 54.99,  contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },
  { id: 'sv01',    era: 'Écarlate et Violet', nom: 'Écarlate et Violet',       dateSortie: '2023-03-31', prixSortie: 54.99,  contenu: { boosters: 9, sleeves: 65, coin: 1, divider: 1 } },

  // ── Épée et Bouclier (2020-2023) ──────────────────────────────────────────
  { id: 'swsh12.5', era: 'Épée et Bouclier', nom: 'Zénith Suprême',           dateSortie: '2023-01-20', prixSortie: 49.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'swsh12',   era: 'Épée et Bouclier', nom: 'Tempête Argentée',         dateSortie: '2022-11-11', prixSortie: 49.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'swsh11',   era: 'Épée et Bouclier', nom: 'Origines Perdues',         dateSortie: '2022-09-09', prixSortie: 49.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'swsh10',   era: 'Épée et Bouclier', nom: 'Astres Radieux',           dateSortie: '2022-05-27', prixSortie: 49.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'pgo',      era: 'Épée et Bouclier', nom: 'Pokémon GO',               dateSortie: '2022-07-01', prixSortie: 44.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'swsh9',    era: 'Épée et Bouclier', nom: 'Stars Étincelantes',       dateSortie: '2022-02-25', prixSortie: 49.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'swsh8',    era: 'Épée et Bouclier', nom: 'Poing de Fusion',          dateSortie: '2021-11-12', prixSortie: 44.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'cel25',    era: 'Épée et Bouclier', nom: 'Célébrations 25ème Anniversaire', dateSortie: '2021-10-08', prixSortie: 39.99, contenu: { boosters: 4, boosters_legacy: 4, sleeves: 45, coin: 1 } },
  { id: 'swsh7',    era: 'Épée et Bouclier', nom: 'Ciel Évolutif',            dateSortie: '2021-08-27', prixSortie: 44.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'swsh6',    era: 'Épée et Bouclier', nom: 'Règne de Glace',           dateSortie: '2021-06-18', prixSortie: 44.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'swsh5',    era: 'Épée et Bouclier', nom: 'Styles de Combat',         dateSortie: '2021-03-19', prixSortie: 44.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'swsh4.5',  era: 'Épée et Bouclier', nom: 'Destins Étincelants',      dateSortie: '2021-02-19', prixSortie: 44.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'swsh4',    era: 'Épée et Bouclier', nom: 'Voltage Éclatant',         dateSortie: '2020-11-13', prixSortie: 44.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'swsh3.5',  era: 'Épée et Bouclier', nom: 'La Voie du Maître',        dateSortie: '2020-09-25', prixSortie: 39.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'swsh3',    era: 'Épée et Bouclier', nom: 'Ténèbres Embrasées',       dateSortie: '2020-08-14', prixSortie: 44.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'swsh2',    era: 'Épée et Bouclier', nom: 'Clash des Rebelles',       dateSortie: '2020-05-01', prixSortie: 44.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'swsh1',    era: 'Épée et Bouclier', nom: 'Épée et Bouclier',         dateSortie: '2020-02-07', prixSortie: 44.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },

  // ── Soleil et Lune (2017-2019) ────────────────────────────────────────────
  { id: 'sm115', era: 'Soleil et Lune', nom: 'Destins Cachés',                dateSortie: '2019-08-23', prixSortie: 39.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'sm12',  era: 'Soleil et Lune', nom: 'Éclipse Cosmique',              dateSortie: '2019-11-01', prixSortie: 39.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'sm11',  era: 'Soleil et Lune', nom: 'Esprits Unifiés',               dateSortie: '2019-08-02', prixSortie: 39.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'sm10',  era: 'Soleil et Lune', nom: 'Liens Indestructibles',         dateSortie: '2019-05-03', prixSortie: 39.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'sm9',   era: 'Soleil et Lune', nom: 'Alliance Infaillible',          dateSortie: '2019-02-01', prixSortie: 39.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'sm8',   era: 'Soleil et Lune', nom: 'Tonnerre Perdu',                dateSortie: '2018-11-02', prixSortie: 39.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'sm7.5', era: 'Soleil et Lune', nom: 'Majesté des Dragons',           dateSortie: '2018-09-07', prixSortie: 29.99, contenu: { boosters: 4, sleeves: 45, coin: 1, des: 2 } },
  { id: 'sm7',   era: 'Soleil et Lune', nom: 'Tempête Céleste',               dateSortie: '2018-08-03', prixSortie: 39.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'sm6',   era: 'Soleil et Lune', nom: 'Lumière Interdite',             dateSortie: '2018-05-04', prixSortie: 39.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'sm5',   era: 'Soleil et Lune', nom: 'Ultra-Prisme',                  dateSortie: '2018-02-02', prixSortie: 39.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'sm4',   era: 'Soleil et Lune', nom: 'Invasion Carmin',               dateSortie: '2017-11-03', prixSortie: 39.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'sm3.5', era: 'Soleil et Lune', nom: 'Légendes Brillantes',           dateSortie: '2017-10-06', prixSortie: 29.99, contenu: { boosters: 4, sleeves: 45, coin: 1, des: 2 } },
  { id: 'sm3',   era: 'Soleil et Lune', nom: 'Ombres Ardentes',               dateSortie: '2017-08-04', prixSortie: 39.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'sm2',   era: 'Soleil et Lune', nom: 'Gardiens Ascendants',           dateSortie: '2017-05-05', prixSortie: 39.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },
  { id: 'sm1',   era: 'Soleil et Lune', nom: 'Soleil et Lune',                dateSortie: '2017-02-03', prixSortie: 39.99, contenu: { boosters: 8, sleeves: 65, coin: 1, des: 2 } },

  // ── XY (2014-2016) ────────────────────────────────────────────────────────
  { id: 'xy12', era: 'XY', nom: 'Évolutions',                                 dateSortie: '2016-11-02', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'xy11', era: 'XY', nom: 'Vapeur Assiégée',                            dateSortie: '2016-08-03', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'xy10', era: 'XY', nom: 'Destin de Jadielle',                         dateSortie: '2016-05-02', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'xy9',  era: 'XY', nom: 'BREAKpoint',                                 dateSortie: '2016-02-03', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'xy8',  era: 'XY', nom: 'BREAKdestinée',                              dateSortie: '2015-11-04', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'xy7',  era: 'XY', nom: 'Origines Antiques',                          dateSortie: '2015-08-12', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'xy6',  era: 'XY', nom: 'Ciel Rugissant',                             dateSortie: '2015-05-06', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'xy5',  era: 'XY', nom: 'Primo-Choc',                                 dateSortie: '2015-02-04', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'xy4',  era: 'XY', nom: 'Vigueur Spectrale',                          dateSortie: '2014-11-05', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'xy3',  era: 'XY', nom: 'Poings Furieux',                             dateSortie: '2014-08-13', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'xy2',  era: 'XY', nom: 'Étincelles',                                 dateSortie: '2014-05-07', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'xy1',  era: 'XY', nom: 'XY',                                         dateSortie: '2014-02-05', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },

  // ── Noir et Blanc (2011-2013) ─────────────────────────────────────────────
  { id: 'bw11', era: 'Noir et Blanc', nom: 'Légendaires Étincelants',         dateSortie: '2013-11-06', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'bw10', era: 'Noir et Blanc', nom: 'Explosion Plasma',                dateSortie: '2013-08-14', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'bw9',  era: 'Noir et Blanc', nom: 'Glaciation Plasma',               dateSortie: '2013-05-08', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'bw8',  era: 'Noir et Blanc', nom: 'Tempête Plasma',                  dateSortie: '2013-02-06', prixSortie: 34.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'bw7',  era: 'Noir et Blanc', nom: 'Frontières Franchies',            dateSortie: '2012-11-07', prixSortie: 29.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'bw6',  era: 'Noir et Blanc', nom: 'Dragons Exaltés',                 dateSortie: '2012-08-15', prixSortie: 29.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'bw5',  era: 'Noir et Blanc', nom: 'Explorateurs Obscurs',            dateSortie: '2012-05-09', prixSortie: 29.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'bw4',  era: 'Noir et Blanc', nom: 'Prochaine Destinée',              dateSortie: '2012-02-08', prixSortie: 29.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'bw3',  era: 'Noir et Blanc', nom: 'Nobles Victoires',                dateSortie: '2011-11-16', prixSortie: 29.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'bw2',  era: 'Noir et Blanc', nom: 'Pouvoirs Émergents',              dateSortie: '2011-08-31', prixSortie: 29.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
  { id: 'bw1',  era: 'Noir et Blanc', nom: 'Noir et Blanc',                   dateSortie: '2011-04-25', prixSortie: 29.99, contenu: { boosters: 8, sleeves: 45, coin: 1, des: 2 } },
]

async function seed() {
  console.log(`Insertion de ${ETBS.length} ETB...`)

  for (const etb of ETBS) {
    const cmUrl = CM_ETBS[etb.id] ?? null
    await prisma.etb.upsert({
      where: { id: etb.id },
      update: {
        nom: etb.nom,
        era: etb.era,
        imageUrl: logoUrl(etb.id),
        cmUrl,
      },
      create: {
        id: etb.id,
        nom: etb.nom,
        era: etb.era,
        setId: etb.id,
        imageUrl: logoUrl(etb.id),
        dateSortie: new Date(etb.dateSortie),
        prixSortie: etb.prixSortie,
        contenu: etb.contenu,
        cmUrl,
      },
    })
    process.stdout.write('.')
  }

  console.log(`\n\n✓ ${ETBS.length} ETB insérées.`)
  await prisma.$disconnect()
}

seed().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
