import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchETBs, fetchTendances, fetchSparklines } from '../services/api'
import { detecterMouvement } from '../utils/mouvement'
import { eur0 } from '../utils/format'
import { Icon } from '../components/Icon'
import Sparkline from '../components/Sparkline'
import { BoxArt, MovementBadge, Price, VarNum, Segmented, Ticker, KPI, EraTag } from '../components/ui'

const PERIODES = [
  { value: 7, label: '7 j' },
  { value: 30, label: '30 j' },
  { value: 90, label: '3 mois' },
]

function prixSeries(series, n) {
  return (series ?? []).slice(-n).map((p) => Number(p.cmPrixMoyen))
}

function HeroSlab({ etb, periode, go }) {
  const mv = useMemo(() => detecterMouvement(etb.series).courtTerme, [etb.series])
  const up = (etb.variationPct ?? 0) >= 0
  const spark = prixSeries(etb.series, 30)
  return (
    <button onClick={() => go(`/etb/${etb.id}`)} className="slab group w-full text-left fadeUp" style={{ animationDelay: '0.1s' }}>
      <div className="slab__glare" />
      <div className="flex items-stretch">
        <div className="slab__stage shrink-0" style={{ width: '46%', minHeight: 220, padding: 22 }}>
          <BoxArt etb={etb} className="w-full" style={{ maxHeight: 190, height: 190 }} />
        </div>
        <div className="flex-1 flex flex-col justify-between" style={{ padding: '22px 22px 20px', borderLeft: '1px solid var(--border)' }}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="mv mv-flat" style={{ padding: '4px 10px', fontSize: 10.5, letterSpacing: '0.06em' }}>
                <Icon name="trend" size={12} stroke={2} /> PLUS FORTE HAUSSE · {periode === 7 ? '7 J' : periode === 30 ? '30 J' : '3 MOIS'}
              </span>
              <EraTag>{etb.era}</EraTag>
            </div>
            <h3 className="display" style={{ fontSize: 'clamp(22px, 2.4vw, 30px)', marginBottom: 4 }}>{etb.nom}</h3>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Coffret Dresseur d’Élite · {etb.annee}</div>
          </div>
          <div style={{ height: 54, margin: '14px 0' }}>
            {spark.length >= 2 ? <Sparkline data={spark} up={up} h={54} w={300} strokeW={2} /> : <div style={{ height: 54 }} />}
          </div>
          <div className="flex items-end justify-between">
            <div>
              <Price value={etb.prixActuel} size={28} />
              <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 3 }}>prix marché Cardmarket</div>
            </div>
            <MovementBadge mv={mv} showPct size="md" isNew={etb.variationPct == null} />
          </div>
        </div>
      </div>
    </button>
  )
}

