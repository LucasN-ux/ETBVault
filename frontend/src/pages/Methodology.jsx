import { useNavigate } from 'react-router-dom'

// Ce qu'ETBVault fait — des FAITS, pas des conseils.
// (Le score d'investissement et l'analyse spéculative ont été retirés le 2026-05-29.)
const SIGNAUX = [
  {
    icon: '💶',
    titre: 'Prix Cardmarket',
    source: 'Cardmarket (collecte quotidienne)',
    description:
      'Le prix de tendance et le prix le plus bas disponible sur Cardmarket, relevés chaque nuit. C\'est le prix courant affiché : le marché européen du scellé Pokémon se fait principalement sur CM.',
    limites: [
      'Représente le prix affiché, pas forcément le prix réellement vendu.',
      'CM est le marché EU — les prix japonais ou américains peuvent diverger.',
      'La donnée manque si la collecte échoue ou si l\'ETB n\'est pas encore référencée.',
    ],
  },
  {
    icon: '📉',
    titre: 'Graphique de prix fidèle',
    source: 'Points réellement collectés + historique importé',
    description:
      'Le prix est collecté chaque jour, mais la courbe n\'affiche pas un point par jour : elle ne « bouge » que lorsque le prix varie de façon significative (un mouvement de moins de 1% est ignoré, la courbe reste plate). Pas de moyenne mensuelle artificielle, et sur les longues périodes on réduit encore via LTTB en conservant pics, creux et ruptures.',
    limites: [
      'Un mouvement sous le seuil (~1%) n\'apparaît pas — c\'est volontaire, pour ne pas afficher le bruit quotidien.',
      'À l\'ajout d\'une ETB, une partie de l\'historique peut être importée depuis Cardmarket (marquée « historique importé ») pour amorcer la courbe.',
      'La profondeur de l\'historique dépend de ce que Cardmarket expose — pas toujours jusqu\'à la date de sortie.',
    ],
  },
  {
    icon: '📈',
    titre: 'Détection de mouvement adaptative',
    source: 'Calculé — volatilité propre de chaque ETB',
    description:
      'Au lieu d\'un seuil fixe identique pour toutes, chaque mouvement de prix est jugé par rapport à la volatilité normale de l\'ETB elle-même. Un +5 % sur une boîte habituellement stable est signalé « fort » ; le même +5 % sur une ETB volatile reste « faible ». On l\'affiche sur deux horizons : court terme (30 jours) et long terme (6 mois).',
    limites: [
      'C\'est un constat d\'évolution, pas une prédiction ni un conseil d\'achat.',
      'Sur les premières semaines (historique court), le niveau est approximatif (repli sur des seuils absolus).',
      'Ne dit rien des causes : une réimpression, une hype ou une simple correction produisent le même signal.',
    ],
  },
  {
    icon: '🔒',
    titre: 'Coffre-fort & plus-value',
    source: 'Vos achats (localStorage) × prix Cardmarket courant',
    description:
      'Vous enregistrez vos ETB achetées avec leur prix d\'achat. ETBVault calcule en direct votre plus-value ou moins-value (prix courant − prix d\'achat) et la valeur totale de votre coffre.',
    limites: [
      'La plus-value est « sur le papier » : tant que vous n\'avez pas vendu, c\'est une estimation au prix CM affiché.',
      'En V1, les données restent sur votre appareil (pas de compte) — videz le cache et elles disparaissent.',
      'Le prix de vente réel peut différer du prix CM (négociation, frais, état).',
    ],
  },
]

const ANGLES_MORTS = [
  {
    titre: 'Réimpressions Nintendo',
    niveau: 'Critique',
    couleur: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    desc: 'Nintendo peut réimprimer un set à tout moment, ce qui fait souvent chuter le prix du scellé. C\'est le principal facteur de baisse imprévue, et aucune donnée publique ne permet de l\'anticiper.',
  },
  {
    titre: 'Signaux communautaires',
    niveau: 'Important',
    couleur: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    desc: 'Vidéos YouTube, tournois, rumeurs Reddit/Discord : ces signaux humains précèdent souvent les mouvements de prix de plusieurs semaines. ETBVault ne les capte pas.',
  },
  {
    titre: 'Stock réel sur le marché',
    niveau: 'Important',
    couleur: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    desc: 'On n\'a pas le nombre réel d\'annonces actives sur Cardmarket. On ne peut donc pas mesurer directement l\'offre disponible — seul le prix est suivi.',
  },
  {
    titre: 'Prix affiché ≠ prix vendu',
    niveau: 'Modéré',
    couleur: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    desc: 'Le prix CM est le prix demandé par les vendeurs. Le prix réel de transaction peut être inférieur, surtout sur les ETB premium. Anticipez un écart de 5–15 %.',
  },
]

