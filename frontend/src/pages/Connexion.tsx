import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Icon, Mark } from '../components/Icon'

// Page Connexion / Inscription (bascule par onglet).
export default function Connexion() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // D'où l'utilisateur venait avant d'être redirigé ici (cf. ProtectedRoute).
  const origine = (location.state as { from?: string } | null)?.from ?? '/vault'

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setBusy(true)
    try {
      if (mode === 'register') await register(email, motDePasse)
      else await login(email, motDePasse)
      navigate(origine, { replace: true })
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 420, padding: 'clamp(32px,6vw,72px) clamp(18px,4vw,40px)' }}>
      <div className="flex flex-col items-center text-center" style={{ marginBottom: 28 }}>
        <Mark size={40} />
        <h1 className="display" style={{ fontSize: 26, marginTop: 14 }}>
          {mode === 'register' ? 'Créer un compte' : 'Connexion'}
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6 }}>
          {mode === 'register' ? 'Pour suivre votre coffre sur tous vos appareils.' : 'Accédez à votre coffre-fort.'}
        </p>
      </div>

      <div className="seg" style={{ width: '100%', marginBottom: 18 }}>
        <button data-active={mode === 'login'} onClick={() => { setMode('login'); setErreur(null) }} style={{ flex: 1, padding: '8px', fontSize: 13 }}>Connexion</button>
        <button data-active={mode === 'register'} onClick={() => { setMode('register'); setErreur(null) }} style={{ flex: 1, padding: '8px', fontSize: 13 }}>Inscription</button>
      </div>

      <form onSubmit={submit} className="card" style={{ padding: 'clamp(20px,3vw,26px)' }}>
        <div className="flex flex-col" style={{ gap: 14 }}>
          <label className="flex flex-col gap-1.5">
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr" className="field" autoComplete="email" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Mot de passe</span>
            <input type="password" required minLength={mode === 'register' ? 8 : undefined} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} placeholder={mode === 'register' ? '8 caractères minimum' : '••••••••'} className="field" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
          </label>

          {erreur && (
            <p style={{ fontSize: 12.5, color: 'var(--down)', background: 'var(--down-soft)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>{erreur}</p>
          )}

          <button type="submit" disabled={busy} className="btn btn-accent w-full justify-center" style={{ padding: '12px', fontSize: 14.5, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Patientez…' : mode === 'register' ? 'Créer mon compte' : 'Se connecter'}
            {!busy && <Icon name="arrowRight" size={16} />}
          </button>
        </div>
      </form>
    </div>
  )
}
