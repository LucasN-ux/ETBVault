import { Icon } from '../Icon'

// Contrôles de filtre et de navigation.

/** Sélecteur exclusif — périodes, modes de graphe, tris. */
export function Segmented({ options, value, onChange, size = 'sm' }) {
  const md = size === 'md'
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.value}
          data-active={value === o.value}
          onClick={() => onChange(o.value)}
          style={{ fontSize: md ? 13 : 11.5, padding: md ? '7px 13px' : '5px 10px' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <span
        style={{
          position: 'absolute',
          left: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--muted)',
          display: 'flex',
        }}
      >
        <Icon name="search" size={17} />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field"
        style={{ padding: '11px 14px 11px 42px' }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Effacer"
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 0,
            color: 'var(--muted)',
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  )
}

export function Chip({ active, onClick, children }) {
  return (
    <button className="chip" data-active={active} onClick={onClick} style={{ padding: '6px 13px', fontSize: 12.5 }}>
      {children}
    </button>
  )
}
