import { useNavigate } from 'react-router-dom'

const SIGNAUX = [
  {
    icon: '📈',
    titre: 'Tendance de prix Cardmarket',
    source: 'Cardmarket (scraping quotidien)',
    description:
      'Le prix moyen de tendance et le prix le plus bas disponible sur Cardmarket, mis à jour chaque nuit. C\'est notre signal de référence — le marché européen du scellé Pokémon se fait principalement sur CM.',
    limites: [
      'Représente le prix affiché, pas le prix réellement vendu.',
      'CM est le marché EU — les prix japonais ou américains peuvent diverger.',
      'Les données manquent si le scraping échoue ou si l\'ETB n\'est pas encore référencée.',
    ],
  },
  {
    icon: '🔄',
    titre: 'Phase du cycle de vie',
    source: 'Calculé — prix actuel ÷ prix de sortie + âge du set',
    description:
      'On situe chaque ETB dans l\'un des 4 stades de son cycle : Sortie (< 6 mois, prix stable), Distribution (prix proche du MSRP, fenêtre d\'achat), Valorisation (prix commence à monter, stock se raréfie), Maturité (prix établi haut, gains futurs limités).',
    limites: [
      'Les seuils (×1.15, ×1.3, ×2.0) sont basés sur l\'observation du marché, pas sur des lois économiques absolues.',
      'Un set peut sauter directement de la phase 1 à la phase 4 en cas de hype soudaine ou réimpression.',
      'Sans prix de sortie officiel dans la base, la phase est non calculable.',
    ],
  },
  {
    icon: '📊',
    titre: 'ROI annualisé (CAGR)',
    source: 'Calculé — (prix actuel ÷ prix sortie)^(1/années) − 1',
    description:
      'Le rendement annuel moyen depuis la date de sortie, exprimé en pourcentage. Permet de comparer une ETB à d\'autres classes d\'actifs : bourse (~8%/an historique), immobilier (~4%/an), livret A (~3%).',
    limites: [
      'Calculé uniquement si l\'ETB a au moins 6 mois d\'historique — trop tôt sinon, le chiffre n\'a pas de sens.',
      'Le passé ne prédit pas le futur. Un CAGR de 30%/an ne garantit pas 30% l\'année prochaine.',
      'Ne prend pas en compte la liquidité — une ETB à 400€ et une à 80€ peuvent avoir le même CAGR mais des risques très différents.',
    ],
  },
  {
    icon: '🃏',
    titre: 'Pression de déscellage',
    source: 'TCGdex (prix des cartes CM) + prix CM de la boîte scellée',
    description:
      'Ratio entre la valeur des 10 cartes les plus chères du set et le prix actuel de la boîte scellée. Quand ce ratio dépasse 1, les gens ont intérêt à acheter pour ouvrir — ce qui consomme le stock scellé et fait mécaniquement monter les prix.',
    limites: [
      'On prend les 10 cartes les plus chères, pas toutes les cartes. C\'est une valeur de pic, pas une espérance de gain réelle par boîte ouverte.',
      'Les taux de tirage ne sont pas inclus — une carte à 200€ qui sort 1 fois pour 200 boosters ne vaut pas la même chose qu\'une carte à 20€ qui sort souvent.',
      'Signal pertinent surtout pour les sets récents (< 3 ans). Pour le vintage, le scellé a une valeur indépendante des cartes.',
    ],
  },
  {
    icon: '🔍',
    titre: 'Nature de la hausse',
    source: 'Calculé — croise la pression déscellage et la tendance de prix',
    description:
      'Tente de distinguer si la hausse de prix est due à la valeur des cartes intérieures (fondamentale, plus durable) ou à la simple rareté du scellé sur le marché (spéculative, plus volatile). Une hausse portée par les cartes est en général plus solide qu\'une hausse portée uniquement par la pénurie.',
    limites: [
      'Signal qualitatif basé sur seulement deux variables — beaucoup de nuances sont perdues.',
      'Nécessite au moins 3 points de prix pour détecter une tendance.',
      'Les deux causes peuvent se combiner et se renforcer — la séparation est une simplification.',
    ],
  },
  {
    icon: '🏆',
    titre: 'Position dans l\'ère',
    source: 'Calculé — multiple de chaque ETB de la même génération',
    description:
      'Compare le multiple de valorisation (prix actuel ÷ prix de sortie) de cette ETB avec tous ses pairs de la même ère (Écarlate et Violet, Épée et Bouclier, etc.). Permet de voir si elle sur-performe ou sous-performe sa génération.',
    limites: [
      'Uniquement valable si plusieurs ETBs de l\'ère ont des prix renseignés — la comparaison est faussée si le catalogue est incomplet.',
      'Des ères différentes ne se comparent pas : une ère "Noir et Blanc" avec des ×8 est normale vu l\'ancienneté, une ère récente avec un ×8 serait extraordinaire.',
    ],
  },
  {
    icon: '💰',
    titre: 'Ticket d\'entrée & Profil risque',
    source: 'Calculé — quartiles des prix actuels du catalogue',
    description:
      'Classe l\'ETB dans les 4 quartiles de prix du vault (Accessible / Intermédiaire / Élevé / Premium) basé sur les prix réels de toutes les ETBs du catalogue. Croise cette info avec la phase du cycle pour donner un profil global : Opportunité, Favorable, Spéculatif, Investissement lourd.',
    limites: [
      'Les quartiles sont calculés sur le catalogue actuel — ils se déplacent à mesure que les prix évoluent.',
      'Le profil "Opportunité" ne garantit pas un gain. Il signifie uniquement que le capital est faible ET que le set est tôt dans son cycle.',
      'La liquidité est estimée par le prix, pas mesurée réellement (on n\'a pas le nombre d\'annonces disponibles).',
    ],
  },
  {
    icon: '⭐',
    titre: 'Score d\'investissement (0–100)',
    source: '5 critères pondérés — Cardmarket + TCGdex + prix de sortie officiel',
    description: `Score composite calculé à partir de 5 critères :
• Tendance 30j (25%) — variation de prix sur les 30 derniers jours
• Stock disponible (20%) — proxy via cmNbAnnonces (si disponible)
• Ratio prix/sortie (20%) — à quel multiple du prix de sortie se situe-t-on
• Valeur pulls (20%) — valeur des cartes du set vs prix de la boîte
• Intérêt communautaire (15%) — fixé à 50/100 en V1, données non disponibles`,
    limites: [
      'Le critère "intérêt communautaire" est neutre (50/100) en V1 — les données réelles (Google Trends, forums) ne sont pas encore intégrées.',
      'Un score élevé maintenant ne prédit pas un score élevé dans 6 mois — recalculé quotidiennement.',
      'Aucun algorithme ne peut anticiper une annonce de réimpression.',
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
    desc: 'C\'est le risque n°1, et on ne peut pas le prévoir. Nintendo peut réimprimer n\'importe quel set à tout moment. Une réimpression peut effacer des années d\'appréciation en quelques semaines. Aucune donnée disponible ne permet d\'anticiper cette décision — elle dépend de la stratégie commerciale interne de Nintendo.',
  },
  {
    titre: 'Signaux communautaires',
    niveau: 'Important',
    couleur: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    desc: 'Une vidéo YouTube d\'un gros créateur, un tournoi majeur, une rumeur sur Reddit TCG FR ou Discord peuvent créer une hype soudaine qui précède le mouvement de prix de plusieurs semaines. Ces signaux sont humains et non structurés — on ne les capte pas.',
  },
  {
    titre: 'Stock réel sur le marché secondaire',
    niveau: 'Important',
    couleur: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    desc: 'On n\'a pas accès au nombre réel d\'annonces actives sur Cardmarket (cmNbAnnonces non disponible depuis le Price Guide). On utilise le ratio prix_bas/prix_moyen comme proxy, mais ce n\'est qu\'une approximation. Un vendeur qui retire ses annonces peut fausser ce signal sans que rien de réel n\'ait changé.',
  },
  {
    titre: 'Taux de pull réels',
    niveau: 'Modéré',
    couleur: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    desc: 'La pression de déscellage suppose que toutes les cartes chères sont tirables équitablement. En réalité, une SIR Charizard peut sortir 1 fois pour 200 boosters. Les probabilités officielles de tirage ne sont pas dans nos données — notre EV est optimiste par construction.',
  },
  {
    titre: 'Événements macro et mode',
    niveau: 'Modéré',
    couleur: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    desc: 'Une crise économique, un effondrement du marché du scellé Pokémon, un changement de génération (les gens passent à un autre jeu de cartes), ou même une évolution de la culture collector en France peuvent affecter tous les prix simultanément. Ces facteurs dépassent largement le scope de l\'analyse.',
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
            <span className="text-gray-400">Méthodologie</span>
          </div>
          <h1 className="text-2xl font-black text-white">Comment fonctionne ETBVault ?</h1>
          <p className="text-gray-400 text-sm mt-1.5">
            Tous les signaux utilisés, leurs sources, et surtout — ce qu'on ne peut pas prévoir.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Disclaimer principal */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <p className="text-red-400 font-bold text-base mb-2">⚠️ Ce n'est pas du conseil financier</p>
          <p className="text-gray-300 text-sm leading-relaxed">
            ETBVault agrège des données publiques et applique des formules pour produire des signaux. Ces signaux sont des <strong className="text-white">indicateurs d'aide à la décision</strong>, pas des prédictions fiables à 100%. Le marché du scellé Pokémon est influencé par des facteurs humains, communautaires et commerciaux que <strong className="text-white">aucun algorithme ne peut anticiper</strong>. N'investissez que ce que vous êtes prêt à perdre.
          </p>
        </div>

        {/* Signaux */}
        <section>
          <h2 className="text-white font-bold text-lg mb-1">Les données qu'on utilise</h2>
          <p className="text-gray-500 text-sm mb-5">
            Pour chaque signal : ce qu'il mesure, d'où vient la donnée, et ses limites connues.
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
            Ces facteurs sont réels et influencent les prix. Ils sont absents de nos données.
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

        {/* Comment lire les signaux */}
        <section>
          <h2 className="text-white font-bold text-lg mb-4">Comment bien lire les signaux</h2>
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 space-y-4">
            <div className="flex gap-3">
              <span className="text-pokemon-yellow font-black text-lg shrink-0">1</span>
              <div>
                <p className="text-white text-sm font-semibold">Aucun signal seul ne suffit</p>
                <p className="text-gray-400 text-xs mt-1">Un bon score + une phase défavorable = signal contradictoire. Regardez toujours l'ensemble des indicateurs ensemble, pas un seul isolément.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-pokemon-yellow font-black text-lg shrink-0">2</span>
              <div>
                <p className="text-white text-sm font-semibold">Les données s'améliorent avec le temps</p>
                <p className="text-gray-400 text-xs mt-1">Plus le vault accumule d'historique de prix, plus les signaux de tendance, CAGR et pression déscellage deviennent précis. Les premières semaines, certains signaux seront absents ou approximatifs.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-pokemon-yellow font-black text-lg shrink-0">3</span>
              <div>
                <p className="text-white text-sm font-semibold">Le risque réimpression prime sur tout</p>
                <p className="text-gray-400 text-xs mt-1">Même un signal "Opportunité" avec un beau CAGR devient nul si Nintendo annonce une réimpression. Surveiller les annonces officielles reste indispensable — l'app ne le fait pas pour vous.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-pokemon-yellow font-black text-lg shrink-0">4</span>
              <div>
                <p className="text-white text-sm font-semibold">Prix CM ≠ prix de vente réel</p>
                <p className="text-gray-400 text-xs mt-1">Le prix affiché sur CM est le prix demandé par les vendeurs. Le vrai prix de transaction peut être inférieur, surtout pour les ETBs premium où les acheteurs négocient. Anticipez un spread de 5–15%.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Sources */}
        <section>
          <h2 className="text-white font-bold text-lg mb-4">Sources de données</h2>
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl overflow-hidden">
            {[
              { source: 'Cardmarket', usage: 'Prix de tendance et prix bas des ETBs scellées', freq: 'Quotidien (02h00)', fiabilite: 'Élevée' },
              { source: 'TCGdex', usage: 'Prix des cartes individuelles du set', freq: 'Quotidien (07h30)', fiabilite: 'Élevée' },
              { source: 'Pokémon TCG IO', usage: 'Catalogue sets, images, contenu des ETBs', freq: 'Au chargement', fiabilite: 'Élevée' },
              { source: 'Base de données interne', usage: 'Prix de sortie, ères, IDs des ETBs', freq: 'Manuel (admin)', fiabilite: 'Vérifiée manuellement' },
              { source: 'Google Trends / Communautés', usage: 'Signal intérêt communautaire', freq: '—', fiabilite: 'Non disponible en V1 (valeur fixe 50/100)' },
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
            ETBVault est un outil d'aide à l'analyse, pas un oracle. Les décisions d'investissement restent entièrement de votre responsabilité.
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
