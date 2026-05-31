import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProduits } from '../services/api'
import { ordonnerSeries } from '../utils/series'
import { Icon } from './Icon'
import { SearchInput } from './ui'

// Navigateur de séries (rail gauche de la fiche produit), adapté au design « vault ».
// Rail fixe sur grand écran, drawer coulissant + overlay sur mobile.
// L'accordéon liste les produits du type courant par série ; le produit courant est surligné.
const TYPE_LABEL = { ETB: 'ETB', DISPLAY: 'Displays', BOOSTER: 'Boosters', COFFRET: 'Coffrets', PREMIUM: 'Premium', TIN: 'Tins', BLISTER: 'Blisters', AUTRE: 'Produits' }

function ETBLink({ etb, active, onClick }) {
  const img = etb.boxImageUrl ?? etb.box_image_url ?? etb.imageUrl ?? etb.image_url
  const base = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
    padding: '6px 9px', borderRadius: 9, fontSize: 12.5, border: 0, cursor: 'pointer',
  }
  const activeStyle = active
    ? { ...base, background: 'var(--accent-soft)', color: 'var(--text)', fontWeight: 560, boxShadow: 'inset 2px 0 0 var(--accent)' }
    : base
  return (
    <button onClick={onClick} className={active ? '' : 'btn-quiet'} style={activeStyle} title={etb.nom}>
      <span style={{ width: 40, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: 'var(--surface-2)', overflow: 'hidden' }}>
        {img ? (
          <img src={img} alt="" loading="lazy" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <span className="font-mono" style={{ fontSize: 8, color: 'var(--faint)' }}>{etb.id}</span>
        )}
      </span>
      <span className="truncate">{etb.nom}</span>
    </button>
  )
}

export default function SeriesSidebar({ isOpen, onClose, currentId, type = 'ETB' }) {
  const navigate = useNavigate()
  const [etbs, setEtbs] = useState([])
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState({})

  // Liste les produits du même type que celui affiché, groupés par ère.
  // Pour les ETB, on ne garde que les ETB curés (ids non « cm- ») — les variantes
  // importées du catalogue CM (noms EN, sans image) pollueraient le navigateur.
  useEffect(() => {
    fetchProduits(type)
      .then((list) => setEtbs(type === 'ETB' ? list.filter((e) => !String(e.id).startsWith('cm-')) : list))
      .catch(() => {})
  }, [type])

  // Ère de l'ETB affichée : dépliée par défaut (tant que l'utilisateur n'a pas
  // explicitement basculé son état dans `expanded`).
  const currentEra = useMemo(() => etbs.find((e) => e.id === currentId)?.era, [etbs, currentId])
  const estOuverte = (era) => (era in expanded ? expanded[era] : era === currentEra)

  const grouped = useMemo(
    () => {
      const g = ordonnerSeries(etbs.map((e) => e.era)).map((era) => ({ era, list: etbs.filter((e) => e.era === era) }))
      const sans = etbs.filter((e) => !e.era)
      if (sans.length) g.push({ era: 'Sans série', list: sans })
      return g
    },
    [etbs],
  )
  const filtered = useMemo(() => {
    if (!q.trim()) return null
    const s = q.toLowerCase()
    return etbs.filter((e) => e.nom.toLowerCase().includes(s) || String(e.id).includes(s))
  }, [etbs, q])

  function go(id) {
    navigate(`/produit/${id}`)
    onClose?.()
  }
  function toggle(era) {
    setExpanded((prev) => ({ ...prev, [era]: !(era in prev ? prev[era] : era === currentEra) }))
  }

  const cls =
    'fixed lg:sticky flex flex-col transition-transform duration-300 ' +
    (isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')

  return (
    <aside
      className={cls}
      style={{
        top: 57, left: 0, zIndex: 40, alignSelf: 'flex-start', flexShrink: 0,
        width: 264, height: 'calc(100vh - 57px)',
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
      }}
    >
      {/* en-tête */}
      <div className="flex items-center justify-between" style={{ padding: '14px 14px 0' }}>
        <span className="display" style={{ fontSize: 15 }}>{TYPE_LABEL[type] ?? 'Produits'}</span>
        <button onClick={onClose} className="lg:hidden btn-quiet" style={{ padding: 6, borderRadius: 8, border: 0, cursor: 'pointer', display: 'flex' }} aria-label="Fermer">
          <Icon name="close" size={18} />
        </button>
      </div>

      {/* recherche */}
      <div style={{ padding: '12px 14px' }}>
        <SearchInput value={q} onChange={setQ} placeholder="Rechercher une série…" />
      </div>

      {/* liste */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '0 8px 16px' }}>
        {filtered ? (
          filtered.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--muted)', padding: '10px 8px' }}>Aucun résultat.</p>
          ) : (
            <div className="flex flex-col" style={{ gap: 2 }}>
              {filtered.map((e) => (
                <ETBLink key={e.id} etb={e} active={e.id === currentId} onClick={() => go(e.id)} />
              ))}
            </div>
          )
        ) : (
          grouped.map(({ era, list }) => {
            const open = estOuverte(era)
            return (
              <div key={era} style={{ marginBottom: 2 }}>
                <button
                  onClick={() => toggle(era)}
                  className="btn-quiet flex items-center justify-between w-full"
                  style={{ padding: '8px 9px', borderRadius: 9, border: 0, cursor: 'pointer', fontSize: 13, fontWeight: 560 }}
                >
                  <span>{era}</span>
                  <Icon name="chevronDown" size={15} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s var(--ease)', color: 'var(--faint)' }} />
                </button>
                {open && (
                  <div className="flex flex-col" style={{ gap: 2, marginTop: 2 }}>
                    {list.map((e) => (
                      <ETBLink key={e.id} etb={e} active={e.id === currentId} onClick={() => go(e.id)} />
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
