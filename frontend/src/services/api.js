const BASE_URL = '/api'

// ── Token JWT (localStorage) ────────────────────────────────────────────────
const TOKEN_KEY = 'etbvault_token'
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

// Wrapper fetch : JSON + en-tête Authorization optionnel + erreurs typées (err.status)
async function apiFetch(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const t = getToken()
    if (t) headers.Authorization = `Bearer ${t}`
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.error || 'Erreur serveur')
    err.status = res.status
    throw err
  }
  return data
}

// Récupère tous les ETB triés par date décroissante
export async function fetchETBs() {
  const res = await fetch(`${BASE_URL}/etbs`)
  if (!res.ok) throw new Error('Erreur chargement ETBs')
  return res.json()
}

// Récupère les produits scellés, filtrables par type (ETB, DISPLAY, BOOSTER…)
export async function fetchProduits(type) {
  const q = type && type !== 'Tous' ? `?type=${encodeURIComponent(type)}` : ''
  const res = await fetch(`${BASE_URL}/produits${q}`)
  if (!res.ok) throw new Error('Erreur chargement produits')
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

// Récupère un mini-historique de prix pour TOUTES les ETBs en un appel
// (pour les sparklines du catalogue / home). Retourne { etbId: [{ date, cmPrixMoyen }] }
export async function fetchSparklines(jours = 30) {
  const res = await fetch(`${BASE_URL}/sparklines?jours=${jours}`)
  if (!res.ok) throw new Error('Sparklines non disponibles')
  return res.json()
}

// ── Auth ────────────────────────────────────────────────────────────────────
export function register(email, motDePasse) {
  return apiFetch('/auth/register', { method: 'POST', body: { email, motDePasse } })
}
export function login(email, motDePasse) {
  return apiFetch('/auth/login', { method: 'POST', body: { email, motDePasse } })
}
export function fetchMe() {
  return apiFetch('/auth/me', { auth: true })
}

// ── Vault (compte requis) ────────────────────────────────────────────────────
export function fetchVault() {
  return apiFetch('/vault', { auth: true })
}
export function addVaultEntry(entry) {
  return apiFetch('/vault', { method: 'POST', body: entry, auth: true })
}
export function removeVaultEntry(id) {
  return apiFetch(`/vault/${id}`, { method: 'DELETE', auth: true })
}

// ── Admin (rôle ADMIN requis) ────────────────────────────────────────────────
export function fetchUsers() {
  return apiFetch('/admin/users', { auth: true })
}
export function adminRefresh() {
  return apiFetch('/admin/refresh', { method: 'POST', auth: true })
}
