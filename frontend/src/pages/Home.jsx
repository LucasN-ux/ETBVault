import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import Navbar from '../components/Navbar'
import { fetchETBs, fetchTendances, fetchPrixHistoriqueMultiple } from '../services/api'

const PERIODES = [
  { jours: 7,  label: '7 jours' },
  { jours: 30, label: '30 jours' },
  { jours: 90, label: '3 mois' },
]

const LABEL_CONFIG = {
  'Hausse':     { badge: 'bg-green-500/20 text-green-400 border-green-500/30',  dot: 'bg-green-400' },
  'Stable':     { badge: 'bg-gray-700/60 text-gray-400 border-gray-600/30',     dot: 'bg-gray-500' },
  'Baisse':     { badge: 'bg-red-500/20 text-red-400 border-red-500/30',        dot: 'bg-red-400' },
  'Nouveau':    { badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',     dot: 'bg-blue-400' },
}

function getLabel(variation) {
  if (variation === null) return 'Nouveau'
  if (variation >= 2) return 'Hausse'
  if (variation <= -2) return 'Baisse'
  return 'Stable'
}

// Détecte si le rythme de hausse s'accélère en comparant la 1ère et 2ème moitié de la période
function detecterAcceleration(historique, jours) {
  if (!historique || historique.length < 4) return false
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - jours)
  const milieu = new Date(now)
  milieu.setDate(milieu.getDate() - Math.floor(jours / 2))

  const h1 = historique.filter((h) => new Date(h.date) >= cutoff && new Date(h.date) < milieu)
  const h2 = historique.filter((h) => new Date(h.date) >= milieu)

  if (h1.length < 2 || h2.length < 2) return false

  const v1 = (Number(h1[h1.length - 1].cmPrixMoyen) - Number(h1[0].cmPrixMoyen)) / Number(h1[0].cmPrixMoyen) * 100
  const v2 = (Number(h2[h2.length - 1].cmPrixMoyen) - Number(h2[0].cmPrixMoyen)) / Number(h2[0].cmPrixMoyen) * 100

  return v2 > v1 + 1.5 && v2 > 0.5
}

