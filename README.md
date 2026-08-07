# ETBVault

Suivi de prix des **Elite Trainer Box (ETB) Pokémon** (marché France) et coffre-fort personnel pour suivre ses plus-values.

**Des constats, jamais de conseil.** Le site affiche l'évolution des prix et détecte les mouvements ; il ne recommande aucun achat ni aucune vente.

## Stack

TypeScript de bout en bout.

- **Backend** — Node, Express, Prisma, PostgreSQL
- **Frontend** — React, Vite, Tailwind
- **Prix** — export officiel du Price Guide Cardmarket, un téléchargement par jour
- **Métadonnées et visuels** — TCGdex

## Démarrer

Deux packages npm indépendants : `npm install` dans `backend/` et dans `frontend/`.

```bash
docker compose up -d                 # PostgreSQL sur le port 5433
cp backend/.env.example backend/.env # puis renseigner DATABASE_URL et JWT_SECRET
npm --prefix backend exec prisma db push
npm --prefix backend run seed
npm --prefix backend run backfill:cmids

npm --prefix backend run dev         # API sur :3001
npm --prefix frontend run dev        # site sur :5173
```

Sans `CM_EMAIL` / `CM_PASSWORD`, le site fonctionne mais aucun prix n'est collecté.

## Branches

- **`dev`** — branche d'intégration : le développement se passe ici.
- **`main`** — ligne de production, taggée en SemVer (`v1.0.0`, `v2.0.0`, …).
