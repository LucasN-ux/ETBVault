import type { CSSProperties } from 'react'
import type { Etb } from '../../types/domaine'
import { hueFromId } from '../../utils/format'

interface BoxArtProps {
  /** Accepte une ETB partielle : les écrans passent parfois une ligne enrichie. */
  etb: Pick<Etb, 'id' | 'nom' | 'nomFr' | 'imageUrl'> | null | undefined
  className?: string
  style?: CSSProperties
}

interface PlaceholderProps {
  id: string
  nom: string
  className?: string
  style?: CSSProperties
}

// Visuel d'une ETB : le logo de set TCGdex, ou un placeholder teinté.
//
// C'est la seule source d'image du projet. Le circuit des photos de boîtes
// détourées à la main a été retiré — provenance intraçable, quatre fichiers
// pour tout le catalogue.
export default function BoxArt({ etb, className = '', style }: BoxArtProps) {
  const image = etb?.imageUrl
  if (image) {
    return (
      <img
        src={image}
        alt={etb?.nomFr ?? etb?.nom ?? ''}
        className={'zoomable ' + className}
        style={{ objectFit: 'contain', ...style }}
        loading="lazy"
      />
    )
  }
  return (
    <PlaceholderBox
      id={etb?.id ?? ''}
      nom={etb?.nomFr ?? etb?.nom ?? etb?.id ?? ''}
      className={className}
      style={style}
    />
  )
}

// Teinte dérivée de l'identifiant : deux ETB différentes ne se ressemblent pas,
// et la même ETB garde sa couleur d'un écran à l'autre.
function PlaceholderBox({ id, nom, className, style }: PlaceholderProps) {
  const teinte = hueFromId(id)
  return (
    <div
      className={'zoomable ' + className}
      style={{
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
        background: `linear-gradient(150deg, oklch(0.32 0.08 ${teinte}), oklch(0.20 0.05 ${teinte}))`,
        boxShadow: '0 8px 22px -12px oklch(0 0 0 / 0.8)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '10% 9%',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span
          className="font-mono"
          style={{ fontSize: 9, letterSpacing: '0.1em', color: 'oklch(1 0 0 / 0.7)', textTransform: 'uppercase' }}
        >
          Pokémon
        </span>
        <span style={{ width: 14, height: 14, borderRadius: 999, border: '2px solid oklch(1 0 0 / 0.55)' }} />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.5,
          backgroundImage:
            'repeating-linear-gradient(60deg, oklch(1 0 0 / 0.05) 0 2px, transparent 2px 9px)',
        }}
      />
      <div style={{ position: 'relative' }}>
        <div
          className="display"
          style={{
            fontSize: 'clamp(13px, 3.5cqw, 20px)',
            color: '#fff',
            lineHeight: 1,
            fontWeight: 700,
            textShadow: '0 1px 8px oklch(0 0 0 / 0.5)',
          }}
        >
          {nom}
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: 8.5,
            letterSpacing: '0.12em',
            color: 'oklch(1 0 0 / 0.75)',
            marginTop: 4,
            textTransform: 'uppercase',
          }}
        >
          Coffret Dresseur d’Élite
        </div>
      </div>
    </div>
  )
}
