import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchProduits, fetchSparklines, fetchPrixActuels } from '../services/api'
import { detecterMouvement } from '../utils/mouvement'
import { Icon } from '../components/Icon'
import Sparkline from '../components/Sparkline'
import { BoxArt, MovementBadge, Price, VarNum, SearchInput, Chip, EraTag } from '../components/ui'

const ERES = ['Méga-Évolution', 'Écarlate et Violet', 'Épée et Bouclier', 'Soleil et Lune', 'XY', 'Noir et Blanc']
// Types de produits (filtre principal). Pas de « Tous » : le catalogue compte des milliers de produits.
const TYPES = [
  { k: 'ETB', l: 'ETB' },
  { k: 'DISPLAY', l: 'Displays' },
  { k: 'BOOSTER', l: 'Boosters' },
  { k: 'COFFRET', l: 'Coffrets' },
  { k: 'PREMIUM', l: 'Premium' },
  { k: 'TIN', l: 'Tins' },
  { k: 'BLISTER', l: 'Blisters' },
]
const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.k, t.l]))
const TRIS = [
  { k: 'date', l: 'Sortie' },
  { k: 'prix', l: 'Prix' },
  { k: 'var', l: 'Évolution' },
  { k: 'nom', l: 'A–Z' },
]

function CatCard({ etb, go }) {
  const up = (etb.v30 ?? 0) >= 0
  const spark = (etb.series ?? []).slice(-30).map((p) => Number(p.cmPrixMoyen))
  return (
    <button onClick={() => go(`/etb/${etb.id}`)} className="slab group text-left flex flex-col fadeUp">
      <div className="slab__glare" />
      <div className="slab__stage" style={{ height: 150, padding: 16 }}>
        <BoxArt etb={etb} style={{ maxHeight: 122, height: 122, width: '90%' }} />
        <div className="absolute" style={{ top: 12, right: 12 }}>
          <MovementBadge mv={etb.mv30} isNew={etb.v30 == null} />
        </div>
      </div>
      <div style={{ height: 34, padding: '0 6px', borderTop: '1px solid var(--border)' }}>
        {spark.length >= 2 ? <Sparkline data={spark} up={up} h={34} w={220} fill strokeW={1.6} /> : <div style={{ height: 34 }} />}
      </div>
      <div className="flex flex-col" style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--border)', gap: 6 }}>
        <div>
          <div className="truncate" style={{ fontSize: 14, fontWeight: 580 }}>{etb.nom}</div>
          <EraTag>{etb.type && etb.type !== 'ETB' ? (TYPE_LABEL[etb.type] ?? etb.type) : `${etb.era ?? ''}${etb.annee ? ` · ${etb.annee}` : ''}`}</EraTag>
        </div>
        <div className="flex items-end justify-between mt-1">
          <Price value={etb.prixActuel} size={16} />
          <VarNum v={etb.v30} size={13} />
        </div>
      </div>
    </button>
  )
}

