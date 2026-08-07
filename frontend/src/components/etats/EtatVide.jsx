import { Icon } from '../Icon'

// Requête réussie, mais rien à montrer. À distinguer d'une erreur : ici tout
// fonctionne, il n'y a simplement pas de donnée.
export default function EtatVide({ titre, detail, icone = 'search', action, compact = false }) {
  return (
    <div
      className="flex flex-col items-center text-center"
      style={{ padding: compact ? '24px 16px' : 'clamp(32px,5vw,56px)', gap: 9 }}
    >
      <Icon name={icone} size={compact ? 20 : 26} style={{ color: 'var(--faint)' }} />
      <div style={{ fontSize: compact ? 14 : 15.5, fontWeight: 560 }}>{titre}</div>
      {detail && <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 420 }}>{detail}</div>}
      {action}
    </div>
  )
}
