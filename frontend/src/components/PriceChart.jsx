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
import { lttb } from '../utils/lttb'
import { compresserParSeuil, detecterTrous, insererTrous } from '../utils/compresser'
import { detecterMouvement, seuilAffichage } from '../utils/mouvement'

const PERIODES = [
  { key: '7J',  label: '7 jours', jours: 7 },
  { key: '1M',  label: '1 mois',  jours: 30 },
  { key: '3M',  label: '3 mois',  jours: 90 },
  { key: '1A',  label: '1 an',    jours: 365 },
  { key: 'MAX', label: 'Tout',    jours: null },
]

// Cible de points affichés : au-delà, on réduit via LTTB en préservant la forme
const CIBLE_POINTS = 250
// Amplitude verticale minimale (en % du prix médian) : le plat doit RESTER plat,
// sinon l'axe auto zoome sur du bruit et dramatise un mouvement insignifiant.
const AMPLITUDE_MIN = 0.08
// Au-delà de ce nb de jours sans collecte, on considère un trou de données
const TROU_JOURS = 10

function formatLabel(dateStr, periode) {
  const d = new Date(dateStr)
  if (periode === '7J' || periode === '1M')
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

function CustomTooltip({ active, payload, periode }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d || d.cmPrixMoyen == null) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm shadow-xl">
      <p className="text-gray-400 text-xs mb-1.5">{formatLabel(d.date, periode)}</p>
      <p className="text-pokemon-yellow font-bold">
        {Number(d.cmPrixMoyen).toFixed(2).replace('.', ',')} €
      </p>
      {d.cmPrixBas != null && (
        <p className="text-gray-500 text-xs mt-0.5">
          Bas : {Number(d.cmPrixBas).toFixed(2).replace('.', ',')} €
        </p>
      )}
      {d.origine === 'import_cm' && (
        <p className="text-gray-600 text-[10px] mt-1">historique importé</p>
      )}
    </div>
  )
}

export default function PriceChart({ historique, prixSortie, compact = false }) {
  const [periode, setPeriode] = useState('3M')

  // Série complète triée + date de la dernière donnée connue (pour ancrer la fenêtre)
  const { sorted, derniereDate, seuil } = useMemo(() => {
    const s = [...(historique ?? [])]
      .filter((h) => h.cmPrixMoyen != null)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
    // Seuil de mouvement adapté à la volatilité PROPRE de l'ETB (même langage que l'indicateur)
    const vol = detecterMouvement(historique ?? []).volatilite
    return {
      sorted: s,
      derniereDate: s.length > 0 ? new Date(s.at(-1).date) : null,
      seuil: seuilAffichage(vol),
    }
  }, [historique])

  // points = vrais points affichés (pour stats/domaine) ; chartData = avec trous (nulls) pour la courbe
  const { points, chartData } = useMemo(() => {
    if (sorted.length === 0) return { points: [], chartData: [] }

    const cfg = PERIODES.find((p) => p.key === periode)
    let fenetre = sorted
    if (cfg && cfg.jours !== null && derniereDate) {
      // Ancrage sur la DERNIÈRE donnée connue, pas sur aujourd'hui (données possiblement périmées)
      const cutoff = new Date(derniereDate)
      cutoff.setDate(cutoff.getDate() - cfg.jours)
      fenetre = sorted.filter((h) => new Date(h.date) >= cutoff)
      if (fenetre.length === 0) fenetre = sorted.slice(-1)
    }

    // 1) Compression par seuil adaptatif : la courbe ne « bouge » que sur un vrai mouvement
    let pts = compresserParSeuil(fenetre, seuil)
    // 2) LTTB en filet de sécurité si encore trop de points
    if (pts.length > CIBLE_POINTS) pts = lttb(pts, CIBLE_POINTS)
    // 3) Casser la ligne sur les vrais trous de collecte (≠ historique importé épars)
    const trous = detecterTrous(fenetre, TROU_JOURS)
    return { points: pts, chartData: insererTrous(pts, trous) }
  }, [sorted, derniereDate, seuil, periode])

  const prixActuel  = points.length > 0 ? Number(points.at(-1)?.cmPrixMoyen ?? 0) : 0
  const prixDebut   = points.length >= 2 ? Number(points[0]?.cmPrixMoyen ?? 0) : 0
  const variation   = prixDebut > 0 ? ((prixActuel - prixDebut) / prixDebut) * 100 : null
  const plusHaut    = points.length > 0 ? Math.max(...points.map((h) => Number(h.cmPrixMoyen ?? 0))) : 0

  // Domaine Y : amplitude minimale pour que le plat reste plat + padding
  const domaineY = useMemo(() => {
    const prix = points.map((p) => Number(p.cmPrixMoyen)).filter(Number.isFinite)
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
  }, [points])

  // Fraîcheur : données périmées si la dernière collecte date de plus de 2 jours
  const joursDepuis = derniereDate ? Math.floor((Date.now() - derniereDate.getTime()) / 86_400_000) : null
  const perime = joursDepuis != null && joursDepuis > 2

  const chartHeight = compact ? 160 : 220
  // Affiche les points seulement quand ils sont peu nombreux (sinon courbe lisible)
  const afficherDots = points.length <= 60

  if (!historique || historique.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-gray-500 text-sm">
        Aucune donnée de prix disponible.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Stats + toggle période */}
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
          {perime && (
            <span className="text-amber-500/70 self-center text-[10px]" title="Dernière collecte de prix">
              données au {formatLabel(derniereDate, periode)}
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
        {points.length === 0 ? (
          <div className="flex items-center justify-center text-gray-500 text-xs" style={{ height: chartHeight }}>
            Aucune donnée pour cette période.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData} margin={{ top: 4, right: compact ? 8 : 12, left: -20, bottom: 0 }}>
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
                tick={{ fill: '#6B7280', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}€`}
                domain={domaineY}
                width={50}
              />
              <Tooltip content={<CustomTooltip periode={periode} />} />

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

              {/* Courbe prix — monotone : adoucit sans inventer de points ni masquer un saut.
                  connectNulls=false → la ligne se casse sur les vrais trous de collecte. */}
              <Line
                type="monotone"
                dataKey="cmPrixMoyen"
                stroke="#FFCB05"
                strokeWidth={2}
                dot={afficherDots ? { r: 3, fill: '#FFCB05', strokeWidth: 0 } : false}
                activeDot={{ r: 5, fill: '#FFCB05', strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
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
            Prix Cardmarket
          </span>
          {prixSortie > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <span className="inline-block w-4 h-0.5 border-t border-dashed border-red-900" />
              Prix sortie
            </span>
          )}
        </div>
      )}
    </div>
  )
}
