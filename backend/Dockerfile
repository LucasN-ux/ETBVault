# Image Node standard. Le service partait auparavant de l'image Playwright
# (~2 Go) parce que la collecte des prix lançait Chromium pour se connecter à
# Cardmarket. Les exports Cardmarket étant publics, un simple fetch suffit :
# plus de navigateur, plus d'identifiants, et une image assez légère pour
# tenir dans les 512 Mo d'un plan gratuit.
FROM node:22-bookworm-slim AS build

# Prisma a besoin d'OpenSSL pour son moteur de requêtes.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Couche de dépendances séparée : reconstruite seulement si les manifestes
# changent, pas à chaque modification du code.
COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# Les dépendances de développement ne servent plus une fois compilé.
RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 3001

# Le schéma est appliqué au démarrage : Render ne fournit pas d'étape de
# release distincte sur les plans de base. `migrate deploy` est idempotent et
# ne touche pas aux données.
#
# `exec` remplace le shell par le processus Node : sans lui, le SIGTERM envoyé
# à l'arrêt du conteneur s'arrêterait au shell et l'application ne serait
# jamais prévenue.
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/server.js"]
