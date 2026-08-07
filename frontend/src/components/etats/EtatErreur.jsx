import { Icon } from '../Icon'

// Affiché quand une requête a échoué. Le site disait « Chargement… » pour
// toujours ; il dit maintenant ce qui s'est passé et propose de réessayer.
export default function EtatErreur({ erreur, onReessayer, compact = false }) {
  const reseau = erreur?.estReseau
  const titre = reseau ? 'Serveur injoignable' : 'Données indisponibles'
  const detail = reseau
    ? "L'API ne répond pas. Vérifie que le serveur backend est démarré."
    : (erreur?.message ?? 'Une erreur est survenue.')

  return (
    <div
      className="card flex flex-col items-center text-center"
      style={{
        padding: compact ? '20px 16px' : 'clamp(28px,4vw,44px)',
        gap: 10,
        borderColor: 'var(--border-2)',
      }}
      role="alert"
    >
      <Icon name="alert" size={compact ? 20 : 26} style={{ color: 'var(--down)' }} />
      <div style={{ fontSize: compact ? 14 : 16, fontWeight: 580 }}>{titre}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 420 }}>{detail}</div>
      {onReessayer && (
        <button className="btn" style={{ padding: '8px 16px', fontSize: 13, marginTop: 4 }} onClick={onReessayer}>
          Réessayer
        </button>
      )}
    </div>
  )
}
