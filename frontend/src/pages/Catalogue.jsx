import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { fetchETBs, fetchPrixActuels } from '../services/api'

const ERES = [
  'Toutes',
  'Méga-Évolution',
  'Écarlate et Violet',
  'Épée et Bouclier',
  'Soleil et Lune',
  'XY',
  'Noir et Blanc',
]

const TRIS = [
  { key: 'phase',    label: '🎯 Phase achat' },
  { key: 'hausse',   label: '📈 Hausse' },
  { key: 'multiple', label: '×  Multiple' },
  { key: 'prix',     label: '💶 Prix' },
  { key: 'date',     label: '📅 Date' },
]

// Calcule la phase d'investissement calibrée sur les données réelles du vault
// Seuils validés empiriquement : sets de 10-12 mois atteignent naturellement ×1.5
function inferPhase(prixSortie, prixActuel, dateSortie) {
  if (!prixSortie || prixSortie <= 0 || !prixActuel) return null
  const ageMois = dateSortie
    ? (Date.now() - new Date(dateSortie)) / (1000 * 60 * 60 * 24 * 30)
    : null
  const mult = prixActuel / prixSortie

  // Phase 1 — très récent, pas encore d'appréciation
  if (ageMois !== null && ageMois < 4 && mult <= 1.2)
    return { num: 1, label: 'Récent',    action: 'Observer', color: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30' }

  // Phase 2 — fenêtre d'achat : seulement dans les 10 premiers mois
  // Au-delà, un faible multiple = probablement encore en production ou peu demandé
  if ((ageMois === null || ageMois <= 10) && mult <= 1.4)
    return { num: 2, label: 'Distribution', action: 'Acheter',  color: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30' }

  // Stagnant — > 12 mois et faible appréciation : encore en production probable ou marché froid
  if (ageMois !== null && ageMois > 12 && mult < 1.5)
    return { num: 3, label: 'Stagnant',  action: 'Prudence', color: 'text-gray-400',   bg: 'bg-gray-700/30',   border: 'border-gray-600/40', stagnant: true }

  // Phase 3 — valorisation normale
  if (mult < 2.0)
    return { num: 3, label: 'Valorisation', action: 'Surveiller', color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30' }

  // Phase 4 — maturité
  return   { num: 4, label: 'Maturité',  action: 'Tenir',    color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30' }
}

export default function Catalogue() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [etbs, setEtbs] = useState([])
  const [prixActuels, setPrixActuels] = useState({})
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState(searchParams.get('q') ?? '')
  const [ereActive, setEreActive] = useState(searchParams.get('ere') ?? 'Toutes')
  const [tri, setTri] = useState('phase')

  useEffect(() => {
    fetchETBs()
      .then(setEtbs)
      .catch(() => {})
      .finally(() => setLoading(false))
    fetchPrixActuels().then(setPrixActuels).catch(() => {})
  }, [])

  // Sync URL params
  useEffect(() => {
    const p = {}
    if (recherche) p.q = recherche
    if (ereActive !== 'Toutes') p.ere = ereActive
    setSearchParams(p, { replace: true })
  }, [recherche, ereActive])

  const etbsFiltres = useMemo(() => {
    let list = etbs
    if (ereActive !== 'Toutes') list = list.filter((e) => e.era === ereActive)
    if (recherche.trim()) {
      const q = recherche.toLowerCase()
      list = list.filter((e) => e.nom.toLowerCase().includes(q) || e.id.includes(q))
    }

    // Enrichir chaque ETB avec phase et multiple
    list = list.map((e) => {
      const prixSortie = Number(e.prixSortie ?? e.prix_sortie ?? 0)
      const prixActuel = prixActuels[e.id]?.prixActuel ?? null
      const phase = inferPhase(prixSortie, prixActuel, e.dateSortie ?? e.date_sortie)
      const multiple = prixSortie > 0 && prixActuel ? prixActuel / prixSortie : null
      const variation = prixSortie > 0 && prixActuel
        ? Math.round(((prixActuel - prixSortie) / prixSortie) * 100) : null
      return { ...e, prixSortie, prixActuel, phase, multiple, variation }
    })

    // Tri
    if (tri === 'phase') {
      list = [...list].sort((a, b) => {
        // Phase 2 en premier (meilleure opportunité), puis 1, 3, 4, null en dernier
        const order = { 2: 0, 1: 1, 3: 2, 4: 3 }
        const pa = a.phase ? (order[a.phase.num] ?? 4) : 5
        const pb = b.phase ? (order[b.phase.num] ?? 4) : 5
        if (pa !== pb) return pa - pb
        return (b.multiple ?? 0) - (a.multiple ?? 0)
      })
    } else if (tri === 'hausse') {
      list = [...list].sort((a, b) => (b.variation ?? -999) - (a.variation ?? -999))
    } else if (tri === 'multiple') {
      list = [...list].sort((a, b) => (b.multiple ?? 0) - (a.multiple ?? 0))
    } else if (tri === 'prix') {
      list = [...list].sort((a, b) => (b.prixActuel ?? b.prixSortie ?? 0) - (a.prixActuel ?? a.prixSortie ?? 0))
    } else if (tri === 'date') {
      list = [...list].sort((a, b) => {
        const da = a.dateSortie ?? a.date_sortie
        const db = b.dateSortie ?? b.date_sortie
        return new Date(db ?? 0) - new Date(da ?? 0)
      })
    }

    return list
  }, [etbs, ereActive, recherche, tri, prixActuels])

  // Grouper par ère seulement si tri = date ET pas de filtre ère
  const afficherGroupes = tri === 'date' && ereActive === 'Toutes'

  const groupes = useMemo(() => {
    if (!afficherGroupes) return null
    return ERES.slice(1).reduce((acc, ere) => {
      const liste = etbsFiltres.filter((e) => e.era === ere)
      if (liste.length > 0) acc[ere] = liste
      return acc
    }, {})
  }, [etbsFiltres, afficherGroupes])

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      {/* ── Barre de filtres sticky ──────────────────────────── */}
      <div className="sticky top-[57px] z-40 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 space-y-3">

          {/* Recherche */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher une ETB..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 outline-none placeholder-gray-500 focus:ring-1 focus:ring-pokemon-yellow"
            />
            {recherche && (
              <button
                onClick={() => setRecherche('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* Filtres ères + tri */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {ERES.map((ere) => (
              <button
                key={ere}
                onClick={() => setEreActive(ere)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  ereActive === ere
                    ? 'bg-pokemon-yellow text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {ere}
              </button>
            ))}
            <div className="w-px h-4 bg-gray-700 shrink-0 mx-1" />
            {TRIS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTri(t.key)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tri === t.key
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-800/60 text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contenu ─────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 18 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : etbsFiltres.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-4xl">🔍</p>
            <p className="text-gray-400 text-sm">Aucune ETB trouvée</p>
            <button onClick={() => { setRecherche(''); setEreActive('Toutes') }} className="text-pokemon-yellow text-sm hover:underline">
              Réinitialiser les filtres
            </button>
          </div>
        ) : afficherGroupes && groupes ? (
          <div className="space-y-10">
            {Object.entries(groupes).map(([ere, liste]) => (
              <section key={ere}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-white font-bold text-lg">{ere}</h2>
                  <span className="text-gray-600 text-sm">{liste.length} ETBs</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {liste.map((etb) => (
                    <ETBCatalogueCard key={etb.id} etb={etb} onClick={() => navigate(`/etb/${etb.id}`)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {tri === 'phase' && (
              <p className="text-gray-600 text-xs mb-4">
                Triées par opportunité d'achat — Phase 2 (Distribution) en premier
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {etbsFiltres.map((etb) => (
                <ETBCatalogueCard key={etb.id} etb={etb} onClick={() => navigate(`/etb/${etb.id}`)} />
              ))}
            </div>
            <p className="text-gray-700 text-xs text-center pt-4">
              {etbsFiltres.length} ETBs · Source : TCGdex
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

function ETBCatalogueCard({ etb, onClick }) {
  const { prixSortie, prixActuel, phase, multiple, variation } = etb
  const boxImage = etb.boxImageUrl ?? etb.box_image_url
  const image = boxImage ?? etb.imageUrl ?? etb.image_url
  const annee = (etb.dateSortie || etb.date_sortie)
    ? new Date(etb.dateSortie ?? etb.date_sortie).getFullYear()
    : ''

  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-xl border border-gray-700/60 bg-gray-800/50 overflow-hidden hover:border-pokemon-yellow/60 hover:bg-gray-800 transition-all duration-200 text-left group hover:shadow-lg hover:shadow-black/20"
    >
      {/* Phase badge en haut si disponible */}
      {phase && (
        <div className={`px-2 py-1 flex items-center justify-between ${phase.bg} border-b ${phase.border}`}>
          <span className={`text-[9px] font-black uppercase tracking-wider ${phase.color}`}>
            {phase.num} · {phase.label}
          </span>
          <span className={`text-[9px] font-semibold ${phase.color} opacity-70`}>{phase.action}</span>
        </div>
      )}

      {/* Image */}
      <div className="bg-gray-900/60 flex items-center justify-center h-28 w-full overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={etb.nom}
            className="h-20 object-contain p-2 group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <span className="text-gray-600 text-[10px] font-mono">{etb.id}</span>
        )}
      </div>

      {/* Infos */}
      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
        <div>
          <p className="text-white text-[11px] font-semibold leading-snug line-clamp-2 group-hover:text-pokemon-yellow transition-colors">{etb.nom}</p>
          <p className="text-gray-600 text-[10px] mt-0.5">{etb.era} {annee && `· ${annee}`}</p>
        </div>

        {/* Prix + signaux */}
        <div className="mt-auto pt-1 space-y-1">
          <div className="flex items-center justify-between gap-1">
            {prixActuel ? (
              <p className="text-pokemon-yellow font-bold text-xs">
                {prixActuel.toFixed(2).replace('.', ',')} €
              </p>
            ) : prixSortie > 0 ? (
              <p className="text-gray-500 font-medium text-xs">
                {prixSortie.toFixed(2).replace('.', ',')} €
              </p>
            ) : <span />}

            {multiple !== null && (
              <span className={`text-[10px] font-black shrink-0 ${
                multiple >= 3 ? 'text-orange-400' :
                multiple >= 2 ? 'text-yellow-400' :
                multiple >= 1.3 ? 'text-green-400' : 'text-gray-500'
              }`}>
                ×{multiple.toFixed(2)}
              </span>
            )}
          </div>

          {variation !== null && (
            <div className="flex items-center gap-1">
              <div className={`h-0.5 flex-1 rounded-full ${variation >= 0 ? 'bg-gray-700' : 'bg-gray-700'}`}>
                <div
                  className={`h-full rounded-full transition-all ${variation >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, Math.abs(variation))}%` }}
                />
              </div>
              <span className={`text-[10px] font-semibold shrink-0 ${variation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {variation >= 0 ? '+' : ''}{variation}%
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden animate-pulse">
      <div className="h-5 bg-gray-700/60" />
      <div className="h-28 bg-gray-700" />
      <div className="p-2.5 space-y-1.5">
        <div className="h-2.5 bg-gray-700 rounded w-4/5" />
        <div className="h-2 bg-gray-700 rounded w-1/2" />
        <div className="h-2.5 bg-gray-700 rounded w-1/3 mt-1" />
      </div>
    </div>
  )
}
