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
  { key: 'date',  label: '📅 Date' },
  { key: 'prix',  label: '💶 Prix' },
  { key: 'nom',   label: '🔤 Nom' },
]

export default function Catalogue() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [etbs, setEtbs] = useState([])
  const [prixActuels, setPrixActuels] = useState({})
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState(searchParams.get('q') ?? '')
  const [ereActive, setEreActive] = useState(searchParams.get('ere') ?? 'Toutes')
  const [tri, setTri] = useState('date')

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

    // Enrichir avec le prix actuel
    list = list.map((e) => {
      const prixSortie = Number(e.prixSortie ?? e.prix_sortie ?? 0)
      const prixActuel = prixActuels[e.id]?.prixActuel ?? null
      return { ...e, prixSortie, prixActuel }
    })

    // Tri
    if (tri === 'date') {
      list = [...list].sort((a, b) => {
        const da = a.dateSortie ?? a.date_sortie
        const db = b.dateSortie ?? b.date_sortie
        return new Date(db ?? 0) - new Date(da ?? 0)
      })
    } else if (tri === 'prix') {
      list = [...list].sort((a, b) => (b.prixActuel ?? b.prixSortie ?? 0) - (a.prixActuel ?? a.prixSortie ?? 0))
    } else if (tri === 'nom') {
      list = [...list].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    }

    return list
  }, [etbs, ereActive, recherche, tri, prixActuels])

  // Grouper par ère si tri = date et pas de filtre ère
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
  const { prixSortie, prixActuel } = etb
  const image = etb.imageUrl ?? etb.image_url
  const annee = (etb.dateSortie || etb.date_sortie)
    ? new Date(etb.dateSortie ?? etb.date_sortie).getFullYear()
    : ''

  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-xl border border-gray-700/60 bg-gray-800/50 overflow-hidden hover:border-pokemon-yellow/60 hover:bg-gray-800 transition-all duration-200 text-left group hover:shadow-lg hover:shadow-black/20"
    >
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
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <p className="text-white text-[11px] font-semibold leading-snug line-clamp-2 group-hover:text-pokemon-yellow transition-colors">{etb.nom}</p>
        <p className="text-gray-600 text-[10px]">{etb.era}{annee && ` · ${annee}`}</p>

        <div className="mt-auto pt-1">
          {prixActuel ? (
            <p className="text-pokemon-yellow font-bold text-xs">
              {prixActuel.toFixed(2).replace('.', ',')} €
            </p>
          ) : prixSortie > 0 ? (
            <p className="text-gray-500 font-medium text-xs">
              {prixSortie.toFixed(2).replace('.', ',')} €
            </p>
          ) : null}
        </div>
      </div>
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden animate-pulse">
      <div className="h-28 bg-gray-700" />
      <div className="p-2.5 space-y-1.5">
        <div className="h-2.5 bg-gray-700 rounded w-4/5" />
        <div className="h-2 bg-gray-700 rounded w-1/2" />
        <div className="h-2.5 bg-gray-700 rounded w-1/3 mt-1" />
      </div>
    </div>
  )
}
