import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchETB, fetchCartes, fetchPrixHistorique } from '../services/api'
import { detecterMouvement } from '../utils/mouvement'
import { eur, eur0, dateFr, hueFromId } from '../utils/format'
import { Icon } from '../components/Icon'
import PriceChart from '../components/PriceChart'
import MovementDetail from '../components/MovementDetail'
import SeriesSidebar from '../components/SeriesSidebar'
import { BoxArt, MovementBadge, Price, EraTag, SearchInput } from '../components/ui'

const RARETE_ORDER = [
  'Special Illustration Rare', 'Hyper Rare', 'Illustration Rare', 'Ultra Rare',
  'Double Rare', 'Rare', 'Uncommon', 'Common', 'Promo',
]
const RARETE_LABEL = {
  'Special Illustration Rare': 'SIR', 'Hyper Rare': 'HR', 'Illustration Rare': 'IR',
  'Ultra Rare': 'UR', 'Double Rare': 'RR', 'Rare': 'R', 'Uncommon': 'U', 'Common': 'C', 'Promo': 'P',
}
const FOIL = new Set(['Special Illustration Rare', 'Hyper Rare', 'Illustration Rare'])

function CardArt({ carte }) {
  const [imgErr, setImgErr] = useState(false)
  const prix = Number(carte.prixMarche ?? 0)
  const hue = hueFromId(carte.id ?? carte.numero ?? '')
  const foil = FOIL.has(carte.rarete)
  const label = RARETE_LABEL[carte.rarete] ?? carte.rarete

  return (
    <div className="group flex flex-col" style={{ gap: 7 }}>
      <div className="relative overflow-hidden" style={{ aspectRatio: '2.5 / 3.5', borderRadius: 10, background: `linear-gradient(155deg, oklch(0.30 0.06 ${hue}), oklch(0.18 0.04 ${hue}))`, border: '1px solid var(--border)' }}>
        {carte.imageUrl && !imgErr ? (
          <img src={carte.imageUrl} alt={carte.nom} onError={() => setImgErr(true)} className="zoomable" style={{ width: '100%', height: '100%', objectFit: 'contain' }} loading="lazy" />
        ) : (
          <>
            <div className="absolute inset-0" style={{ opacity: foil ? 0.5 : 0.25, backgroundImage: `repeating-linear-gradient(125deg, oklch(1 0 0 / ${foil ? 0.12 : 0.05}) 0 3px, transparent 3px 11px)` }} />
            <div className="absolute inset-x-0 flex items-center justify-center" style={{ top: '34%', color: 'var(--faint)' }}>
              <Icon name="box" size={30} stroke={1.2} />
            </div>
          </>
        )}
        {carte.rarete && (
          <span className="absolute font-mono" style={{ bottom: 8, left: 8, fontSize: 10, padding: '2px 6px', borderRadius: 5, background: 'oklch(0 0 0 / 0.55)', color: '#fff', backdropFilter: 'blur(2px)' }}>{label}</span>
        )}
      </div>
      <div className="text-center">
        <div className="truncate" style={{ fontSize: 12.5, fontWeight: 540 }}>{carte.nom}</div>
        <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>#{carte.numero}</div>
        <div className="font-mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: prix > 5 ? 'var(--accent)' : 'var(--text-2)' }}>
          {prix > 0 ? eur(prix) : '—'}
        </div>
      </div>
    </div>
  )
}