export default function Catalogue() {
  const navigate = useNavigate()
  const go = (p) => navigate(p)
  const [searchParams, setSearchParams] = useSearchParams()

  const [etbs, setEtbs] = useState([])
  const [sparks, setSparks] = useState({})
  const [prixActuels, setPrixActuels] = useState({})
  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [era, setEra] = useState(searchParams.get('ere') ?? 'Toutes')
  const [type, setType] = useState(searchParams.get('type') ?? 'ETB')
  const [tri, setTri] = useState('date')

  useEffect(() => {
    fetchSparklines(30).then(setSparks).catch(() => {})
    fetchPrixActuels().then(setPrixActuels).catch(() => {})
  }, [])

  // Recharge le catalogue quand le type change (filtre serveur — gros volume).
  useEffect(() => {
    fetchProduits(type).then(setEtbs).catch(() => {})
  }, [type])

  useEffect(() => {
    const p = {}
    if (q) p.q = q
    if (era !== 'Toutes') p.ere = era
    if (type !== 'ETB') p.type = type
    setSearchParams(p, { replace: true })
  }, [q, era, type]) // eslint-disable-line react-hooks/exhaustive-deps

  // Enrichit chaque ETB : série, prix actuel, variation 30j, mouvement 30j
  const enrichies = useMemo(() => {
    return etbs.map((e) => {
      const series = sparks[e.id] ?? []
      const mvt = detecterMouvement(series).courtTerme
      const v30 = mvt.niveau === 'indisponible' ? null : mvt.variationPct
      const annee = (e.dateSortie ?? e.date_sortie) ? new Date(e.dateSortie ?? e.date_sortie).getFullYear() : ''
      const prixActuel =
        prixActuels[e.id]?.prixActuel ??
        (series.length ? Number(series[series.length - 1].cmPrixMoyen) : Number(e.prixSortie ?? e.prix_sortie ?? 0))
      return { ...e, annee, series, v30, mv30: mvt, prixActuel }
    })
  }, [etbs, sparks, prixActuels])

  const filtered = useMemo(() => {
    let list = enrichies.slice()
    if (era === 'Autres') list = list.filter((e) => !ERES.includes(e.era))
    else if (era !== 'Toutes') list = list.filter((e) => e.era === era)
    if (q.trim()) {
      const s = q.toLowerCase()
      list = list.filter((e) => e.nom.toLowerCase().includes(s) || e.id.includes(s))
    }
    if (tri === 'date') list.sort((a, b) => new Date(b.dateSortie ?? b.date_sortie ?? 0) - new Date(a.dateSortie ?? a.date_sortie ?? 0))
    else if (tri === 'prix') list.sort((a, b) => (b.prixActuel ?? 0) - (a.prixActuel ?? 0))
    else if (tri === 'var') list.sort((a, b) => (b.v30 ?? -999) - (a.v30 ?? -999))
    else list.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    return list
  }, [enrichies, era, q, tri])

  const grouped = era === 'Toutes' && tri === 'date'
  const groups = useMemo(() => {
    if (!grouped) return null
    const g = ERES.map((er) => ({ era: er, list: filtered.filter((e) => e.era === er) })).filter((x) => x.list.length)
    const autres = filtered.filter((e) => !ERES.includes(e.era))
    if (autres.length) g.push({ era: 'Autres', list: autres })
    return g
  }, [filtered, grouped])

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <section className="mx-auto" style={{ maxWidth: 1180, padding: 'clamp(24px,4vw,44px) clamp(18px,4vw,40px) 0' }}>
        <h1 className="display" style={{ fontSize: 'clamp(26px,3vw,38px)', marginBottom: 6 }}>Catalogue</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
          {etbs.length || '—'} {TYPE_LABEL[type] ?? 'produits'} · prix Cardmarket France
        </p>
      </section>

      {/* filtres sticky */}
      <div style={{ position: 'sticky', top: 57, zIndex: 20, background: 'color-mix(in oklch, var(--bg) 88%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <div className="mx-auto flex flex-col gap-3" style={{ maxWidth: 1180, padding: '14px clamp(18px,4vw,40px)' }}>
          <SearchInput value={q} onChange={setQ} placeholder="Rechercher un produit…" />
          {/* Filtre principal : type de produit */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" style={{ paddingBottom: 2 }}>
            {TYPES.map((t) => <Chip key={t.k} active={type === t.k} onClick={() => { setType(t.k); setEra('Toutes') }}>{t.l}</Chip>)}
          </div>
          {/* Ères + tri */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" style={{ paddingBottom: 2 }}>
            <Chip active={era === 'Toutes'} onClick={() => setEra('Toutes')}>Toutes</Chip>
            {ERES.map((er) => <Chip key={er} active={era === er} onClick={() => setEra(er)}>{er}</Chip>)}
            <Chip active={era === 'Autres'} onClick={() => setEra('Autres')}>Autres</Chip>
            <span style={{ width: 1, height: 18, background: 'var(--border-2)', margin: '0 6px', flexShrink: 0 }} />
            <span className="flex items-center shrink-0" style={{ color: 'var(--faint)' }}>
              <Icon name="sort" size={14} />
            </span>
            {TRIS.map((t) => (
              <button key={t.k} onClick={() => setTri(t.k)} className="chip shrink-0" data-active={tri === t.k} style={{ padding: '6px 12px', fontSize: 12 }}>
                {t.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="mx-auto" style={{ maxWidth: 1180, padding: 'clamp(20px,3vw,32px) clamp(18px,4vw,40px) 60px' }}>
        {etbs.length === 0 ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center" style={{ padding: '80px 0', gap: 12 }}>
            <Icon name="search" size={30} />
            <p style={{ color: 'var(--muted)' }}>Aucune ETB ne correspond.</p>
            <button className="ulink" onClick={() => { setQ(''); setEra('Toutes') }}>Réinitialiser</button>
          </div>
        ) : grouped ? (
          <div className="flex flex-col" style={{ gap: 44 }}>
            {groups.map((g) => (
              <div key={g.era}>
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="display" style={{ fontSize: 19 }}>{g.era}</h2>
                  <span className="font-mono" style={{ fontSize: 12, color: 'var(--faint)' }}>{g.list.length} ETB</span>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
                  {g.list.map((e) => <CatCard key={e.id} etb={e} go={go} />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
            {filtered.map((e) => <CatCard key={e.id} etb={e} go={go} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="slab flex flex-col" style={{ opacity: 0.6 }}>
      <div className="ph" style={{ height: 150 }} />
      <div style={{ height: 34, borderTop: '1px solid var(--border)' }} />
      <div className="flex flex-col" style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--border)', gap: 8 }}>
        <div style={{ height: 12, width: '80%', background: 'var(--surface-2)', borderRadius: 4 }} />
        <div style={{ height: 10, width: '50%', background: 'var(--surface-2)', borderRadius: 4 }} />
      </div>
    </div>
  )
}
