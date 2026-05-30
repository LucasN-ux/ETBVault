import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function CenterMsg({ children }) {
  return <div style={{ padding: 80, textAlign: 'center', color: 'var(--muted)' }}>{children}</div>
}

// Route accessible uniquement connecté ; sinon redirige vers /connexion.
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <CenterMsg>Chargement…</CenterMsg>
  if (!user) return <Navigate to="/connexion" state={{ from: loc.pathname }} replace />
  return children
}

// Route réservée aux ADMIN ; sinon redirige (connexion ou accueil).
export function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <CenterMsg>Chargement…</CenterMsg>
  if (!user) return <Navigate to="/connexion" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />
  return children
}
