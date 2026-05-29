import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { serieJours, serieMois } from '../utils/serieGraphe'

// Amplitude verticale minimale (en % du prix médian) : le plat doit RESTER plat,
// sinon l'axe auto zoome sur du bruit et dramatise un mouvement insignifiant.
const AMPLITUDE_MIN = 0.08

const MODES = [
  { key: 'jours', label: 'Jours' }, // 7 derniers jours, 1 point/jour
  { key: 'mois', label: 'Mois' },   // jusqu'à 12 mois, 1 point/mois (médiane)
]
const SOURCES = [
  { key: 'cm', label: 'Cardmarket', dispo: true },
  { key: 'ebay', label: 'eBay', dispo: false }, // à venir (V2)
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
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm shadow-xl">
      <p className="text-gray-400 text-xs mb-1.5">{d.label}</p>
      <p className="text-pokemon-yellow font-bold">{Number(d.prix).toFixed(2).replace('.', ',')} €</p>
      {d.n != null && (
        <p className="text-gray-600 text-[10px] mt-1">médiane de {d.n} relevé{d.n > 1 ? 's' : ''}</p>
      )}
    </div>
  )
}

export default function PriceChart({ historique, prixSortie, compact = false }) {
  const [mode, setMode] = useState('jours')  // 'jours' | 'mois'
  const [source, setSource] = useState('cm') // 'cm' | 'ebay'

  const data = useMemo(() => {
    if (source !== 'cm') return [] // eBay pas encore branché
    return mode === 'jours'
      ? serieJours(historique, 7).map((p) => ({ x: p.date, label: formatJour(p.date), prix: p.prix }))
      : serieMois(historique, 12).map((p) => ({ x: p.mois, label: formatMois(p.mois), prix: p.prix, n: p.n }))
  }, [historique, mode, source])

  const prixActuel = data.length > 0 ? data[data.length - 1].prix : 0
  const prixDebut = data.length >= 2 ? data[0].prix : 0
  const variation = prixDebut > 0 ? ((prixActuel - prixDebut) / prixDebut) * 100 : null
  const plusHaut = data.length > 0 ? Math.max(...data.map((d) => d.prix)) : 0

  // Domaine Y : amplitude minimale pour que le plat reste plat + padding
  const domaineY = useMemo(() => {
    const prix = data.map((d) => d.prix).filter(Number.isFinite)
    if (prix.length === 0) return ['auto', 'auto']
    let lo = Math.min(...prix)
    let hi = Math.max(...prix)
    const mid = (lo + hi) / 2 || prix[0]
    const minSpan = mid * AMPLITUDE_MIN
    if (hi - lo < minSpan) {
      lo = mid - minSpan / 2
      hi = mid + minSpan / 2
    }
    const pad = (hi - lo) * 0.1
    return [Math.max(0, Math.floor(lo - pad)), Math.ceil(hi + pad)]
  }, [data])

  const chartHeight = compact ? 160 : 220

  if (!historique || historique.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-gray-500 text-sm">
        Aucune donnée de prix disponible.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Stats + toggle Jours / Mois */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-3 text-xs">
          <span className="text-pokemon-yellow font-bold text-sm">
            {prixActuel > 0 ? `${prixActuel.toFixed(2).replace('.', ',')} €` : '—'}
          </span>
          {variation !== null && (
            <span className={`font-semibold self-center ${variation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {variation >= 0 ? '+' : ''}{variation.toFixed(1)}%
            </span>
          )}
          {plusHaut > 0 && (
            <span className="text-gray-500 self-center hidden sm:inline">Max : {plusHaut.toFixed(0)} €</span>
          )}
        </div>

        <div className="flex bg-gray-800 rounded-lg p-0.5 gap-0.5">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === m.key ? 'bg-pokemon-yellow text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Graphique */}
      <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-3">
        {data.length === 0 ? (
          <div className="flex items-center justify-center text-gray-500 text-xs" style={{ height: chartHeight }}>
            {source === 'ebay'
              ? 'Source eBay bientôt disponible.'
              : mode === 'mois'
                ? 'Pas encore assez d’historique mensuel — ça se remplit avec le temps.'
                : 'Aucune donnée pour cette période.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={data} margin={{ top: 4, right: compact ? 8 : 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6B7280', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}€`}
                domain={domaineY}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Repère factuel : prix de sortie officiel */}
              {prixSortie > 0 && (
                <ReferenceLine
                  y={prixSortie}
                  stroke="#CC0000"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  label={compact ? undefined : { value: 'Sortie', position: 'insideTopLeft', fill: '#CC0000', fontSize: 8 }}
                />
              )}

              <Line
                type="monotone"
                dataKey="prix"
                stroke="#FFCB05"
                strokeWidth={2}
                dot={{ r: 3, fill: '#FFCB05', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#FFCB05', strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Sélecteur de source (CM maintenant, eBay à venir) */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] text-gray-600">Source :</span>
        <div className="flex bg-gray-800 rounded-lg p-0.5 gap-0.5">
          {SOURCES.map((s) => (
            <button
              key={s.key}
              disabled={!s.dispo}
              onClick={() => s.dispo && setSource(s.key)}
              title={s.dispo ? undefined : 'Bientôt disponible'}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                source === s.key
                  ? 'bg-pokemon-yellow text-gray-900'
                  : s.dispo
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              {s.label}{!s.dispo && ' · bientôt'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
