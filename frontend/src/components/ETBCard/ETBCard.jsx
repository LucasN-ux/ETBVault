import { useNavigate } from 'react-router-dom'

export default function ETBCard({ etb }) {
  const navigate = useNavigate()

  const prixFormate = etb.prixSortie || etb.prix_sortie
    ? `${Number(etb.prixSortie ?? etb.prix_sortie).toFixed(2).replace('.', ',')} €`
    : '—'

  const annee = etb.dateSortie || etb.date_sortie
    ? new Date(etb.dateSortie ?? etb.date_sortie).getFullYear()
    : ''

  return (
    <div
      onClick={() => navigate(`/etb/${etb.id}`)}
      className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-pokemon-yellow transition-colors cursor-pointer"
    >
      <div className="bg-gray-700 flex items-center justify-center h-36">
        {etb.imageUrl || etb.image_url ? (
          <img
            src={etb.imageUrl ?? etb.image_url}
            alt={etb.nom}
            className="h-28 object-contain p-2"
          />
        ) : (
          <span className="text-gray-500 text-xs">Image non disponible</span>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-bold text-white text-xs leading-tight mb-1 line-clamp-2">
          {etb.nom}
        </h3>
        <p className="text-gray-500 text-xs mb-2">{annee}</p>

        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs">Sortie</span>
          <span className="text-pokemon-yellow font-semibold text-xs">
            {prixFormate}
          </span>
        </div>
      </div>
    </div>
  )
}