export default function ETBDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const go = (p) => navigate(p)

  const [etb, setEtb] = useState(null)
  const [cartes, setCartes] = useState([])
  const [historique, setHistorique] = useState([])
  const [loadingEtb, setLoadingEtb] = useState(true)
  const [loadingCartes, setLoadingCartes] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [rarete, setRarete] = useState(null)
  const [q, setQ] = useState('')
  const [seriesOpen, setSeriesOpen] = useState(false)

  useEffect(() => {
    setLoadingEtb(true); setEtb(null); setErreur(null)
    fetchETB(id).then(setEtb).catch(() => setErreur('ETB introuvable.')).finally(() => setLoadingEtb(false))
  }, [id])

  useEffect(() => {
    if (!etb) return
    setCartes([]); setRarete(null); setQ(''); setLoadingCartes(true)
    fetchCartes(id).then(setCartes).catch(() => {}).finally(() => setLoadingCartes(false))
    fetchPrixHistorique(id).then(setHistorique).catch(() => {})
  }, [id, etb])

  const valeurSet = useMemo(() => cartes.reduce((s, c) => s + Number(c.prixMarche ?? 0), 0), [cartes])
  const raretes = useMemo(() => {
    const found = new Set(cartes.map((c) => c.rarete).filter(Boolean))
    return RARETE_ORDER.filter((r) => found.has(r))
  }, [cartes])
  const cartesFiltrees = useMemo(() => {
    let l = cartes
    if (rarete) l = l.filter((c) => c.rarete === rarete)
    if (q.trim()) { const s = q.toLowerCase(); l = l.filter((c) => c.nom?.toLowerCase().includes(s) || c.numero?.includes(s)) }
    return [...l].sort((a, b) => Number(b.prixMarche ?? 0) - Number(a.prixMarche ?? 0))
  }, [cartes, rarete, q])

  const mv30 = useMemo(() => detecterMouvement(historique).courtTerme, [historique])
  const prixSortie = etb ? Number(etb.prixSortie ?? etb.prix_sortie ?? 0) : 0
  const prixActuel = historique.length ? Number(historique[historique.length - 1].cmPrixMoyen) : prixSortie

  if (loadingEtb) {
    return <div style={{ padding: 80, textAlign: 'center', color: 'var(--muted)' }}>Chargement…</div>
  }
  if (erreur || !etb) {
    return <div style={{ padding: 80, textAlign: 'center', color: 'var(--down)' }}>{erreur || 'ETB introuvable.'}</div>
  }

  const cmUrl = etb.cmUrl ?? etb.cm_url
  const lienCardmarket = cmUrl || `https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodeURIComponent(`${etb.nom} Elite Trainer Box`)}`

  return (
    <div className="lg:flex" style={{ position: 'relative', zIndex: 1 }}>
      {/* rail gauche : navigateur de séries (drawer sur mobile) */}
      <SeriesSidebar isOpen={seriesOpen} onClose={() => setSeriesOpen(false)} currentId={id} type={etb.type ?? 'ETB'} />
      {seriesOpen && (
        <div className="fixed inset-0 lg:hidden" onClick={() => setSeriesOpen(false)} style={{ background: 'oklch(0 0 0 / 0.6)', zIndex: 35 }} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
      {/* bouton d'ouverture du rail (mobile) */}
      <div className="lg:hidden mx-auto" style={{ maxWidth: 1180, padding: '12px clamp(18px,4vw,40px) 0' }}>
        <button onClick={() => setSeriesOpen(true)} className="btn btn-ghost" style={{ padding: '8px 13px', fontSize: 13 }}>
          <Icon name="menu" size={16} /> Séries
        </button>
      </div>

      {/* breadcrumb */}
      <div className="mx-auto flex items-center gap-2" style={{ maxWidth: 1180, padding: '16px clamp(18px,4vw,40px) 0', fontSize: 12.5, color: 'var(--muted)' }}>
        <button onClick={() => go('/')} style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer' }}>Accueil</button>
        <Icon name="chevron" size={13} />
        <button onClick={() => go('/catalogue')} style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer' }}>Catalogue</button>
        <Icon name="chevron" size={13} />
        <span className="truncate" style={{ color: 'var(--text-2)', maxWidth: 200 }}>{etb.nom}</span>
      </div>

      {/* header */}
      <section className="mx-auto" style={{ maxWidth: 1180, padding: 'clamp(18px,3vw,28px) clamp(18px,4vw,40px)' }}>
        <div className="lg:grid lg:gap-8" style={{ gridTemplateColumns: '380px 1fr' }}>
          {/* gauche : slab + CTA */}
          <div className="flex flex-col" style={{ gap: 16 }}>
            <div className="slab group">
              <div className="slab__glare" />
              <div className="slab__stage" style={{ padding: 28, minHeight: 230 }}>
                <BoxArt etb={etb} className="w-full" style={{ maxHeight: 210, height: 210 }} />
              </div>
              <div className="flex items-center justify-between" style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{String(etb.id).replace('-', '.')}</span>
                <MovementBadge mv={mv30} showPct isNew={mv30.niveau === 'indisponible'} />
              </div>
            </div>
            <a href={lienCardmarket} target="_blank" rel="noopener noreferrer" className="btn btn-accent w-full justify-center" style={{ padding: '14px', fontSize: 15 }}>
              <Icon name="tag" size={17} /> Voir les offres sur Cardmarket <Icon name="external" size={15} />
            </a>
            <p style={{ fontSize: 11.5, color: 'var(--faint)', textAlign: 'center', marginTop: -6 }}>Comparez les vendeurs · vous quitterez etbVault</p>
          </div>

          {/* droite : identité + graphe + mouvement */}
          <div className="mt-8 lg:mt-0 flex flex-col" style={{ gap: 18 }}>
            <div>
              <EraTag>{etb.era} · {dateFr(etb.dateSortie ?? etb.date_sortie)}</EraTag>
              <h1 className="display" style={{ fontSize: 'clamp(26px,3vw,38px)', margin: '6px 0 14px' }}>{etb.nom}</h1>
              <div className="flex flex-wrap items-end" style={{ gap: 'clamp(20px,4vw,40px)' }}>
                <div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 4 }}>Prix marché</div>
                  <Price value={prixActuel} size={30} />
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 4 }}>Prix de sortie</div>
                  <span className="font-mono" style={{ fontSize: 18, color: 'var(--text-2)' }}>{prixSortie ? eur(prixSortie) : '—'}</span>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 4 }}>Valeur du set</div>
                  <span className="font-mono" style={{ fontSize: 18, color: 'var(--text-2)' }}>{valeurSet > 0 ? eur0(valeurSet) : '—'}</span>
                </div>
              </div>
            </div>

            {/* carte graphe */}
            <div className="card" style={{ padding: 'clamp(14px,2vw,20px)' }}>
              <PriceChart historique={historique} prixSortie={prixSortie} height={230} />
            </div>

            {/* carte mouvement */}
            <MovementDetail historique={historique} />
          </div>
        </div>
      </section>

      {/* cartes du set */}
      <section className="mx-auto" style={{ maxWidth: 1180, padding: '0 clamp(18px,4vw,40px) 60px' }}>
        <div className="flex items-baseline justify-between mb-4 mt-2">
          <h2 className="display" style={{ fontSize: 22 }}>Cartes du set</h2>
          <span className="font-mono" style={{ fontSize: 12.5, color: 'var(--faint)' }}>{cartes.length} cartes</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button className="chip" data-active={rarete === null} onClick={() => setRarete(null)} style={{ padding: '6px 13px', fontSize: 12.5 }}>Tout</button>
          {raretes.map((r) => (
            <button key={r} className="chip" data-active={rarete === r} onClick={() => setRarete(rarete === r ? null : r)} title={r} style={{ padding: '6px 12px', fontSize: 12.5 }}>
              {RARETE_LABEL[r] ?? r}
            </button>
          ))}
          <div className="ml-auto" style={{ minWidth: 180, maxWidth: 260, flex: '1 1 180px' }}>
            <SearchInput value={q} onChange={setQ} placeholder="Rechercher une carte…" />
          </div>
        </div>

        {loadingCartes ? (
          <div className="flex flex-col items-center justify-center" style={{ padding: '60px 0', gap: 12, color: 'var(--muted)' }}>
            <div style={{ width: 28, height: 28, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: 999 }} className="animate-spin" />
            <p style={{ fontSize: 13.5 }}>Chargement des cartes <span style={{ color: 'var(--faint)' }}>(première fois ~10 s)</span></p>
          </div>
        ) : cartes.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>Aucune carte trouvée.</p>
        ) : cartesFiltrees.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>Aucune carte ne correspond.</p>
        ) : (
          <>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
              {cartesFiltrees.map((c) => <CardArt key={c.id} carte={c} />)}
            </div>
            <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--faint)', marginTop: 28 }}>
              {cartesFiltrees.length} carte{cartesFiltrees.length > 1 ? 's' : ''} · prix Cardmarket via TCGdex
            </p>
          </>
        )}
      </section>
      </div>
    </div>
  )
}
