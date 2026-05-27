import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchETBs } from '../services/api'

const ERA_ORDER = [
  'Méga-Évolution',
  'Écarlate et Violet',
  'Épée et Bouclier',
  'Soleil et Lune',
  'XY',
  'Noir et Blanc',
]

export default function Sidebar({ isOpen, onClose }) {
  const [etbs, setEtbs] = useState([])
  const [expanded, setExpanded] = useState({ 'Méga-Évolution': true, 'Écarlate et Violet': true })
  const [recherche, setRecherche] = useState('')
  const { id: currentId } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    fetchETBs().then(setEtbs).catch(() => {})
  }, [])

  const grouped = ERA_ORDER.reduce((acc, era) => {
    const liste = etbs.filter((e) => e.era === era)
    if (liste.length > 0) acc[era] = liste
    return acc
  }, {})

  const filtered = recherche.trim()
    ? etbs.filter((e) => e.nom.toLowerCase().includes(recherche.toLowerCase()))
    : null

  function handleClick(id) {
    navigate(`/etb/${id}`)
    if (onClose) onClose()
  }

  function toggleEra(era) {
    setExpanded((prev) => ({ ...prev, [era]: !prev[era] }))
  }

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full w-72 bg-gray-900 border-r border-gray-800 z-40 flex flex-col
        transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:h-screen
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate('/')} className="text-pokemon-yellow font-bold text-lg tracking-wide hover:text-yellow-400 transition-colors">
          ETBVault
        </button>
        <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white text-xl leading-none">✕</button>
      </div>

      {/* Liens rapides */}
      <div className="px-3 py-2 border-b border-gray-800 flex flex-wrap gap-1">
        <button
          onClick={() => { navigate('/'); onClose?.() }}
          className="flex-1 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg py-1.5 transition-colors"
        >
          🏠 Accueil
        </button>
        <button
          onClick={() => { navigate('/catalogue'); onClose?.() }}
          className="flex-1 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg py-1.5 transition-colors"
        >
          📦 Catalogue
        </button>
        <button
          onClick={() => { navigate('/vault'); onClose?.() }}
          className="flex-1 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg py-1.5 transition-colors"
        >
          🔒 Vault
        </button>
        <button
          onClick={() => { navigate('/methode'); onClose?.() }}
          className="w-full text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg py-1.5 transition-colors"
        >
          📖 Comment ça marche ?
        </button>
      </div>

      {/* Recherche */}
      <div className="px-3 py-3 border-b border-gray-800">
        <input
          type="text"
          placeholder="Rechercher une série..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 outline-none placeholder-gray-500 focus:ring-1 focus:ring-pokemon-yellow"
        />
      </div>

      {/* Liste */}
      <nav className="flex-1 overflow-y-auto py-2">
        {filtered ? (
          <div className="px-2">
            {filtered.length === 0 ? (
              <p className="text-gray-500 text-xs px-2 py-3">Aucun résultat</p>
            ) : (
              filtered.map((etb) => (
                <ETBLink
                  key={etb.id}
                  etb={etb}
                  active={etb.id === currentId}
                  onClick={() => handleClick(etb.id)}
                />
              ))
            )}
          </div>
        ) : (
          ERA_ORDER.map((era) => {
            const liste = grouped[era]
            if (!liste) return null
            const isExpanded = expanded[era] !== false
            return (
              <div key={era}>
                <button
                  onClick={() => toggleEra(era)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-800 transition-colors"
                >
                  <span className="text-white text-sm font-semibold">{era}</span>
                  <span className="text-gray-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div className="px-2 pb-1">
                    {liste.map((etb) => (
                      <ETBLink
                        key={etb.id}
                        etb={etb}
                        active={etb.id === currentId}
                        onClick={() => handleClick(etb.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </nav>
    </aside>
  )
}

function ETBLink({ etb, active, onClick }) {
  const image = etb.imageUrl ?? etb.image_url

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors
        ${active
          ? 'bg-pokemon-yellow text-gray-900'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        }
      `}
    >
      <div className="w-12 h-8 shrink-0 flex items-center justify-center">
        {image ? (
          <img
            src={image}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <span className="text-gray-600 text-[9px] font-mono">{etb.id}</span>
        )}
      </div>
      <span className={`truncate text-xs font-medium ${active ? 'font-semibold' : ''}`}>
        {etb.nom}
      </span>
    </button>
  )
}
