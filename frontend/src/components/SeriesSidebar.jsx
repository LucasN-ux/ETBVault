import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchEtbs } from '../services/api'
import { useRequete } from '../hooks/useRequete'
import { ordonnerSeries } from '../utils/series'
import { TABLEAU_VIDE } from '../utils/vides'
import { Icon } from './Icon'
import { SearchInput } from './ui'

// Rail de navigation des ères (fiche ETB).
// Rail fixe sur grand écran, tiroir coulissant sur mobile.

const SANS_SERIE = 'Sans série'

export default function SeriesSidebar({ isOpen, onClose, currentId }) {
  const navigate = useNavigate()
  const { donnees, erreur } = useRequete(fetchEtbs)
  const [recherche, setRecherche] = useState('')
  const [depliees, setDepliees] = useState({})

  const etbs = donnees ?? TABLEAU_VIDE

  // L'ère de l'ETB affichée est dépliée par défaut, tant que l'utilisateur n'a
  // pas explicitement basculé son état.
  const ereCourante = useMemo(() => etbs.find((e) => e.id === currentId)?.era, [etbs, currentId])
  const estDepliee = (ere) => (ere in depliees ? depliees[ere] : ere === ereCourante)

  const groupes = useMemo(() => {
    const parEre = ordonnerSeries(etbs.map((e) => e.era))
      .map((ere) => ({ ere, liste: etbs.filter((e) => e.era === ere) }))
      .filter((g) => g.liste.length > 0)
    const sansEre = etbs.filter((e) => !e.era)
    if (sansEre.length > 0) parEre.push({ ere: SANS_SERIE, liste: sansEre })
    return parEre
  }, [etbs])

  // null = pas de recherche en cours, on affiche l'accordéon par ère.
  const resultats = useMemo(() => {
    const terme = recherche.trim().toLowerCase()
    if (!terme) return null
    return etbs.filter((e) =>
      [e.nomFr, e.nom, e.id].some((champ) => champ && String(champ).toLowerCase().includes(terme)),
    )
  }, [etbs, recherche])

  function ouvrir(id) {
    navigate(`/etb/${id}`)
    onClose?.()
  }

  function basculer(ere) {
    setDepliees((prev) => ({ ...prev, [ere]: !estDepliee(ere) }))
  }

  return (
    <aside
      className={
        'fixed lg:sticky flex flex-col transition-transform duration-300 ' +
        (isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
      }
      style={{
        top: 57,
        left: 0,
        zIndex: 40,
        alignSelf: 'flex-start',
        flexShrink: 0,
        width: 264,
        height: 'calc(100vh - 57px)',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between" style={{ padding: '14px 14px 0' }}>
        <span className="display" style={{ fontSize: 15 }}>
          Elite Trainer Box
        </span>
        <button
          onClick={onClose}
          className="lg:hidden btn-quiet"
          style={{ padding: 6, borderRadius: 8, border: 0, cursor: 'pointer', display: 'flex' }}
          aria-label="Fermer"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <SearchInput value={recherche} onChange={setRecherche} placeholder="Rechercher une ETB…" />
      </div>

      <nav className="flex-1 overflow-y-auto" style={{ padding: '0 8px 16px' }}>
        {erreur ? (
          <p style={{ fontSize: 12.5, color: 'var(--muted)', padding: '10px 8px' }}>
            Liste indisponible.
          </p>
        ) : resultats ? (
          resultats.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--muted)', padding: '10px 8px' }}>Aucun résultat.</p>
          ) : (
            <div className="flex flex-col" style={{ gap: 2 }}>
              {resultats.map((e) => (
                <LienEtb key={e.id} etb={e} actif={e.id === currentId} onClick={() => ouvrir(e.id)} />
              ))}
            </div>
          )
        ) : (
          groupes.map(({ ere, liste }) => (
            <div key={ere} style={{ marginBottom: 2 }}>
              <button
                onClick={() => basculer(ere)}
                className="btn-quiet flex items-center justify-between w-full"
                style={{ padding: '8px 9px', borderRadius: 9, border: 0, cursor: 'pointer', fontSize: 13, fontWeight: 560 }}
              >
                <span>{ere}</span>
                <Icon
                  name="chevronDown"
                  size={15}
                  style={{
                    transform: estDepliee(ere) ? 'none' : 'rotate(-90deg)',
                    transition: 'transform 0.2s var(--ease)',
                    color: 'var(--faint)',
                  }}
                />
              </button>
              {estDepliee(ere) && (
                <div className="flex flex-col" style={{ gap: 2, marginTop: 2 }}>
                  {liste.map((e) => (
                    <LienEtb key={e.id} etb={e} actif={e.id === currentId} onClick={() => ouvrir(e.id)} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </nav>
    </aside>
  )
}

function LienEtb({ etb, actif, onClick }) {
  const image = etb.imageUrl ?? etb.image_url
  const style = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    textAlign: 'left',
    padding: '6px 9px',
    borderRadius: 9,
    fontSize: 12.5,
    border: 0,
    cursor: 'pointer',
    ...(actif && {
      background: 'var(--accent-soft)',
      color: 'var(--text)',
      fontWeight: 560,
      boxShadow: 'inset 2px 0 0 var(--accent)',
    }),
  }

  return (
    <button onClick={onClick} className={actif ? '' : 'btn-quiet'} style={style} title={etb.nomFr ?? etb.nom}>
      <span
        style={{
          width: 40,
          height: 28,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          background: 'var(--surface-2)',
          overflow: 'hidden',
        }}
      >
        {image ? (
          <img src={image} alt="" loading="lazy" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <span className="font-mono" style={{ fontSize: 8, color: 'var(--faint)' }}>
            {etb.id}
          </span>
        )}
      </span>
      <span className="truncate">{etb.nomFr ?? etb.nom}</span>
    </button>
  )
}
