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

const PERIODES = [
  { key: '7J', label: '7J' },
  { key: '7M', label: '7M' },
]

const SEUIL_PCT = 2

// Multiples par rapport au prix de sortie à marquer sur le graphique
const MILESTONES = [
  { mult: 1.5, label: '×1,5', color: '#f59e0b' },
  { mult: 2,   label: '×2',   color: '#f97316' },
  { mult: 3,   label: '×3',   color: '#ef4444' },
]

// Ne garde que les points où le prix a bougé d'au moins SEUIL_PCT depuis le dernier point retenu.
// Premier et dernier point toujours inclus.
function filtrerChangements(historique, seuilPct) {
  if (historique.length <= 1) return historique
  const result = [historique[0]]
  let dernierPrix = Number(historique[0].cmPrixMoyen)
  for (let i = 1; i < historique.length - 1; i++) {
    const prix = Number(historique[i].cmPrixMoyen)
    if (!prix) continue
    if (Math.abs((prix - dernierPrix) / dernierPrix * 100) >= seuilPct) {
      result.push(historique[i])
      dernierPrix = prix
    }
  }
  result.push(historique[historique.length - 1])
  return result
}

function formatLabel(dateStr, periode) {
  const d = new Date(dateStr)
  if (periode === '7J') return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

function CustomTooltip({ active, payload, periode }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm shadow-xl">
      <p className="text-gray-400 text-xs mb-1.5">{formatLabel(d.date, periode)}</p>
      <p className="text-pokemon-yellow font-bold">
        {Number(d.cmPrixMoyen).toFixed(2).replace('.', ',')} €
      </p>
      {d.cmPrixBas && (
        <p className="text-gray-500 text-xs mt-0.5">
          Bas : {Number(d.cmPrixBas).toFixed(2).replace('.', ',')} €
        </p>
      )}
      {d.cmNbAnnonces != null && (
        <p className="text-gray-500 text-xs mt-1 border-t border-gray-800 pt-1">
          Stock : {d.cmNbAnnonces} annonces
        </p>
      )}
    </div>
  )
}

export default function PriceChart({ historique, prixSortie, compact = false }) {
  const [periode, setPeriode] = useState('7J')

  const donnees = useMemo(() => {
    if (!historique || historique.length === 0) return []
    const now = new Date()
    let filtered
    if (periode === '7J') {
      const cutoff = new Date(now)
      cutoff.setDate(cutoff.getDate() - 7)
      filtered = historique.filter((h) => new Date(h.date) >= cutoff)
    } else {
      const cutoff = new Date(now)
      cutoff.setMonth(cutoff.getMonth() - 7)
      filtered = historique.filter((h) => new Date(h.date) >= cutoff)
    }
    if (filtered.length === 0) return []
    return filtrerChangements(filtered, SEUIL_PCT)
  }, [historique, periode])

  const prixActuel = donnees.length > 0 ? Number(donnees[donnees.length - 1]?.cmPrixMoyen ?? 0) : 0
  const prixPrecedent = donnees.length >= 2 ? Number(donnees[donnees.length - 2]?.cmPrixMoyen ?? 0) : 0
  const variation = prixPrecedent > 0 ? ((prixActuel - prixPrecedent) / prixPrecedent) * 100 : null
  const plusHaut = donnees.length > 0 ? Math.max(...donnees.map((h) => Number(h.cmPrixMoyen ?? 0))) : 0

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
      {/* Toggle + stats */}
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
            <span className="text-gray-500 self-center hidden sm:inline">
              Max : {plusHaut.toFixed(0)} €
            </span>
          )}
        </div>

        <div className="flex bg-gray-800 rounded-lg p-0.5 gap-0.5">
          {PERIODES.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriode(p.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                periode === p.key
                  ? 'bg-pokemon-yellow text-gray-900'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Graphique */}
      <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-3">
        {donnees.length === 0 ? (
          <div className="flex items-center justify-center text-gray-500 text-xs" style={{ height: chartHeight }}>
            Aucune donnée pour cette période.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={donnees} margin={{ top: 4, right: compact ? 8 : 36, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => formatLabel(v, periode)}
                tick={{ fill: '#6B7280', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="prix"
                tick={{ fill: '#6B7280', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}€`}
                domain={['auto', 'auto']}
                width={50}
              />
              <YAxis
                yAxisId="annonces"
                orientation="right"
                tick={{ fill: '#374151', fontSize: 8 }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
                width={compact ? 0 : 28}
                hide={compact}
              />
              <Tooltip content={<CustomTooltip periode={periode} />} />

              {/* Ligne de prix de sortie officiel */}
              {prixSortie > 0 && (
                <ReferenceLine
                  yAxisId="prix"
                  y={prixSortie}
                  stroke="#CC0000"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  label={compact ? undefined : { value: 'Sortie', position: 'insideTopLeft', fill: '#CC0000', fontSize: 8 }}
                />
              )}

              {/* Milestones ×1,5 / ×2 / ×3 */}
              {prixSortie > 0 && MILESTONES.map((m) => (
                <ReferenceLine
                  key={m.mult}
                  yAxisId="prix"
                  y={prixSortie * m.mult}
                  stroke={m.color}
                  strokeDasharray="3 3"
                  strokeWidth={compact ? 0.5 : 1}
                  label={compact ? undefined : { value: m.label, position: 'insideTopLeft', fill: m.color, fontSize: 8 }}
                />
              ))}

              {/* Overlay stock (nb annonces CM) — axe droit */}
              <Line
                yAxisId="annonces"
                type="monotone"
                dataKey="cmNbAnnonces"
                stroke="#374151"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                activeDot={false}
                connectNulls={false}
              />

              {/* Ligne de prix — changements significatifs uniquement */}
              <Line
                yAxisId="prix"
                type="monotone"
                dataKey="cmPrixMoyen"
                stroke="#FFCB05"
                strokeWidth={2}
                dot={{ r: 3, fill: '#FFCB05', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#FFCB05', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Légende */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-4 px-1">
          <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <span className="inline-block w-4 h-0.5 bg-pokemon-yellow rounded" />
            Prix (variation ≥ {SEUIL_PCT}%)
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <span className="inline-block w-4 h-0.5 bg-gray-600 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg,#4B5563 0,#4B5563 4px,transparent 4px,transparent 6px)', backgroundColor: 'transparent' }} />
            Stock CM
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <span className="inline-block w-4 h-0.5 border-t border-dashed border-red-900" />
            Prix sortie
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <span className="inline-block w-4 h-0.5 border-t border-dashed border-amber-600" />
            ×1,5 / ×2 / ×3
          </span>
        </div>
      )}
    </div>
  )
}