export default function Methodology() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <button onClick={() => navigate('/')} className="hover:text-gray-300 transition-colors">Accueil</button>
            <span>/</span>
            <span className="text-gray-400">Comment ça marche</span>
          </div>
          <h1 className="text-2xl font-black text-white">Comment fonctionne ETBVault ?</h1>
          <p className="text-gray-400 text-sm mt-1.5">
            Ce qu'on affiche, d'où viennent les données, et ce qu'on ne peut pas savoir.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Disclaimer principal */}
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-5">
          <p className="text-pokemon-yellow font-bold text-base mb-2">ℹ️ ETBVault affiche des faits, pas des conseils</p>
          <p className="text-gray-300 text-sm leading-relaxed">
            ETBVault est un <strong className="text-white">outil de suivi de prix</strong> et un{' '}
            <strong className="text-white">coffre-fort personnel</strong>. Il vous montre le prix courant,
            son évolution et la valeur de vos achats. Il ne vous dit jamais quoi acheter ni quand —
            le marché du scellé Pokémon dépend de facteurs (réimpressions, hype, mode) qu'aucune donnée
            ne permet de prévoir. L'interprétation reste la vôtre.
          </p>
        </div>

        {/* Signaux */}
        <section>
          <h2 className="text-white font-bold text-lg mb-1">Ce qu'on affiche</h2>
          <p className="text-gray-500 text-sm mb-5">
            Pour chaque élément : ce qu'il montre, d'où vient la donnée, et ses limites connues.
          </p>
          <div className="space-y-4">
            {SIGNAUX.map((s) => (
              <div key={s.titre} className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 sm:p-5">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl shrink-0 mt-0.5">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{s.titre}</p>
                    <p className="text-gray-600 text-[10px] mt-0.5 font-mono">Source : {s.source}</p>
                  </div>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed mb-3 whitespace-pre-line">{s.description}</p>
                <div className="border-t border-gray-700/50 pt-3">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Limites connues</p>
                  <ul className="space-y-1.5">
                    {s.limites.map((l, i) => (
                      <li key={i} className="flex gap-2 text-xs text-gray-500">
                        <span className="text-gray-700 shrink-0 mt-0.5">→</span>
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Angles morts */}
        <section>
          <h2 className="text-white font-bold text-lg mb-1">Ce qu'on ne peut pas savoir</h2>
          <p className="text-gray-500 text-sm mb-5">
            Ces facteurs influencent réellement les prix. Ils sont absents de nos données.
          </p>
          <div className="space-y-3">
            {ANGLES_MORTS.map((a) => (
              <div key={a.titre} className={`rounded-xl border p-4 sm:p-5 ${a.bg} ${a.border}`}>
                <div className="flex items-center gap-3 mb-2">
                  <p className={`font-bold text-sm ${a.couleur}`}>{a.titre}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${a.bg} ${a.border} ${a.couleur}`}>
                    {a.niveau}
                  </span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sources */}
        <section>
          <h2 className="text-white font-bold text-lg mb-4">Sources de données</h2>
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl overflow-hidden">
            {[
              { source: 'Cardmarket', usage: 'Prix de tendance et prix bas des ETB scellées', freq: 'Quotidien (07h00)', fiabilite: 'Élevée' },
              { source: 'TCGdex', usage: 'Prix des cartes individuelles du set', freq: 'Quotidien (07h30)', fiabilite: 'Élevée' },
              { source: 'TCGdex', usage: 'Catalogue sets, images, contenu des ETB', freq: 'Au chargement', fiabilite: 'Élevée' },
              { source: 'Base interne', usage: 'Prix de sortie, ères, IDs des ETB', freq: 'Manuel (admin)', fiabilite: 'Vérifiée manuellement' },
            ].map((row, i) => (
              <div key={i} className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs ${i % 2 === 0 ? '' : 'bg-gray-800/30'}`}>
                <span className="text-pokemon-yellow font-bold w-36 shrink-0">{row.source}</span>
                <span className="text-gray-300 flex-1">{row.usage}</span>
                <span className="text-gray-500 shrink-0 hidden sm:block">{row.freq}</span>
                <span className="text-gray-600 shrink-0 text-[10px]">{row.fiabilite}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-gray-800 pt-6 pb-4 text-center">
          <p className="text-gray-600 text-xs">
            ETBVault suit les prix et garde la trace de vos achats. Les décisions restent les vôtres.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-pokemon-yellow text-sm font-semibold hover:text-yellow-400 transition-colors"
          >
            ← Retour à l'accueil
          </button>
        </div>

      </div>
    </div>
  )
}
