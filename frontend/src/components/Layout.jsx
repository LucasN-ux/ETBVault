import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon, Mark } from './Icon'
import { useAuth } from '../context/AuthContext'

// Shell unifié : barre de nav (sticky, blur) + contenu + footer.
// Le ticker (bande marché) est rendu par la Home elle-même (elle a les données).

const LIENS = [
  { path: '/catalogue', label: 'Catalogue', icon: 'grid' },
  { path: '/vault', label: 'Vault', icon: 'vault' },
]

// Zone compte : Connexion si déconnecté ; sinon lien Admin (si admin) + Déconnexion.
function AccountNav() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (loading) return null

  if (!user) {
    return (
      <NavLink to="/connexion" className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 14 }}>
        <Icon name="home" size={16} /> <span className="hidden sm:inline">Connexion</span>
      </NavLink>
    )
  }

  return (
    <div className="flex items-center" style={{ gap: 4 }}>
      {user.role === 'ADMIN' && (
        <NavLink
          to="/admin"
          className="flex items-center gap-2 transition-colors"
          style={{
            padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 540,
            color: pathname === '/admin' ? 'var(--text)' : 'var(--muted)',
            background: pathname === '/admin' ? 'var(--surface-2)' : 'transparent',
          }}
        >
          <Icon name="shield" size={17} /> <span className="hidden sm:inline">Admin</span>
        </NavLink>
      )}
      <span className="hidden md:inline truncate" style={{ fontSize: 12.5, color: 'var(--faint)', maxWidth: 150, marginLeft: 6 }}>{user.email}</span>
      <button
        onClick={() => { logout(); navigate('/') }}
        title="Se déconnecter"
        className="ml-1 transition-colors"
        style={{ padding: 8, borderRadius: 'var(--radius-sm)', color: 'var(--muted)', background: 'none', border: 0, cursor: 'pointer', display: 'flex' }}
      >
        <Icon name="external" size={17} />
      </button>
    </div>
  )
}

function Nav() {
  const { pathname } = useLocation()
  const isActive = (p) => pathname === p || (p === '/catalogue' && pathname.startsWith('/etb'))

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'color-mix(in oklch, var(--bg) 86%, transparent)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="mx-auto flex items-center justify-between" style={{ maxWidth: 1180, padding: '12px clamp(16px,4vw,40px)' }}>
        <Link to="/" className="flex items-center gap-2.5">
          <Mark size={26} />
          <span className="display" style={{ fontSize: 19, letterSpacing: '-0.03em' }}>
            etb<span style={{ color: 'var(--accent)' }}>Vault</span>
          </span>
        </Link>
        <nav className="flex items-center" style={{ gap: 4 }}>
          {LIENS.map((it) => (
            <NavLink
              key={it.path}
              to={it.path}
              className="flex items-center gap-2 transition-colors"
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontWeight: 540,
                color: isActive(it.path) ? 'var(--text)' : 'var(--muted)',
                background: isActive(it.path) ? 'var(--surface-2)' : 'transparent',
              }}
            >
              <Icon name={it.icon} size={17} />
              <span className="hidden sm:inline">{it.label}</span>
            </NavLink>
          ))}
          <span style={{ width: 1, height: 20, background: 'var(--border-2)', margin: '0 6px' }} />
          <AccountNav />
        </nav>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', marginTop: 20, position: 'relative', zIndex: 1 }}>
      <div className="mx-auto flex flex-wrap items-center justify-between gap-4" style={{ maxWidth: 1180, padding: '26px clamp(18px,4vw,40px)' }}>
        <div className="flex items-center gap-2.5">
          <Mark size={22} />
          <span className="display" style={{ fontSize: 15 }}>
            etb<span style={{ color: 'var(--accent)' }}>Vault</span>
          </span>
          <span style={{ fontSize: 12, color: 'var(--faint)', marginLeft: 8 }}>Des faits, pas des conseils.</span>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--faint)' }}>Données : Cardmarket &amp; TCGdex · marché français</p>
      </div>
    </footer>
  )
}

export default function Layout() {
  return (
    <div className="etbv-root" data-theme="vault" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
