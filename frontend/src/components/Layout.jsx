import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Icon, Mark } from './Icon'

// Shell unifié : barre de nav (sticky, blur) + contenu + footer.
// Le ticker (bande marché) est rendu par la Home elle-même (elle a les données).

const LIENS = [
  { path: '/catalogue', label: 'Catalogue', icon: 'grid' },
  { path: '/vault', label: 'Vault', icon: 'vault' },
]

function RefreshButton() {
  const [state, setState] = useState('idle') // idle | loading | ok | error

  async function handleRefresh() {
    if (state === 'loading') return
    setState('loading')
    try {
      const res = await fetch('/api/admin/refresh', { method: 'POST' })
      if (!res.ok) throw new Error()
      setState('ok')
    } catch {
      setState('error')
    } finally {
      setTimeout(() => setState('idle'), 4000)
    }
  }

  const color =
    state === 'ok' ? 'var(--up)' : state === 'error' ? 'var(--down)' : 'var(--muted)'

  return (
    <button
      onClick={handleRefresh}
      disabled={state === 'loading'}
      title="Mettre à jour les prix"
      className="ml-1 transition-colors"
      style={{ padding: 8, borderRadius: 'var(--radius-sm)', color, background: 'none', border: 0, cursor: state === 'loading' ? 'default' : 'pointer', display: 'flex' }}
    >
      <Icon name="refresh" size={17} className={state === 'loading' ? 'animate-spin' : ''} />
    </button>
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
          <RefreshButton />
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
