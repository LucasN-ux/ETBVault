# Image officielle Playwright : elle embarque Chromium et toutes ses
# dépendances système. C'est la raison d'être de ce Dockerfile — la collecte
# des prix ouvre un navigateur pour télécharger le Price Guide Cardmarket, et
# une image Node nue ne peut pas le lancer (librairies graphiques absentes).
#
# La version doit rester alignée sur celle de playwright dans package.json.
FROM mcr.microsoft.com/playwright:v1.60.0-jammy

WORKDIR /app

# Couche de dépendances séparée : elle n'est reconstruite que si les
# manifestes changent, pas à chaque modification du code.
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
