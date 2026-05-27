import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  const liens = [
    { label: 'Catalogue', path: '/catalogue' },
    { label: 'Vault', path: '/vault' },
  ]

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
        </nav>
      </div>
    </header>
  )
}
