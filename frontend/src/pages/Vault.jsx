import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVault } from '../hooks/useVault'
import { OBJET_VIDE, TABLEAU_VIDE } from '../utils/vides'
import { useAuth } from '../hooks/useAuth'
import { fetchEtbs, fetchPrixActuels, fetchPrixHistoriqueMultiple } from '../services/api'
import { eur, eur0, pct } from '../utils/format'
import { valeurHistorique } from '../utils/valeurHistorique'
import { partagerCoffre } from '../utils/imagePartage'
import { Icon } from '../components/Icon'
import { BoxArt, KPI } from '../components/ui'
import { useRequete } from '../hooks/useRequete'
import VaultValueChart from '../components/VaultValueChart'

const PALETTE = ['var(--accent)', 'var(--up)', 'var(--new)', 'oklch(0.7 0.13 320)', 'oklch(0.75 0.12 60)', 'var(--muted)']

export default function Vault() {
  const navigate = useNavigate()
  const go = (p) => navigate(p)
  const { user } = useAuth()
  const { entries, addEntry, removeEntry } = useVault()
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState({ etbId: '', prixAchat: '', quantite: 1 })
  const [partageEtat, setPartageEtat] = useState('idle') // idle | partagé | téléchargée

  const catalogue = useRequete(fetchEtbs)
  const prix = useRequete(fetchPrixActuels)

  const etbs = catalogue.donnees ?? TABLEAU_VIDE
  const prixActuels = prix.donnees ?? OBJET_VIDE

  // Historique de prix des ETB détenues → courbe de valeur du coffre.
  const idsDetenus = useMemo(() => [...new Set(entries.map((e) => e.etbId))], [entries])
  const historiques = useRequete(
    () => fetchPrixHistoriqueMultiple(idsDetenus),
    idsDetenus.join(','),
    { actif: idsDetenus.length > 0 },
  )

  const hist = useMemo(() => {
    const parEtb = {}
    for (const [id, points] of Object.entries(historiques.donnees ?? OBJET_VIDE)) {
      parEtb[id] = (points ?? []).map((p) => ({
        date: String(p.date).slice(0, 10),
        cmPrixMoyen: p.cmPrixMoyen,
      }))
    }
    return parEtb
  }, [historiques.donnees])

  const serie = useMemo(
    () => valeurHistorique(
      entries.map((e) => ({ etbId: e.etbId, prixAchat: Number(e.prixAchat), quantite: e.quantite || 1, dateAchat: String(e.dateAchat).slice(0, 10) })),
      hist,
    ),
    [entries, hist],
  )

  const etbMap = useMemo(() => Object.fromEntries(etbs.map((e) => [e.id, e])), [etbs])

  const rows = useMemo(() => entries.map((e) => {
    const etb = etbMap[e.etbId]
    const ref = prixActuels[e.etbId]?.prixActuel ?? Number(etb?.prixSortie ?? etb?.prix_sortie ?? e.prixAchat)
    const invest = e.prixAchat * e.quantite
    const valeur = ref * e.quantite
    return { ...e, etb, ref, invest, valeur, pl: valeur - invest, pct: e.prixAchat ? ((ref - e.prixAchat) / e.prixAchat) * 100 : 0 }
  }), [entries, etbMap, prixActuels])

  const totInvest = rows.reduce((s, r) => s + r.invest, 0)
  const totVal = rows.reduce((s, r) => s + r.valeur, 0)
  const pl = totVal - totInvest
  const plPct = totInvest ? (pl / totInvest) * 100 : 0
  const positive = pl >= 0
  const alloc = useMemo(() => [...rows].sort((a, b) => b.valeur - a.valeur), [rows])

  function add(e) {
    e.preventDefault()
    if (!draft.etbId || !draft.prixAchat) return
    addEntry(draft)
    setDraft({ etbId: '', prixAchat: '', quantite: 1 })
    setFormOpen(false)
  }

  async function partager() {
    const r = await partagerCoffre({ valeur: totVal, plPct, positive, serie })
    if (r === 'telechargement') { setPartageEtat('téléchargée'); setTimeout(() => setPartageEtat('idle'), 4000) }
  }

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <section className="mx-auto" style={{ maxWidth: 1000, padding: 'clamp(24px,4vw,44px) clamp(18px,4vw,40px) 0' }}>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <Icon name="vault" size={22} style={{ color: 'var(--accent)' }} />
              <h1 className="display" style={{ fontSize: 'clamp(26px,3vw,36px)' }}>Mon Vault</h1>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>
              {entries.length} position{entries.length > 1 ? 's' : ''} · {user ? 'synchronisé sur ton compte' : 'stockage local'} · valeurs au prix marché Cardmarket
            </p>
          </div>
          <button className="btn btn-accent" style={{ padding: '12px 20px', fontSize: 14.5 }} onClick={() => setFormOpen((v) => !v)}>
            <Icon name="plus" size={17} /> Ajouter une position
          </button>
        </div>
      </section>

      <section className="mx-auto flex flex-col" style={{ maxWidth: 1000, padding: '0 clamp(18px,4vw,40px) 60px', gap: 18 }}>
        {/* Coffre local (déconnecté) : incite à créer un compte */}
        {!user && (
          <div className="card flex flex-wrap items-center justify-between gap-3" style={{ padding: '12px 16px', borderColor: 'var(--border-2)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>💾 Coffre enregistré <strong>sur cet appareil</strong> — crée un compte pour le sauvegarder et le retrouver partout.</span>
            <button className="btn btn-accent shrink-0" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => go('/connexion')}>Créer un compte</button>
          </div>
        )}
        {/* P&L */}
        <div className="card" style={{ padding: 'clamp(20px,3vw,30px)' }}>
          {rows.length > 0 && (
            <div className="flex justify-end mb-2">
              <button onClick={partager} className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }} title="Partager une image de ton coffre (valeur et % uniquement)">
                <Icon name="external" size={15} /> {partageEtat === 'téléchargée' ? 'Image téléchargée ✓' : 'Partager'}
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <KPI label="Investi" value={eur0(totInvest)} />
            <KPI label="Valeur estimée" value={eur0(totVal)} sub="prix marché CM" />
            <KPI label="Plus-value latente" value={(positive ? '+' : '') + eur0(pl)} sub={pct(plPct)} subColor={positive ? 'var(--up)' : 'var(--down)'} />
          </div>
          {serie.length >= 2 && (
            <div className="mt-6">
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Valeur du coffre dans le temps</div>
              <VaultValueChart data={serie} height={220} />
            </div>
          )}
          {rows.length > 0 && totVal > 0 && (
            <div className="mt-6">
              <div className="flex w-full overflow-hidden" style={{ height: 10, borderRadius: 999, gap: 2 }}>
                {alloc.map((r, i) => (
                  <div key={r.id} title={`${r.etb?.nomFr ?? r.etb?.nom}: ${eur0(r.valeur)}`} style={{ width: `${(r.valeur / totVal) * 100}%`, background: PALETTE[i % PALETTE.length], borderRadius: 3 }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
                {alloc.slice(0, 5).map((r, i) => (
                  <span key={r.id} className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: PALETTE[i % PALETTE.length] }} />
                    {r.etb?.nomFr ?? r.etb?.nom ?? r.etbId} <span className="font-mono" style={{ color: 'var(--faint)' }}>{Math.round((r.valeur / totVal) * 100)}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* formulaire */}
        {formOpen && (
          <form onSubmit={add} className="card pop" style={{ padding: 'clamp(18px,2.5vw,24px)' }}>
            <div className="grid gap-4">
              <label className="flex flex-col gap-1.5">
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>ETB</span>
                <select value={draft.etbId} onChange={(e) => setDraft({ ...draft, etbId: e.target.value })} required className="field" style={{ appearance: 'none' }}>
                  <option value="" disabled>Choisir une ETB…</option>
                  {etbs.map((e) => <option key={e.id} value={e.id}>{e.nomFr ?? e.nom} — {e.era}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Prix d’achat (€)</span>
                  <input type="number" step="0.01" min="0" required value={draft.prixAchat} placeholder="54,99" onChange={(e) => setDraft({ ...draft, prixAchat: e.target.value })} className="field font-mono" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Quantité</span>
                  <input type="number" min="1" value={draft.quantite} onChange={(e) => setDraft({ ...draft, quantite: e.target.value })} className="field font-mono" />
                </label>
              </div>
              <div className="flex gap-2.5">
                <button type="submit" className="btn btn-accent" style={{ padding: '11px 20px', fontSize: 14 }}>Ajouter au Vault</button>
                <button type="button" className="btn btn-quiet" style={{ padding: '11px 18px', fontSize: 14 }} onClick={() => setFormOpen(false)}>Annuler</button>
              </div>
            </div>
          </form>
        )}

        {/* positions */}
        {rows.length === 0 ? (
          <div className="card flex flex-col items-center justify-center text-center" style={{ padding: '64px 20px', gap: 12 }}>
            <div style={{ color: 'var(--accent)' }}><Icon name="vault" size={36} stroke={1.4} /></div>
            <p style={{ fontWeight: 580, fontSize: 16 }}>Votre Vault est vide</p>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, maxWidth: 320 }}>Ajoutez les ETB que vous possédez pour suivre leur valeur et votre plus-value latente.</p>
            <button className="btn btn-accent mt-1" style={{ padding: '11px 20px', fontSize: 14 }} onClick={() => setFormOpen(true)}>
              <Icon name="plus" size={16} /> Ajouter ma première ETB
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 8 }}>
            {rows.map((r, i) => (
              <div key={r.id} className="group flex items-center gap-3.5" style={{ padding: '12px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <button onClick={() => r.etb && go(`/etb/${r.etb.id}`)} className="shrink-0 surface-2 flex items-center justify-center overflow-hidden" style={{ width: 58, height: 44, borderRadius: 9 }}>
                  {r.etb ? <BoxArt etb={r.etb} style={{ height: 38, width: 50 }} /> : <span className="font-mono" style={{ fontSize: 9, color: 'var(--faint)' }}>{r.etbId}</span>}
                </button>
                <div className="min-w-0 flex-1">
                  <button className="text-left truncate block w-full" style={{ fontSize: 14, fontWeight: 560 }} onClick={() => r.etb && go(`/etb/${r.etbId}`)}>{r.etb?.nomFr ?? r.etb?.nom ?? r.etbId}</button>
                  <div className="font-mono" style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 2 }}>
                    {r.quantite > 1 ? `${r.quantite} × ` : ''}{eur(r.prixAchat)} · {r.dateAchat}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono" style={{ fontSize: 14, fontWeight: 600 }}>{eur(r.valeur)}</div>
                  <div className="font-mono" style={{ fontSize: 12, fontWeight: 600, color: r.pl >= 0 ? 'var(--up)' : 'var(--down)' }}>
                    {r.pl >= 0 ? '+' : ''}{eur0(r.pl)} · {pct(r.pct)}
                  </div>
                </div>
                <button onClick={() => removeEntry(r.id)} title="Retirer" className="shrink-0" style={{ color: 'var(--faint)', opacity: 0.5, padding: 6, background: 'none', border: 0, cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--down)'; e.currentTarget.style.opacity = 1 }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--faint)'; e.currentTarget.style.opacity = 0.5 }}>
                  <Icon name="trash" size={17} />
                </button>
              </div>
            ))}
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--faint)' }}>
          Données stockées localement sur votre appareil · valeurs au prix tendance Cardmarket · faits, pas conseils.
        </p>
      </section>
    </div>
  )
}
