import { useId, useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { serieJours, serieMois } from '../utils/serieGraphe'
import { Segmented, Price, VarNum } from './ui'

// Couleurs concrètes (les attributs SVG ne résolvent pas var(--…))
const GOLD = '#e3b341' // ≈ oklch(0.82 0.135 80)
const RED = '#e0654f' // ≈ oklch(0.66 0.20 25), repère « prix de sortie »
const GRID = 'rgba(255,255,255,0.07)'
const AXIS = '#8a8378'

// Amplitude verticale minimale (en % du prix médian) : le plat doit RESTER plat.
const AMPLITUDE_MIN = 0.08

const MODES = [
  { value: 'jours', label: 'Jours' }, // 7 derniers jours, 1 point/jour
  { value: 'mois', label: 'Mois' },   // jusqu'à 12 mois, 1 point/mois (médiane)
]
const SOURCES = [
  { key: 'cm', label: 'Cardmarket', dispo: true },
  { key: 'ebay', label: 'eBay', dispo: false }, // V2
]

function formatJour(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
function formatMois(ym) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', boxShadow: 'var(--shadow)', whiteSpace: 'nowrap' }}>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 2 }}>{d.label}</div>
      <div className="font-mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>
        {Number(d.prix).toFixed(2).replace('.', ',')} €
      </div>
      {d.n != null && <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 2 }}>médiane de {d.n} relevé{d.n > 1 ? 's' : ''}</div>}
    </div>
  )
}

export default function PriceChart({ historique, prixSortie, height = 230 }) {
  const gid = useId().replace(/:/g, '')
  const [mode, setMode] = useState('jours')
  const [source, setSource] = useState('cm')

  const data = useMemo(() => {
    if (source !== 'cm') return []
    return mode === 'jours'
      ? serieJours(historique, 7).map((p) => ({ x: p.date, label: formatJour(p.date), prix: p.prix }))
      : serieMois(historique, 12).map((p) => ({ x: p.mois, label: formatMois(p.mois), prix: p.prix, n: p.n }))
  }, [historique, mode, source])

  const prixActuel = data.length > 0 ? data[data.length - 1].prix : 0
  const prixDebut = data.length >= 2 ? data[0].prix : 0
  const variation = prixDebut > 0 ? ((prixActuel - prixDebut) / prixDebut) * 100 : null

  const domaineY = useMemo(() => {
    const prix = data.map((d) => d.prix).filter(Number.isFinite)
    if (prix.length === 0) return ['auto', 'auto']
    let lo = Math.min(...prix)
    let hi = Math.max(...prix)
    const mid = (lo + hi) / 2 || prix[0]
    const minSpan = mid * AMPLITUDE_MIN
    if (hi - lo < minSpan) { lo = mid - minSpan / 2; hi = mid + minSpan / 2 }
    if (prixSortie > 0) { lo = Math.min(lo, prixSortie); hi = Math.max(hi, prixSortie) }
    const pad = (hi - lo) * 0.12
    return [Math.max(0, Math.floor(lo - pad)), Math.ceil(hi + pad)]
  }, [data, prixSortie])

  if (!historique || historique.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height, color: 'var(--muted)', fontSize: 13 }}>
        Aucune donnée de prix disponible.
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      {/* en-tête : prix + variation | bascule Jours/Mois */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <Price value={prixActuel} size={18} />
          {variation !== null && <VarNum v={variation} size={13.5} />}
        </div>
        <Segmented value={mode} onChange={setMode} options={MODES} />
      </div>

      {/* graphe */}
      {data.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height, color: 'var(--faint)', fontSize: 12.5 }}>
          {source === 'ebay'
            ? 'Source eBay bientôt disponible.'
            : mode === 'mois'
              ? 'Pas encore assez d’historique mensuel — ça se remplit avec le temps.'
              : 'Aucune donnée pour cette période.'}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.22} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: AXIS, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}€`} domain={domaineY} width={48} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1 }} />
            {prixSortie > 0 && (
              <ReferenceLine y={prixSortie} stroke={RED} strokeDasharray="4 4" strokeWidth={1} ifOverflow="extendDomain"
                label={{ value: 'sortie', position: 'insideTopLeft', fill: RED, fontSize: 9.5 }} />
            )}
            <Area type="monotone" dataKey="prix" stroke={GOLD} strokeWidth={2.2} fill={`url(#${gid})`}
              dot={false} activeDot={{ r: 4.5, fill: GOLD, stroke: 'var(--bg)', strokeWidth: 2 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* sélecteur de source + repère sortie */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2" style={{ fontSize: 11, color: 'var(--faint)' }}>
          <span style={{ width: 16, borderTop: `1px dashed ${RED}` }} /> prix de sortie · source Cardmarket
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 10.5, color: 'var(--faint)' }}>Source</span>
          <div className="seg">
            {SOURCES.map((s) => (
              <button key={s.key} data-active={source === s.key} disabled={!s.dispo}
                onClick={() => s.dispo && setSource(s.key)}
                title={s.dispo ? undefined : 'Bientôt disponible'}
                style={{ fontSize: 11.5, padding: '5px 10px', cursor: s.dispo ? 'pointer' : 'not-allowed', opacity: s.dispo ? 1 : 0.5 }}>
                {s.label}{!s.dispo && ' · bientôt'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
