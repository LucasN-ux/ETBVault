// Spécification OpenAPI 3 de l'API ETBVault — servie via Swagger UI sur /api/docs.
// Tenue à la main (volontairement) pour rester lisible et pédagogique.

const bearer = [{ bearerAuth: [] }]

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ETBVault API',
    version: '1.0.0',
    description:
      'API du suivi de prix et du coffre-fort des Elite Trainer Box Pokémon.\n\n' +
      'Auth : JWT (Bearer). Récupère un token via `/api/auth/login`, puis clique sur **Authorize** (en haut) pour appeler les routes protégées.',
  },
  servers: [{ url: 'http://localhost:3001', description: 'Développement local' }],
  tags: [
    { name: 'Auth', description: 'Inscription, connexion, profil' },
    { name: 'Vault', description: 'Coffre-fort personnel (compte requis)' },
    { name: 'Admin', description: 'Administration (rôle ADMIN requis)' },
    { name: 'ETB', description: 'Catalogue et prix des ETB' },
    { name: 'Système', description: 'Santé & introspection' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Erreur: {
        type: 'object',
        properties: { error: { type: 'string', example: 'Identifiants incorrects' } },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmpsk6qnb0000gp1pj6qdufdz' },
          email: { type: 'string', format: 'email', example: 'user1@etbvault.local' },
          role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      Identifiants: {
        type: 'object',
        required: ['email', 'motDePasse'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user1@etbvault.local' },
          motDePasse: { type: 'string', format: 'password', example: 'User1234!' },
        },
      },
      VaultEntry: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          etbId: { type: 'string', example: 'me04' },
          prixAchat: { type: 'number', example: 59.99 },
          quantite: { type: 'integer', example: 2 },
          dateAchat: { type: 'string', format: 'date', example: '2026-05-30' },
        },
      },
      NouvelleEntree: {
        type: 'object',
        required: ['etbId', 'prixAchat'],
        properties: {
          etbId: { type: 'string', example: 'me04' },
          prixAchat: { type: 'number', example: 59.99 },
          quantite: { type: 'integer', default: 1, example: 2 },
          dateAchat: { type: 'string', format: 'date', example: '2026-05-30' },
        },
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Créer un compte',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Identifiants' } } } },
        responses: {
          201: { description: 'Compte créé', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: { description: 'Email invalide ou mot de passe trop court', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erreur' } } } },
          409: { description: 'Email déjà utilisé', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erreur' } } } },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Se connecter',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Identifiants' } } } },
        responses: {
          200: { description: 'Connecté', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Identifiants incorrects', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erreur' } } } },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Profil de l’utilisateur connecté',
        security: bearer,
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
          401: { description: 'Non authentifié' },
        },
      },
    },
    '/api/vault': {
      get: {
        tags: ['Vault'],
        summary: 'Lister mes positions',
        security: bearer,
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/VaultEntry' } } } } },
          401: { description: 'Non authentifié' },
        },
      },
      post: {
        tags: ['Vault'],
        summary: 'Ajouter une position',
        security: bearer,
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/NouvelleEntree' } } } },
        responses: {
          201: { description: 'Créée', content: { 'application/json': { schema: { $ref: '#/components/schemas/VaultEntry' } } } },
          400: { description: 'Champs invalides' },
          401: { description: 'Non authentifié' },
          404: { description: 'ETB inconnue' },
        },
      },
    },
    '/api/vault/{id}': {
      delete: {
        tags: ['Vault'],
        summary: 'Retirer une position',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Supprimée' },
          401: { description: 'Non authentifié' },
          404: { description: 'Position introuvable' },
        },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'Lister les comptes',
        security: bearer,
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } },
          401: { description: 'Non authentifié' },
          403: { description: 'Réservé à l’admin' },
        },
      },
    },
    '/api/admin/refresh': {
      post: {
        tags: ['Admin'],
        summary: 'Relancer la collecte des prix (CM + TCGdex)',
        security: bearer,
        responses: {
          200: { description: 'Mise à jour effectuée' },
          401: { description: 'Non authentifié' },
          403: { description: 'Réservé à l’admin' },
        },
      },
    },
    '/api/etbs': {
      get: { tags: ['ETB'], summary: 'Catalogue de toutes les ETB', responses: { 200: { description: 'Liste des ETB' } } },
    },
    '/api/etbs/{id}': {
      get: {
        tags: ['ETB'], summary: 'Détail d’une ETB',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'me04' }],
        responses: { 200: { description: 'ETB' }, 404: { description: 'Introuvable' } },
      },
    },
    '/api/etbs/{id}/cartes': {
      get: {
        tags: ['ETB'], summary: 'Cartes du set',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'me04' }],
        responses: { 200: { description: 'Liste des cartes' } },
      },
    },
    '/api/etbs/{id}/prix': {
      get: {
        tags: ['ETB'], summary: 'Historique de prix d’une ETB',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'me04' }],
        responses: { 200: { description: 'Historique' } },
      },
    },
    '/api/etbs/{id}/prix/mouvement': {
      get: {
        tags: ['ETB'], summary: 'Détection de mouvement (court/long terme)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'me04' }],
        responses: { 200: { description: 'Mouvement' } },
      },
    },
    '/api/prix': {
      get: { tags: ['ETB'], summary: 'Derniers prix CM de toutes les ETB (1 appel)', responses: { 200: { description: 'Map { etbId: { prixActuel } }' } } },
    },
    '/api/tendances': {
      get: {
        tags: ['ETB'], summary: 'ETB triées par momentum récent',
        parameters: [{ name: 'jours', in: 'query', schema: { type: 'integer', default: 7 } }],
        responses: { 200: { description: 'Tendances' } },
      },
    },
    '/api/sparklines': {
      get: {
        tags: ['ETB'], summary: 'Mini-historiques pour toutes les ETB',
        parameters: [{ name: 'jours', in: 'query', schema: { type: 'integer', default: 30 } }],
        responses: { 200: { description: 'Map { etbId: [...] }' } },
      },
    },
    '/health': {
      get: { tags: ['Système'], summary: 'Santé du serveur', responses: { 200: { description: 'ok' } } },
    },
    '/api/routes': {
      get: { tags: ['Système'], summary: 'Liste brute des routes (JSON)', responses: { 200: { description: 'Routes' } } },
    },
  },
} as const
