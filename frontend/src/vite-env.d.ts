/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base de l'API, jeton d'authentification compris dans les appels.
   *
   * Absente en développement : le proxy Vite renvoie /api vers localhost:3001.
   * En production le front et l'API sont sur deux domaines distincts, il faut
   * donc l'URL complète — par exemple https://etbvault-api.onrender.com/api
   */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
