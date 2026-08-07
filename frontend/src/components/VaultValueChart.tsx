import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { eur0, dateFr } from '../utils/format'
import type { PointValeur } from '../utils/valeurHistorique'

interface VaultValueChartProps {
  data: readonly PointValeur[] | null | undefined
  height?: number
}

// Courbe de valeur du coffre dans le temps (aire) + repère « investi ».
// data : [{ date, valeur, investi }]
export default function VaultValueChart({ data, height = 220 }: VaultValueChartProps) {
  if (!data || data.length < 2) return null
  const investi = data[data.length - 1]!.investi
  const valeurs = data.map((d) => d.valeur)
  const min = Math.min(...valeurs, investi)
  const max = Math.max(...valeurs, investi)
  const pad = Math.max((max - min) * 0.12, max * 0.04, 1)

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gradVault" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis domain={[min - pad, max + pad]} hide />
          <ReferenceLine y={investi} stroke="var(--muted)" strokeDasharray="4 4" strokeWidth={1} />
          <Tooltip
            contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: 'var(--muted)' }}
            formatter={(v, n) => [eur0(v), n === 'valeur' ? 'Valeur' : 'Investi']}
            labelFormatter={(d) => dateFr(String(d))}
          />
          <Area type="monotone" dataKey="valeur" stroke="var(--accent)" strokeWidth={2} fill="url(#gradVault)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
