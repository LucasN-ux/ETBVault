// Coffre anonyme : stockage local (utilisé tant que l'utilisateur n'est pas connecté).
// À la connexion, ces positions sont fusionnées vers le compte (cf. AuthContext).
const KEY = 'etbvault_vault'

export function lireVaultLocal() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function ecrireVaultLocal(entries) {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function viderVaultLocal() {
  localStorage.removeItem(KEY)
}
