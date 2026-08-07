# Déploiement — Neon, Render, Vercel

Trois services, dans cet ordre : la base d'abord, l'API ensuite, le front en
dernier (il a besoin de l'URL de l'API au moment du build).

Les étapes qui demandent de créer un compte ou de saisir un secret sont à faire
à la main : ni les identifiants Cardmarket ni la chaîne de connexion Neon ne
doivent transiter ailleurs que par les interfaces des plateformes.

---

## 1. Neon — base de données

1. Créer un projet, région **Europe (Frankfurt)** pour être proche de Render.
2. Copier la chaîne de connexion **pooled** (celle qui contient `-pooler`), en
   gardant `?sslmode=require`.

Le schéma n'est pas à créer à la main : le conteneur applique
`prisma migrate deploy` à chaque démarrage, et la migration `0_init` crée les
cinq tables.

Pour peupler le catalogue, depuis un poste ayant la chaîne Neon dans son `.env` :

```bash
npm --prefix backend run seed            # 76 ETB
npm --prefix backend run backfill:cmids  # lien vers Cardmarket
```

Ne **pas** lancer `seed:prix` : il génère des prix fictifs.

---

## 2. Render — API

Le service se déploie **par Docker**, pas en runtime Node. C'est nécessaire :
la collecte des prix ouvre Chromium pour télécharger le Price Guide Cardmarket,
et l'image Node standard n'a pas les librairies système pour le lancer.
`backend/Dockerfile` part de l'image officielle Playwright.

1. **New → Blueprint**, pointer sur le dépôt : `render.yaml` est détecté.
2. Renseigner les variables marquées `sync: false` :

   | Variable | Valeur |
   |---|---|
   | `DATABASE_URL` | chaîne pooled de Neon |
   | `ADMIN_EMAIL` | l'email qui deviendra ADMIN à l'inscription |
   | `CM_EMAIL`, `CM_PASSWORD` | identifiants Cardmarket |
   | `ORIGINES_AUTORISEES` | à remplir après l'étape 3 |

   `JWT_SECRET` est généré par Render.

3. Vérifier une fois en ligne : `https://<service>.onrender.com/health` doit
   répondre `{"status":"ok"}`.

### Collecte des prix

`CRONS_ACTIFS` et `COLLECTE_AU_DEMARRAGE` sont à `false` dans le blueprint,
volontairement. Sur le plan gratuit le service s'endort faute de trafic : les
tâches planifiées dans le processus ne partiraient pas de façon fiable, et
chaque réveil relancerait une connexion Cardmarket.

La collecte se déclenche donc de l'extérieur, par un appel authentifié :

```
POST /api/admin/refresh
Authorization: Bearer <jeton d'un compte ADMIN>
```

Un planificateur externe (Render Cron Job sur plan payant, GitHub Actions,
cron-job.org) l'appelle une fois par jour. Sur un plan qui ne dort pas,
`CRONS_ACTIFS=true` suffit et rend le planificateur externe inutile.

---

## 3. Vercel — front

1. **Add New → Project**, importer le dépôt.
2. **Root Directory : `frontend`** — sans ça, Vercel construit la racine du
   dépôt et ne trouve rien.
3. Variable d'environnement :

   | Variable | Valeur |
   |---|---|
   | `VITE_API_URL` | `https://<service>.onrender.com/api` |

   Elle est lue **au build**, pas à l'exécution : la changer impose un
   redéploiement. Sans elle, le front appelle `/api` en relatif, ce qui ne
   fonctionne qu'en développement grâce au proxy Vite.

4. Une fois l'URL Vercel connue, revenir sur Render remplir
   `ORIGINES_AUTORISEES` avec cette URL exacte (`https://…`, sans barre
   oblique finale), puis redéployer l'API.

---

## Vérification

```bash
curl https://<service>.onrender.com/health
curl https://<service>.onrender.com/api/etbs | head -c 200
```

Puis dans le navigateur, sur le domaine Vercel : le catalogue doit se remplir.
S'il reste vide, ouvrir la console — une erreur CORS signifie que
`ORIGINES_AUTORISEES` ne correspond pas au domaine, un « Serveur injoignable »
que `VITE_API_URL` est absente ou fausse.

---

## Points à connaître

**Le plan gratuit Render s'endort** après quinze minutes sans trafic. Le
premier appel réveille le service et prend plusieurs dizaines de secondes —
l'image Playwright est lourde. Le front affichera son état d'erreur en
attendant.

**Les migrations sont rejouées à chaque démarrage** du conteneur.
`migrate deploy` est idempotent et ne touche pas aux données.

**Le catalogue ne se seede pas tout seul.** Après le premier déploiement, la
base Neon est vide : sans l'étape 1, l'API répond `[]` et le site est vide sans
erreur apparente.
