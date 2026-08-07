import { useState } from 'react'
import { fetchUsers, adminRefresh } from '../services/api'
import { useRequete } from '../hooks/useRequete'
import { dateFr } from '../utils/format'
import { Icon } from '../components/Icon'
import { EtatErreur } from '../components/ui'

// Panel admin (réservé au rôle ADMIN) — liste des comptes + relance des prix.
export default function Admin() {
  const { donnees, chargement: loading, erreur, recharger } = useRequete(fetchUsers)
  const users = donnees ?? []
  const [refreshState, setRefreshState] = useState('idle') // idle | loading | ok | error

  async function relancerPrix() {
    if (refreshState === 'loading') return
    setRefreshState('loading')
    try {
      await adminRefresh()
      setRefreshState('ok')
    } catch {
      setRefreshState('error')
    } finally {
      setTimeout(() => setRefreshState('idle'), 5000)
    }
  }

  const refreshLabel = { idle: 'Relancer la collecte des prix', loading: 'Mise à jour…', ok: 'Prix mis à jour ✓', error: 'Échec — réessayer' }[refreshState]

  return (
    <div className="mx-auto" style={{ maxWidth: 900, padding: 'clamp(24px,4vw,44px) clamp(18px,4vw,40px) 60px' }}>
      <div className="flex items-center gap-2.5 mb-1.5">
        <Icon name="shield" size={22} style={{ color: 'var(--accent)' }} />
        <h1 className="display" style={{ fontSize: 'clamp(26px,3vw,36px)' }}>Administration</h1>
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 28 }}>Réservé aux administrateurs.</p>

      {/* Actions */}
      <div className="card" style={{ padding: 'clamp(18px,2.5vw,24px)', marginBottom: 18 }}>
        <h2 className="display" style={{ fontSize: 17, marginBottom: 4 }}>Données de prix</h2>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>Relance la collecte Cardmarket (ETB) + TCGdex (cartes).</p>
        <button onClick={relancerPrix} disabled={refreshState === 'loading'} className="btn btn-ghost" style={{ padding: '10px 16px', fontSize: 14 }}>
          <Icon name="refresh" size={16} className={refreshState === 'loading' ? 'animate-spin' : ''} /> {refreshLabel}
        </button>
      </div>

      {/* Comptes */}
      <div className="card" style={{ padding: 8 }}>
        <div className="flex items-baseline justify-between" style={{ padding: '12px 16px 6px' }}>
          <h2 className="display" style={{ fontSize: 17 }}>Comptes</h2>
          <span className="font-mono" style={{ fontSize: 12, color: 'var(--faint)' }}>{users.length}</span>
        </div>
        {erreur ? (
          <div style={{ padding: 8 }}>
            <EtatErreur erreur={erreur} onReessayer={recharger} compact />
          </div>
        ) : loading ? (
          <p style={{ padding: '20px 16px', color: 'var(--muted)', fontSize: 13.5 }}>Chargement…</p>
        ) : (
          <div className="flex flex-col">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3" style={{ padding: '11px 16px', borderTop: '1px solid var(--border)' }}>
                <div className="min-w-0 flex-1 truncate" style={{ fontSize: 14 }}>{u.email}</div>
                <span className="font-mono" style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em', background: u.role === 'ADMIN' ? 'var(--accent-soft)' : 'var(--surface-2)', color: u.role === 'ADMIN' ? 'var(--accent)' : 'var(--muted)' }}>
                  {u.role}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--faint)', width: 90, textAlign: 'right' }}>{dateFr(u.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
