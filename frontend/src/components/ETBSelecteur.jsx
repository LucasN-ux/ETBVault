import { useState, useEffect, useMemo, useRef } from 'react'

const ERES = ['Toutes', 'Méga-Évolution', 'Écarlate et Violet', 'Épée et Bouclier', 'Soleil et Lune', 'XY', 'Noir et Blanc']

export default function ETBSelecteur({ etbs, value, onChange, placeholder = 'Choisir une ETB...' }) {
  const [ouvert, setOuvert] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [ereActive, setEreActive] = useState('Toutes')
  const inputRef = useRef(null)

  const etbSelectionnee = etbs.find((e) => e.id === value)

  // Reset filtre à l'ouverture + focus recherche
  useEffect(() => {
    if (ouvert) {
      setRecherche('')
      setEreActive('Toutes')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [ouvert])

  // Fermer sur Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOuvert(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const etbsFiltrees = useMemo(() => {
    let list = etbs
    if (ereActive !== 'Toutes') list = list.filter((e) => e.era === ereActive)
    if (recherche.trim()) {
      const q = recherche.toLowerCase()
      list = list.filter((e) => e.nom.toLowerCase().includes(q))
    }
    return list
  }, [etbs, ereActive, recherche])

  function selectionner(etb) {
    onChange(etb.id)
    setOuvert(false)
  }

  return (
    <>
      {/* ── Bouton déclencheur ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="w-full flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2.5 text-left border border-gray-700 hover:border-pokemon-yellow focus:outline-none focus:border-pokemon-yellow transition-colors"
      >
        {etbSelectionnee ? (
          <>
            <MiniLogo etb={etbSelectionnee} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{etbSelectionnee.nom}</p>
              <p className="text-gray-500 text-xs">{etbSelectionnee.era}</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange('') }}
              className="text-gray-600 hover:text-gray-300 transition-colors"
              title="Effacer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <span className="text-gray-500 text-sm flex-1">{placeholder}</span>
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </>
        )}
      </button>

      {/* ── Panel slide-in ─────────────────────────────────── */}
      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">

          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOuvert(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full sm:max-w-2xl bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-700 flex flex-col max-h-[85vh] sm:max-h-[80vh] shadow-2xl animate-slideUp">

            {/* Header panel */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
              <h3 className="text-white font-bold text-base">Choisir une ETB</h3>
              <button
                type="button"
                onClick={() => setOuvert(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Recherche + filtres ères */}
            <div className="px-4 py-3 border-b border-gray-800 space-y-2.5 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher une ETB..."
                className="w-full bg-gray-800 text-white text-sm rounded-xl px-4 py-2.5 outline-none placeholder-gray-500 focus:ring-1 focus:ring-pokemon-yellow"
              />
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
                {ERES.map((ere) => (
                  <button
                    key={ere}
                    type="button"
                    onClick={() => setEreActive(ere)}
                    className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      ereActive === ere
                        ? 'bg-pokemon-yellow text-gray-900'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {ere}
                  </button>
                ))}
              </div>
            </div>

            {/* Grille d'ETBs */}
            <div className="flex-1 overflow-y-auto p-4">
              {etbsFiltrees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <p className="text-3xl">🔍</p>
                  <p className="text-gray-400 text-sm">Aucune ETB trouvée</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {etbsFiltrees.map((etb) => (
                    <ETBCarteChoix
                      key={etb.id}
                      etb={etb}
                      selectionne={etb.id === value}
                      onClick={() => selectionner(etb)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Compteur */}
            <div className="px-5 py-3 border-t border-gray-800 shrink-0">
              <p className="text-gray-600 text-xs text-center">
                {etbsFiltrees.length} ETBs disponibles
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ETBCarteChoix({ etb, selectionne, onClick }) {
  const image = etb.imageUrl ?? etb.image_url
  const prixSortie = Number(etb.prixSortie ?? etb.prix_sortie)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col rounded-xl border overflow-hidden text-left transition-all hover:scale-[1.03] ${
        selectionne
          ? 'border-pokemon-yellow bg-pokemon-yellow/10 ring-1 ring-pokemon-yellow'
          : 'border-gray-700 bg-gray-800 hover:border-gray-500'
      }`}
    >
      {/* Image */}
      <div className="bg-gray-700/50 flex items-center justify-center h-24 w-full relative">
        {image ? (
          <img src={image} alt={etb.nom} className="h-20 object-contain p-1.5" />
        ) : (
          <span className="text-gray-600 text-[9px] font-mono">{etb.id}</span>
        )}
        {selectionne && (
          <div className="absolute top-1.5 right-1.5 bg-pokemon-yellow rounded-full w-5 h-5 flex items-center justify-center">
            <svg className="w-3 h-3 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      {/* Nom */}
      <div className="p-2">
        <p className="text-white text-[11px] font-medium leading-snug line-clamp-2">{etb.nom}</p>
        {prixSortie > 0 && (
          <p className="text-pokemon-yellow text-[10px] font-semibold mt-1">
            {prixSortie.toFixed(2).replace('.', ',')} €
          </p>
        )}
      </div>
    </button>
  )
}

function MiniLogo({ etb }) {
  const image = etb.imageUrl ?? etb.image_url
  return (
    <div className="w-12 h-8 shrink-0 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
      {image ? (
        <img src={image} alt={etb.nom} className="w-full h-full object-contain p-0.5" />
      ) : (
        <span className="text-gray-500 text-[9px] font-mono">{etb.id}</span>
      )}
    </div>
  )
}
