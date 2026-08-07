import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface GardeProps {
  children: ReactNode
}

function Message({ children }: GardeProps) {
  return <div style={{ padding: 80, textAlign: 'center', color: 'var(--muted)' }}>{children}</div>
}

// Route accessible uniquement connecté ; sinon redirige vers /connexion en
// mémorisant d'où l'on vient.
export function ProtectedRoute({ children }: GardeProps) {
  const { user, loading } = useAuth()
  const emplacement = useLocation()
  if (loading) return <Message>Chargement…</Message>
  if (!user) return <Navigate to="/connexion" state={{ from: emplacement.pathname }} replace />
  return children
}

// Route réservée aux ADMIN. Un visiteur non connecté va vers /connexion, un
// utilisateur connecté sans le rôle revient à l'accueil.
export function AdminRoute({ children }: GardeProps) {
  const { user, loading } = useAuth()
  if (loading) return <Message>Chargement…</Message>
  if (!user) return <Navigate to="/connexion" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />
  return children
}
