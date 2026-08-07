// Grille de cartes fantômes pendant le chargement du catalogue : la mise en
// page ne saute pas quand les vraies données arrivent.
export default function GrilleSquelette({ nombre = 12 }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
      {Array.from({ length: nombre }).map((_, i) => (
        <CarteSquelette key={i} />
      ))}
    </div>
  )
}

function CarteSquelette() {
  return (
    <div className="slab flex flex-col" style={{ opacity: 0.6 }}>
      <div className="ph" style={{ height: 150 }} />
      <div style={{ height: 34, borderTop: '1px solid var(--border)' }} />
      <div
        className="flex flex-col"
        style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--border)', gap: 8 }}
      >
        <div style={{ height: 12, width: '80%', background: 'var(--surface-2)', borderRadius: 4 }} />
        <div style={{ height: 10, width: '50%', background: 'var(--surface-2)', borderRadius: 4 }} />
      </div>
    </div>
  )
}