function Sparkline({ data, positif }) {
  if (!data || data.length === 0) return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full h-px bg-gray-700" />
    </div>
  )
  const color = positif ? '#22c55e' : '#ef4444'
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white">
                {Number(payload[0].value).toFixed(2)} €
              </div>
            )
          }}
        />
        <Line
          type="monotone"
          dataKey="cmPrixMoyen"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [etbs, setEtbs] = useState([])
  const [periode, setPeriode] = useState(7)
  const [tendances, setTendances] = useState([])
  const [historiques, setHistoriques] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingTendances, setLoadingTendances] = useState(false)

  // Charger les ETBs une seule fois
  useEffect(() => {
    fetchETBs().then(setEtbs).catch(() => {})
  }, [])

  // Recharger les tendances à chaque changement de période
  useEffect(() => {
    setLoadingTendances(true)
    fetchTendances(periode)
      .then(setTendances)
      .catch(() => {})
      .finally(() => { setLoadingTendances(false); setLoading(false) })
  }, [periode])

  // Top 10 : fusion tendances + données ETB
  const top10 = useMemo(() => {
    if (!etbs.length || !tendances.length) return []
    const etbMap = Object.fromEntries(etbs.map((e) => [e.id, e]))
    return tendances
      .slice(0, 10)
      .map((t, i) => {
        const etb = etbMap[t.etbId]
        if (!etb) return null
        return {
          ...etb,
          rang: i + 1,
          prixActuel: t.prixActuel,
          prixPrecedent: t.prixPrecedent,
          variationPct: t.variationPct,
          label: getLabel(t.variationPct),
        }
      })
      .filter(Boolean)
  }, [etbs, tendances])

  // Sparklines pour le top 10
  useEffect(() => {
    if (!top10.length) return
    fetchPrixHistoriqueMultiple(top10.map((e) => e.id))
      .then(setHistoriques)
      .catch(() => {})
  }, [top10.map((e) => e.id).join(',')])

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-pokemon-yellow/10 border border-pokemon-yellow/20 text-pokemon-yellow text-xs font-semibold px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 bg-pokemon-yellow rounded-full animate-pulse" />
            Marché Pokémon TCG · France uniquement
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight mb-5">
            Investissez dans les{' '}
            <span className="text-pokemon-yellow">ETB Pokémon</span>
          </h1>
          <p className="text-gray-400 text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            Catalogue complet des Elite Trainer Box. Score d'investissement transparent,
            historique des prix et valeur des cartes du set.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/catalogue')}
              className="bg-pokemon-yellow text-gray-900 font-bold text-base px-8 py-3.5 rounded-xl hover:bg-yellow-400 transition-colors w-full sm:w-auto"
            >
              Explorer les 76 ETBs →
            </button>
            <button
              onClick={() => navigate('/vault')}
              className="bg-gray-800 text-white font-semibold text-base px-8 py-3.5 rounded-xl hover:bg-gray-700 transition-colors w-full sm:w-auto border border-gray-700"
            >
              Mon Vault
            </button>
          </div>
        </div>
      </section>

      {/* ── Top 10 ────────────────────────────────────────────── */}
      <section className="border-t border-gray-800 py-14 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div>
              <h2 className="text-white font-bold text-2xl">Top 10 ETBs du moment</h2>
              <p className="text-gray-500 text-sm mt-1">
                Classées par hausse récente · Source : Cardmarket
              </p>
            </div>
            <div className="flex items-center gap-3 self-start">
              {/* Toggle période */}
              <div className="flex bg-gray-800 rounded-xl p-1 gap-0.5">
                {PERIODES.map((p) => (
                  <button
                    key={p.jours}
                    onClick={() => setPeriode(p.jours)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      periode === p.jours
                        ? 'bg-pokemon-yellow text-gray-900'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => navigate('/catalogue')}
                className="text-pokemon-yellow text-sm font-medium hover:underline whitespace-nowrap"
              >
                Tout voir →
              </button>
            </div>
          </div>

          {/* Podium — top 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {loading || loadingTendances || top10.length === 0
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} featured />)
              : top10.slice(0, 3).map((etb) => (
                  <Top10Card
                    key={etb.id}
                    etb={etb}
                    rang={etb.rang}
                    historique={historiques[etb.id] ?? []}
                    periode={periode}
                    featured
                    onClick={() => navigate(`/etb/${etb.id}`)}
                  />
                ))}
          </div>

          {/* Rangs 4-10 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {loading || loadingTendances || top10.length === 0
              ? Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)
              : top10.slice(3).map((etb) => (
                  <Top10Card
                    key={etb.id}
                    etb={etb}
                    rang={etb.rang}
                    historique={historiques[etb.id] ?? []}
                    periode={periode}
                    onClick={() => navigate(`/etb/${etb.id}`)}
                  />
                ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <section className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          <Stat value="76" label="ETBs" />
          <Stat value="6" label="Ères" />
          <Stat value="2011" label="Depuis" />
          <Stat value="100%" label="Gratuit" />
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section className="border-t border-gray-800 bg-gray-900/40 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-white font-bold text-xl text-center mb-10">Tout ce dont vous avez besoin</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FeatureCard icon="📈" title="Score transparent" desc="5 critères explicités — tendance 30j, stock, ratio prix/sortie, valeur pulls, intérêt communauté." />
            <FeatureCard icon="🃏" title="Valeur des cartes" desc="Prix Cardmarket de chaque carte du set. Identifiez les pulls les plus précieux." />
            <FeatureCard icon="🔒" title="Vault personnel" desc="Suivez vos ETBs achetées et calculez votre plus-value ou moins-value en temps réel." />
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-800 py-5 px-6 text-center mt-auto">
        <p className="text-gray-700 text-xs">
          ETBVault · Données : Cardmarket & TCGdex · Marché français uniquement
        </p>
      </footer>
    </div>
  )
}

function inferPhase(prixSortie, prixActuel, dateSortie) {
  if (!prixSortie || prixSortie <= 0 || !prixActuel) return null
  const ageMois = dateSortie
    ? (Date.now() - new Date(dateSortie)) / (1000 * 60 * 60 * 24 * 30)
    : null
  const mult = prixActuel / prixSortie
  if (ageMois !== null && ageMois < 6 && mult <= 1.15)
    return { num: 1, color: 'text-blue-400',   bg: 'bg-blue-500/15',   label: 'Observer' }
  if (mult <= 1.3 && (ageMois === null || ageMois < 30))
    return { num: 2, color: 'text-green-400',  bg: 'bg-green-500/15',  label: 'Acheter' }
  if (mult < 2.0)
    return { num: 3, color: 'text-yellow-400', bg: 'bg-yellow-500/15', label: 'Surveiller' }
  return   { num: 4, color: 'text-orange-400', bg: 'bg-orange-500/15', label: 'Maturité' }
}

function Top10Card({ etb, rang, historique, periode, featured = false, onClick }) {
  const cfg = LABEL_CONFIG[etb.label] ?? LABEL_CONFIG['Stable']
  const image = etb.boxImageUrl ?? etb.box_image_url ?? etb.imageUrl ?? etb.image_url
  const variation = etb.variationPct
  const positif = variation === null || variation >= 0
  const sparkData = historique.slice(-(periode <= 7 ? 7 : periode <= 30 ? 30 : 90))
  const isAcceleration = useMemo(
    () => detecterAcceleration(historique, periode <= 7 ? 7 : periode <= 30 ? 30 : 90),
    [historique, periode]
  )
  const prixSortie = Number(etb.prixSortie ?? etb.prix_sortie ?? 0)
  const phase = inferPhase(prixSortie, etb.prixActuel, etb.dateSortie ?? etb.date_sortie)
  const multiple = prixSortie > 0 && etb.prixActuel ? etb.prixActuel / prixSortie : null

  const rangColors = {
    1: 'text-yellow-400 border-yellow-400/60',
    2: 'text-gray-300 border-gray-400/50',
    3: 'text-amber-600 border-amber-600/50',
  }
  const rangCl = rangColors[rang] ?? 'text-gray-600 border-gray-700'

  const cardBorder = featured
    ? rang === 1 ? 'border-yellow-500/50 shadow-yellow-500/10 shadow-xl'
    : rang === 2 ? 'border-gray-400/30 shadow-gray-400/5 shadow-lg'
    : 'border-amber-600/30 shadow-amber-600/5 shadow-lg'
    : 'border-gray-700/60'

  const imageH = featured ? (rang === 1 ? 'h-52' : 'h-44') : 'h-36'
  const imgInnerH = featured ? (rang === 1 ? 'h-40' : 'h-32') : 'h-24'
  const sparkH = featured ? 'h-16' : 'h-11'
  const badgeSize = featured ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-[10px]'

  return (
    <button
      onClick={onClick}
      className={`group flex flex-col rounded-2xl border bg-gray-800/60 overflow-hidden text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl hover:border-gray-500 ${cardBorder}`}
    >
      {/* Bandeau podium pour le #1 */}
      {featured && rang === 1 && (
        <div className="bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-transparent px-3 py-1 border-b border-yellow-500/20 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-yellow-400 text-[9px] font-black tracking-widest uppercase">Meilleure hausse</span>
        </div>
      )}

      {/* Image */}
      <div className={`relative bg-gray-900 flex items-center justify-center ${imageH} w-full overflow-hidden`}>
        {image ? (
          <img src={image} alt={etb.nom} className={`${imgInnerH} object-contain p-3 group-hover:scale-105 transition-transform duration-300`} />
        ) : (
          <span className="text-gray-700 text-xs font-mono">{etb.id}</span>
        )}
        <div className={`absolute top-2.5 left-2.5 ${badgeSize} rounded-full border bg-gray-900/90 flex items-center justify-center font-black ${rangCl}`}>
          {rang}
        </div>
        <div className={`absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-sm ${cfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {etb.label}
        </div>
      </div>

      {/* Sparkline */}
      <div className={`${sparkH} bg-gray-900/60 border-t border-gray-700/40 px-1`}>
        <Sparkline data={sparkData} positif={positif} />
      </div>

      {/* Infos */}
      <div className={`${featured ? 'p-3.5' : 'p-2.5'} flex flex-col gap-1.5`}>
        <div>
          <p className={`text-white ${featured ? 'text-xs' : 'text-[10px]'} font-bold leading-snug line-clamp-2 group-hover:text-pokemon-yellow transition-colors`}>{etb.nom}</p>
          <p className="text-gray-600 text-[10px] mt-0.5">{etb.era}</p>
        </div>

        {/* Badges signaux */}
        <div className="flex flex-wrap gap-1">
          {phase && (
            <span className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${phase.bg} ${phase.color}`}>
              P{phase.num} {phase.label}
            </span>
          )}
          {isAcceleration && (
            <span className="inline-flex items-center gap-0.5 bg-orange-500/15 text-orange-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-orange-500/30">
              ↑↑ Accélère
            </span>
          )}
          {multiple !== null && multiple > 1 && (
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gray-700/60 ${
              multiple >= 3 ? 'text-orange-400' : multiple >= 2 ? 'text-yellow-400' : 'text-gray-400'
            }`}>
              ×{multiple.toFixed(1)}
            </span>
          )}
        </div>

        <div className="flex items-end justify-between mt-auto">
          <div>
            <p className={`text-pokemon-yellow font-black ${featured ? 'text-base' : 'text-sm'} leading-none`}>
              {etb.prixActuel.toFixed(2).replace('.', ',')} €
            </p>
            {etb.prixPrecedent && (
              <p className="text-gray-600 text-[10px] mt-0.5">
                -{periode}j : {etb.prixPrecedent.toFixed(2).replace('.', ',')} €
              </p>
            )}
          </div>
          <span className={`font-black ${featured ? 'text-sm' : 'text-xs'} ${variation === null ? 'text-blue-400' : positif ? 'text-green-400' : 'text-red-400'}`}>
            {variation === null ? 'Nouveau' : `${positif ? '+' : ''}${variation}%`}
          </span>
        </div>
      </div>
    </button>
  )
}

function SkeletonCard({ featured = false }) {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/60 overflow-hidden animate-pulse">
      <div className={`${featured ? 'h-48' : 'h-36'} bg-gray-700`} />
      <div className={`${featured ? 'h-16' : 'h-11'} bg-gray-750 border-t border-gray-700`} />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-700 rounded w-4/5" />
        <div className="h-2 bg-gray-700 rounded w-1/2" />
        <div className="flex justify-between mt-1">
          <div className="h-4 bg-gray-700 rounded w-1/3" />
          <div className="h-4 bg-gray-700 rounded w-1/4" />
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-gray-800/60 rounded-2xl p-5 border border-gray-700/60">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="text-white font-semibold text-sm mb-1.5">{title}</h3>
      <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div>
      <p className="text-pokemon-yellow font-black text-4xl">{value}</p>
      <p className="text-gray-500 text-sm mt-1">{label}</p>
    </div>
  )
}
