import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [refreshState, setRefreshState] = useState('idle') // idle | loading | ok | error

  const liens = [
    { label: 'Catalogue', path: '/catalogue' },
    { label: 'Vault', path: '/vault' },
  ]

  async function handleRefresh() {
    if (refreshState === 'loading') return
    setRefreshState('loading')
    try {
      const res = await fetch('/api/admin/refresh', { method: 'POST' })
      if (!res.ok) throw new Error()
      setRefreshState('ok')
    } catch {
      setRefreshState('error')
    } finally {
      setTimeout(() => setRefreshState('idle'), 4000)
    }
  }

  return (
    <header className="border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">

        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 group"
        >
          <span className="text-pokemon-yellow font-black text-xl tracking-tight">ETB</span>
          <span className="text-white font-bold text-xl tracking-tight group-hover:text-gray-200 transition-colors">Vault</span>
        </button>

        <nav className="flex items-center gap-1">
          {liens.map((l) => {
            const actif = location.pathname === l.path
            return (
              <button
                key={l.path}
                onClick={() => navigate(l.path)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  actif
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                {l.label}
              </button>
            )
          })}

          {/* Bouton refresh manuel */}
          <button
            onClick={handleRefresh}
            disabled={refreshState === 'loading'}
            title="Mettre à jour les prix"
            className={`ml-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              refreshState === 'loading' ? 'text-gray-600 cursor-not-allowed' :
              refreshState === 'ok'      ? 'text-green-400 bg-green-500/10' :
              refreshState === 'error'   ? 'text-red-400 bg-red-500/10' :
              'text-gray-500 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            {refreshState === 'loading' ? (
              <span className="w-3.5 h-3.5 border border-gray-500 border-t-transparent rounded-full animate-spin inline-block" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span className="text-xs">
              {refreshState === 'loading' ? 'Mise à jour...' :
               refreshState === 'ok'      ? 'Mis à jour' :
               refreshState === 'error'   ? 'Erreur' :
               'Refresh'}
            </span>
          </button>
        </nav>
      </div>
    </header>
  )
}
