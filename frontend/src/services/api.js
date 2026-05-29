const BASE_URL = '/api'

// Récupère tous les ETB triés par date décroissante
export async function fetchETBs() {
  const res = await fetch(`${BASE_URL}/etbs`)
  if (!res.ok) throw new Error('Erreur chargement ETBs')
  return res.json()
}

// Récupère le détail d'une ETB par son id
export async function fetchETB(id) {
  const res = await fetch(`${BASE_URL}/etbs/${id}`)
  if (!res.ok) throw new Error('ETB non trouvée')
  return res.json()
}

// Récupère les cartes d'un set (avec cache auto côté backend)
export async function fetchCartes(etbId) {
  const res = await fetch(`${BASE_URL}/etbs/${etbId}/cartes`)
  if (!res.ok) throw new Error('Cartes non trouvées')
  return res.json()
}

// Récupère l'historique de prix d'une ETB
export async function fetchPrixHistorique(etbId) {
  const res = await fetch(`${BASE_URL}/etbs/${etbId}/prix`)
  if (!res.ok) throw new Error('Prix non trouvés')
  return res.json()
}

// Récupère la détection de mouvement adaptative d'une ETB (court/long terme)
export async function fetchMouvement(etbId) {
  const res = await fetch(`${BASE_URL}/etbs/${etbId}/prix/mouvement`)
  if (!res.ok) throw new Error('Mouvement non disponible')
  return res.json()
}

// Récupère les derniers prix CM pour toutes les ETBs en un appel
// Retourne { etbId: { prixActuel, prixBas, date } }
export async function fetchPrixActuels() {
  const res = await fetch(`${BASE_URL}/prix`)
  if (!res.ok) throw new Error('Prix non disponibles')
  return res.json()
}

// Récupère l'historique de prix pour plusieurs ETBs en parallèle
// Retourne { etbId: [...historique] }
export async function fetchPrixHistoriqueMultiple(ids) {
  const results = await Promise.all(
    ids.map((id) =>
      fetch(`${BASE_URL}/etbs/${id}/prix`)
        .then((r) => r.ok ? r.json() : [])
        .catch(() => [])
    )
  )
  return Object.fromEntries(ids.map((id, i) => [id, results[i]]))
}

// Récupère les ETBs triées par momentum récent (variation sur N jours)
// Retourne [{ etbId, prixActuel, prixPrecedent, variationPct }]
export async function fetchTendances(jours = 7) {
  const res = await fetch(`${BASE_URL}/tendances?jours=${jours}`)
  if (!res.ok) throw new Error('Tendances non disponibles')
  return res.json()
}