function TrendRow({ etb, rang, periode, go }) {
  const up = (etb.variationPct ?? 0) >= 0
  const spark = prixSeries(etb.series, 14)
  return (
    <button
      onClick={() => go(`/etb/${etb.id}`)}
      className="group w-full text-left flex items-center gap-4 transition-colors"
      style={{ padding: '13px 16px', borderRadius: 'var(--radius-sm)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span className="font-mono tnum" style={{ width: 22, fontSize: 13, color: 'var(--faint)' }}>{String(rang).padStart(2, '0')}</span>
      <div className="shrink-0 surface-2 flex items-center justify-center overflow-hidden" style={{ width: 52, height: 40, borderRadius: 8 }}>
        <BoxArt etb={etb} style={{ height: 34, width: 46 }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate" style={{ fontSize: 14, fontWeight: 560 }}>{etb.nom}</div>
        <EraTag>{etb.era}</EraTag>
      </div>
      <div className="hidden sm:block shrink-0" style={{ width: 90, height: 30 }}>
        {spark.length >= 2 ? <Sparkline data={spark} up={up} h={30} w={90} fill={false} strokeW={1.6} /> : <div style={{ height: 30 }} />}
      </div>
      <div className="text-right shrink-0" style={{ width: 92 }}>
        <Price value={etb.prixActuel} size={14.5} accent={false} />
      </div>
      <div className="text-right shrink-0" style={{ width: 72 }}>
        <VarNum v={etb.variationPct} size={13.5} />
      </div>
    </button>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const go = (p) => navigate(p)
  const [etbs, setEtbs] = useState([])
  const [periode, setPeriode] = useState(7)
  const [tendances, setTendances] = useState([])
  const [sparks, setSparks] = useState({})

  useEffect(() => {
    fetchETBs().then(setEtbs).catch(() => {})
    fetchSparklines(90).then(setSparks).catch(() => {})
  }, [])

  useEffect(() => {
    fetchTendances(periode).then(setTendances).catch(() => {})
  }, [periode])

  const etbMap = useMemo(() => Object.fromEntries(etbs.map((e) => [e.id, e])), [etbs])

  const ranked = useMemo(() => {
    return tendances
      .map((t) => {
        const etb = etbMap[t.etbId]
        if (!etb) return null
        const annee = (etb.dateSortie ?? etb.date_sortie) ? new Date(etb.dateSortie ?? etb.date_sortie).getFullYear() : ''
        return { ...etb, annee, prixActuel: t.prixActuel, variationPct: t.variationPct, series: sparks[t.etbId] ?? [] }
      })
      .filter(Boolean)
  }, [tendances, etbMap, sparks])

  const mover = ranked[0]
  const list = ranked.slice(1, 9)
  const totalVal = useMemo(() => ranked.reduce((s, e) => s + (e.prixActuel || 0), 0), [ranked])

  // Bande ticker : top tendances 7j
  const tickerItems = useMemo(
    () => ranked.slice(0, 14).map((e) => ({ id: e.id, nom: e.nom, prixActuel: e.prixActuel, v7: e.variationPct })),
    [ranked]
  )

  return (
    <>
      {tickerItems.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--border)', padding: '9px 0', position: 'relative', zIndex: 1, background: 'var(--bg-2)' }}>
          <Ticker items={tickerItems} />
        </div>
      )}

      <div className="hero-glow" style={{ position: 'relative', zIndex: 1 }}>
        {/* ── HERO ── */}
        <section className="mx-auto" style={{ maxWidth: 1180, padding: 'clamp(28px,5vw,64px) clamp(18px,4vw,40px) 8px' }}>
          <div className="lg:grid lg:gap-12 lg:items-center" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="fadeUp">
              <div className="inline-flex items-center gap-2 mb-6" style={{ padding: '6px 13px', borderRadius: 999, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <span className="dot" style={{ background: 'var(--accent)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 540 }}>Marché Pokémon TCG · France</span>
              </div>
              <h1 className="display" style={{ fontSize: 'clamp(34px, 5.6vw, 60px)', lineHeight: 0.98, marginBottom: 20 }}>
                Le coffre-fort des<br />
                <span style={{ color: 'var(--accent)' }}>ETB Pokémon.</span>
              </h1>
              <p style={{ fontSize: 'clamp(15px,1.5vw,18px)', color: 'var(--text-2)', lineHeight: 1.55, maxWidth: 460, marginBottom: 28 }}>
                L’historique de prix de chaque Elite Trainer Box et un coffre pour suivre vos plus-values.
                <span style={{ color: 'var(--text)', fontWeight: 560 }}> Des faits, pas des conseils.</span>
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="btn btn-accent" style={{ padding: '13px 22px', fontSize: 15 }} onClick={() => go('/catalogue')}>
                  Explorer les {etbs.length || ''} ETB <Icon name="arrowRight" size={17} />
                </button>
                <button className="btn btn-ghost" style={{ padding: '13px 22px', fontSize: 15 }} onClick={() => go('/vault')}>
                  <Icon name="vault" size={17} /> Mon Vault
                </button>
              </div>
            </div>
            <div className="mt-10 lg:mt-0">
              {mover && <HeroSlab etb={mover} periode={periode} go={go} />}
            </div>
          </div>
        </section>

        {/* ── TENDANCES ── */}
        <section className="mx-auto" style={{ maxWidth: 1180, padding: 'clamp(28px,4vw,52px) clamp(18px,4vw,40px)' }}>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="display" style={{ fontSize: 'clamp(22px,2.4vw,28px)', marginBottom: 4 }}>Tendances du marché</h2>
              <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>Classées par évolution récente · source Cardmarket</p>
            </div>
            <Segmented value={periode} onChange={setPeriode} size="md" options={PERIODES} />
          </div>

          <div className="card" style={{ padding: 8 }}>
            <div className="hidden sm:flex items-center gap-4" style={{ padding: '8px 16px', color: 'var(--faint)', fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              <span style={{ width: 22 }}>#</span>
              <span style={{ width: 52 }} />
              <span className="flex-1">Coffret</span>
              <span style={{ width: 90 }}>14 j</span>
              <span className="text-right" style={{ width: 92 }}>Prix</span>
              <span className="text-right" style={{ width: 72 }}>{periode === 7 ? '7 j' : periode === 30 ? '30 j' : '3 mois'}</span>
            </div>
            <div className="hr" style={{ margin: '4px 0' }} />
            <div className="flex flex-col">
              {ranked.length === 0
                ? <p style={{ padding: '28px 16px', color: 'var(--muted)', fontSize: 14 }}>Chargement des tendances…</p>
                : [mover, ...list].filter(Boolean).map((e, i) => <TrendRow key={e.id} etb={e} rang={i + 1} periode={periode} go={go} />)}
            </div>
          </div>
          <button onClick={() => go('/catalogue')} className="ulink mt-5 inline-flex items-center gap-1.5" style={{ fontSize: 14 }}>
            Voir tout le catalogue <Icon name="arrowRight" size={15} />
          </button>
        </section>

        {/* ── KPI ── */}
        <section className="mx-auto" style={{ maxWidth: 1180, padding: '8px clamp(18px,4vw,40px) clamp(36px,5vw,64px)' }}>
          <div className="card grid grid-cols-2 md:grid-cols-4" style={{ padding: 'clamp(20px,3vw,30px)', gap: 'clamp(20px,3vw,30px)' }}>
            <KPI label="ETB suivies" value={etbs.length || '—'} />
            <KPI label="Ères couvertes" value="6" />
            <KPI label="Valeur marché cumulée" value={totalVal > 0 ? eur0(totalVal) : '—'} />
            <KPI label="Depuis" value="2011" />
          </div>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--faint)', marginTop: 24 }}>
            etbVault constate l’évolution des prix — il ne donne jamais de conseil d’achat ou de vente.
          </p>
        </section>
      </div>
    </>
  )
}
