import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVault } from '../hooks/useVault'
import { fetchETBs, fetchPrixActuels } from '../services/api'
import { eur0, pct } from '../utils/format'
import { Icon } from './Icon'
import { BoxArt, KPI } from './ui'

// Bloc « Mon Vault » mis en avant sur la Home — affiché uniquement connecté
// (la Home le monte derrière une garde). S'adapte : coffre rempli = résumé P&L,
// coffre vide = invitation.

const PALETTE = ['var(--accent)', 'var(--up)', 'var(--new)', 'oklch(0.7 0.13 320)', 'oklch(0.75 0.12 60)', 'var(--muted)']

function Section({ children }) {
  return (
    <section className="mx-auto" style={{ maxWidth: 1180, padding: '4px clamp(18px,4vw,40px)', position: 'relative', zIndex: 1 }}>
      {children}
    </section>
  )
}

export default function VaultHomeCard() {
  const navigate = useNavigate()
  const { entries, loading } = useVault()
  const [etbs, setEtbs] = useState([])
  const [prixActuels, setPrixActuels] = useState({})

  useEffect(() => {
    fetchETBs().then(setEtbs).catch(() => {})
    fetchPrixActuels().then(setPrixActuels).catch(() => {})
  }, [])

  const etbMap = useMemo(() => Object.fromEntries(etbs.map((e) => [e.id, e])), [etbs])
  const rows = useMemo(() => entries.map((e) => {
    const etb = etbMap[e.etbId]
    const ref = prixActuels[e.etbId]?.prixActuel ?? Number(etb?.prixSortie ?? etb?.prix_sortie ?? e.prixAchat)
    const invest = e.prixAchat * e.quantite
    const valeur = ref * e.quantite
    return { ...e, etb, valeur, invest, pl: valeur - invest }
  }), [entries, etbMap, prixActuels])

  const totInvest = rows.reduce((s, r) => s + r.invest, 0)
  const totVal = rows.reduce((s, r) => s + r.valeur, 0)
  const pl = totVal - totInvest
  const plPct = totInvest ? (pl / totInvest) * 100 : 0
  const positive = pl >= 0
  const alloc = useMemo(() => [...rows].sort((a, b) => b.valeur - a.valeur), [rows])

  if (loading) return null

  // ── Coffre vide : invitation ──────────────────────────────────────────────
  if (rows.length === 0) {
    return (
      <Section>
        <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ padding: 'clamp(20px,3vw,28px)' }}>
          <div className="flex items-center gap-3.5">
            <div style={{ color: 'var(--accent)' }}><Icon name="vault" size={30} stroke={1.5} /></div>
            <div>
              <h2 className="display" style={{ fontSize: 19 }}>Votre coffre est vide</h2>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 2 }}>Ajoutez vos ETB pour suivre leur valeur et votre plus-value en direct.</p>
            </div>
          </div>
          <button className="btn btn-accent shrink-0" style={{ padding: '11px 18px', fontSize: 14 }} onClick={() => navigate('/vault')}>
            <Icon name="plus" size={16} /> Commencer mon coffre
          </button>
        </div>
      </Section>
    )
  }

  // ── Coffre rempli : résumé P&L ────────────────────────────────────────────
  return (
    <Section>
      <div className="card" style={{ padding: 'clamp(20px,3vw,28px)', borderColor: 'var(--border-2)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Icon name="vault" size={20} style={{ color: 'var(--accent)' }} />
            <h2 className="display" style={{ fontSize: 20 }}>Mon Vault</h2>
            <span className="font-mono" style={{ fontSize: 12, color: 'var(--faint)' }}>{rows.length} position{rows.length > 1 ? 's' : ''}</span>
          </div>
          <button onClick={() => navigate('/vault')} className="ulink inline-flex items-center gap-1.5" style={{ fontSize: 13.5 }}>
            Ouvrir <Icon name="arrowRight" size={15} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <KPI label="Investi" value={eur0(totInvest)} />
          <KPI label="Valeur estimée" value={eur0(totVal)} sub="prix marché CM" />
          <KPI label="Plus-value latente" value={(positive ? '+' : '') + eur0(pl)} sub={pct(plPct)} subColor={positive ? 'var(--up)' : 'var(--down)'} />
        </div>

        {totVal > 0 && (
          <>
            <div className="flex w-full overflow-hidden mt-6" style={{ height: 10, borderRadius: 999, gap: 2 }}>
              {alloc.map((r, i) => (
                <div key={r.id} title={`${r.etb?.nom ?? r.etbId} : ${eur0(r.valeur)}`} style={{ width: `${(r.valeur / totVal) * 100}%`, background: PALETTE[i % PALETTE.length], borderRadius: 3 }} />
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-2.5 mt-5">
              {alloc.slice(0, 3).map((r) => (
                <button key={r.id} onClick={() => r.etb && navigate(`/produit/${r.etbId}`)} className="flex items-center gap-3 text-left transition-colors" style={{ padding: '9px 11px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)' }}>
                  <div className="shrink-0 flex items-center justify-center overflow-hidden" style={{ width: 44, height: 32, borderRadius: 7, background: 'var(--surface-3)' }}>
                    {r.etb ? <BoxArt etb={r.etb} style={{ height: 28, width: 38 }} /> : <span className="font-mono" style={{ fontSize: 8, color: 'var(--faint)' }}>{r.etbId}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate" style={{ fontSize: 12.5, fontWeight: 560 }}>{r.etb?.nom ?? r.etbId}</div>
                    <div className="font-mono" style={{ fontSize: 11.5, fontWeight: 600, color: r.pl >= 0 ? 'var(--up)' : 'var(--down)' }}>
                      {r.pl >= 0 ? '+' : ''}{eur0(r.pl)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Section>
  )
}
