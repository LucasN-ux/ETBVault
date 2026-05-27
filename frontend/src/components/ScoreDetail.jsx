// Affichage transparent du score ETB — chaque critère est visible
// Règle d'or CLAUDE.md : jamais un score seul sans détail

const CRITERES_LABEL = {
  tendance_30j: '📈 Tendance prix 30j',
  stock_disponible: '📦 Stock disponible',
  ratio_prix_sortie: '💰 Ratio prix/sortie',
  valeur_pulls: '🃏 Valeur pulls',
  interet_communaute: '🔥 Intérêt communauté',
}

const SCORE_COLOR = (s) => {
  if (s >= 70) return 'text-green-400'
  if (s >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

const LABEL_COLOR = (label) => {
  if (label === 'Acheter') return 'bg-green-500/20 text-green-400 border-green-500/30'
  if (label === 'Surveiller') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  return 'bg-red-500/20 text-red-400 border-red-500/30'
}

const LABEL_EMOJI = { Acheter: '🟢', Surveiller: '🟡', 'Trop tard': '🔴' }

export default function ScoreDetail({ scoreData, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-2 border-pokemon-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!scoreData) {
    return (
      <div className="text-gray-500 text-sm text-center py-10">
        Score non disponible.
      </div>
    )
  }

  const { score, label, detail } = scoreData

  return (
    <div className="space-y-4">
      {/* Score global */}
      <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 flex items-center gap-5">
        <div className="text-center shrink-0">
          <p className={`text-5xl font-black ${SCORE_COLOR(score)}`}>{score}</p>
          <p className="text-gray-500 text-xs mt-1">/ 100</p>
        </div>
        <div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${LABEL_COLOR(label)}`}>
            {LABEL_EMOJI[label]} {label}
          </span>
          <p className="text-gray-400 text-xs mt-2 leading-relaxed">
            Score calculé à partir de 5 critères transparents pondérés.
            Chaque source est indiquée.
          </p>
        </div>
      </div>

      {/* Détail critères */}
      <div className="space-y-2">
        {Object.entries(detail).map(([key, critere]) => (
          <CritereRow key={key} nom={CRITERES_LABEL[key] ?? key} critere={critere} />
        ))}
      </div>

      <p className="text-gray-600 text-[10px] text-center">
        Algorithme 100% transparent · V1 — intérêt communauté fixé à 50
      </p>
    </div>
  )
}

function CritereRow({ nom, critere }) {
  const { score, poids, valeur, source } = critere
  return (
    <div className="bg-gray-800/60 rounded-xl px-4 py-3 border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-white text-xs font-medium">{nom}</span>
          <span className="text-gray-600 text-[10px] ml-2">({poids}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs font-mono">{valeur}</span>
          <span className={`font-bold text-sm w-7 text-right ${SCORE_COLOR(score)}`}>{score}</span>
        </div>
      </div>
      {/* Barre de progression */}
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{
            width: `${score}%`,
            backgroundColor: score >= 70 ? '#4ade80' : score >= 40 ? '#facc15' : '#f87171',
          }}
        />
      </div>
      <p className="text-gray-600 text-[10px] mt-1">→ {source}</p>
    </div>
  )
}
