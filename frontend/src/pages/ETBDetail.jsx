import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchETB, fetchCartes, fetchPrixHistorique } from '../services/api'
import PriceChart from '../components/PriceChart'
import MovementDetail from '../components/MovementDetail'

const RARETE_ORDER = [
  'Special Illustration Rare',
  'Hyper Rare',
  'Illustration Rare',
  'Ultra Rare',
  'Double Rare',
  'Rare',
  'Uncommon',
  'Common',
  'Promo',
]

const RARETE_LABEL = {
  'Special Illustration Rare': 'SIR',
  'Hyper Rare': 'HR',
  'Illustration Rare': 'IR',
  'Ultra Rare': 'UR',
  'Double Rare': 'RR',
  'Rare': 'R',
  'Uncommon': 'U',
  'Common': 'C',
  'Promo': 'P',
}

export default function ETBDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [etb, setEtb] = useState(null)
  const [cartes, setCartes] = useState([])
  const [loadingEtb, setLoadingEtb] = useState(true)
  const [loadingCartes, setLoadingCartes] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [rareteActive, setRareteActive] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [historique, setHistorique] = useState([])
  const [loadingPrix, setLoadingPrix] = useState(false)

  useEffect(() => {
    setLoadingEtb(true)
    setEtb(null)
    setErreur(null)
    fetchETB(id)
      .then(setEtb)
      .catch(() => setErreur('ETB introuvable.'))
      .finally(() => setLoadingEtb(false))
  }, [id])

  useEffect(() => {
    if (!etb) return
    setCartes([])
    setRareteActive(null)
    setRecherche('')
    setLoadingCartes(true)
    fetchCartes(id)
      .then(setCartes)
      .catch(() => {})
      .finally(() => setLoadingCartes(false))
  }, [id, etb])

  useEffect(() => {
    if (!etb) return
    setLoadingPrix(true)
    fetchPrixHistorique(id)
      .then(setHistorique)
      .catch(() => {})
      .finally(() => setLoadingPrix(false))
  }, [id, etb])

  const raretesDisponibles = useMemo(() => {
    const found = new Set(cartes.map((c) => c.rarete).filter(Boolean))
    return RARETE_ORDER.filter((r) => found.has(r))
  }, [cartes])

  const cartesFiltrees = useMemo(() => {
    let list = cartes
    if (rareteActive) list = list.filter((c) => c.rarete === rareteActive)
    if (recherche.trim()) {
      const q = recherche.toLowerCase()
      list = list.filter((c) => c.nom?.toLowerCase().includes(q) || c.numero?.includes(q))
    }
    return list
  }, [cartes, rareteActive, recherche])

  const valeurTotale = useMemo(
    () => cartes.reduce((s, c) => s + Number(c.prixMarche ?? 0), 0),
    [cartes]
  )

  const prixSortie = useMemo(
    () => etb ? Number(etb.prixSortie ?? etb.prix_sortie ?? 0) : 0,
    [etb]
  )

  if (loadingEtb) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm animate-pulse">Chargement...</p>
      </div>
    )
  }

  if (erreur || !etb) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400 text-sm">{erreur || 'ETB introuvable.'}</p>
      </div>
    )
  }

  const annee = (etb.dateSortie || etb.date_sortie)
    ? new Date(etb.dateSortie ?? etb.date_sortie).toLocaleDateString('fr-FR', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—'
  const contenu = etb.contenu || {}

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Breadcrumb ───────────────────────────────────────── */}
      <div className="bg-gray-950 border-b border-gray-800/50 px-4 sm:px-6 py-2">
        <div className="max-w-5xl mx-auto flex items-center gap-2 text-xs text-gray-500">
          <button onClick={() => navigate('/')} className="hover:text-gray-300 transition-colors">Accueil</button>
          <span>/</span>
          <button onClick={() => navigate('/catalogue')} className="hover:text-gray-300 transition-colors">Catalogue</button>
          <span>/</span>
          <span className="text-gray-400 truncate max-w-[160px]">{etb.nom}</span>
        </div>
      </div>

      {/* ── Header ETB ───────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-5">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-5">

          {/* Gauche : image + infos */}
          <div className="flex gap-4 items-start shrink-0">
            <div className="rounded-xl flex items-center justify-center w-52 h-40 shrink-0 overflow-hidden bg-gray-900">
              {(etb.boxImageUrl ?? etb.box_image_url) ? (
                <img
                  src={etb.boxImageUrl ?? etb.box_image_url}
                  alt={etb.nom}
                  className="w-full h-full object-contain"
                />
              ) : (etb.imageUrl || etb.image_url) ? (
                <img
                  src={etb.imageUrl ?? etb.image_url}
                  alt={etb.nom}
                  className="h-24 object-contain p-2"
                />
              ) : (
                <span className="text-gray-600 text-xs">{etb.id}</span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="bg-gray-700 text-gray-300 text-xs font-mono px-2 py-0.5 rounded">
                  {etb.id?.toUpperCase()}
                </span>
                {etb.era && <span className="text-gray-500 text-xs">{etb.era}</span>}
              </div>
              <h1 className="text-xl font-bold text-white mb-0.5 leading-tight">{etb.nom}</h1>
              <p className="text-gray-400 text-xs mb-2">{annee}</p>

              <div className="flex flex-wrap gap-3 text-sm">
                <div>
                  <span className="text-pokemon-yellow font-bold">
                    {prixSortie ? `${prixSortie.toFixed(2).replace('.', ',')} €` : '—'}
                  </span>
                  <span className="text-gray-500 text-xs ml-1">sortie</span>
                </div>
                {cartes.length > 0 && (
                  <>
                    <div>
                      <span className="text-white font-semibold">{cartes.length}</span>
                      <span className="text-gray-500 text-xs ml-1">cartes</span>
                    </div>
                    <div>
                      <span className="text-pokemon-yellow font-semibold">
                        {valeurTotale > 0 ? `${valeurTotale.toFixed(2).replace('.', ',')} €` : '—'}
                      </span>
                      <span className="text-gray-500 text-xs ml-1">set</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.entries(contenu).map(([k, v]) => (
                  <span key={k} className="bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded-lg">
                    {v} {k.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Droite : graphique des prix */}
          <div className="flex-1 min-w-0">
            {loadingPrix ? (
              <div className="flex items-center justify-center h-36">
                <div className="w-6 h-6 border-2 border-pokemon-yellow border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <PriceChart historique={historique} prixSortie={prixSortie} compact />
                <MovementDetail historique={historique} />
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Filtre cartes ────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-2">
          <button
            onClick={() => setRareteActive(null)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              rareteActive === null ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Tout
          </button>
          {raretesDisponibles.map((r) => (
            <button
              key={r}
              onClick={() => setRareteActive(rareteActive === r ? null : r)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                rareteActive === r ? 'bg-pokemon-yellow text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
              title={r}
            >
              {RARETE_LABEL[r] ?? r}
            </button>
          ))}
          <div className="ml-auto flex-1 min-w-[160px] max-w-xs">
            <input
              type="text"
              placeholder="Recherchez une carte..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 outline-none placeholder-gray-500 focus:ring-1 focus:ring-pokemon-yellow"
            />
          </div>
        </div>
      </div>

      {/* ── Liste des cartes ─────────────────────────────────── */}
      <div className="flex-1 px-4 py-5">
        <div className="max-w-5xl mx-auto">
          {loadingCartes ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-2 border-pokemon-yellow border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">
                Chargement des cartes
                <span className="text-gray-600 text-xs ml-1">(première fois ~10s)</span>
              </p>
            </div>
          ) : cartes.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-20">Aucune carte trouvée.</p>
          ) : (
            <>
              {cartesFiltrees.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-10">Aucune carte ne correspond.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {cartesFiltrees.map((carte) => (
                    <CarteCard key={carte.id} carte={carte} />
                  ))}
                </div>
              )}
              <p className="text-gray-600 text-xs text-center mt-5">
                {cartesFiltrees.length} carte{cartesFiltrees.length > 1 ? 's' : ''} · Source : Cardmarket via TCGdex
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CarteCard({ carte }) {
  const prix = Number(carte.prixMarche ?? 0)
  const [imgErr, setImgErr] = useState(false)

  return (
    <div className="flex flex-col items-center gap-1.5 group cursor-default">
      <div className="relative w-full aspect-[2.5/3.5] bg-gray-800 rounded-xl overflow-hidden">
        {carte.imageUrl && !imgErr ? (
          <img
            src={carte.imageUrl}
            alt={carte.nom}
            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2">
            <span className="text-gray-600 text-[10px] text-center">{carte.nom}</span>
          </div>
        )}
        {carte.rarete && (
          <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-gray-300 text-[10px] px-1.5 py-0.5 rounded">
            {RARETE_LABEL[carte.rarete] ?? carte.rarete}
          </span>
        )}
      </div>
      <div className="w-full text-center">
        <p className="text-white text-xs font-medium truncate leading-tight">{carte.nom}</p>
        <p className="text-gray-500 text-[10px]">#{carte.numero}</p>
        <p className={`text-xs font-bold mt-0.5 ${prix > 0 ? 'text-pokemon-yellow' : 'text-gray-600'}`}>
          {prix > 0 ? `${prix.toFixed(2).replace('.', ',')} €` : '—'}
        </p>
      </div>
    </div>
  )
}
