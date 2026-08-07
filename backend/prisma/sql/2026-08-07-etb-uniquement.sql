-- Retour au périmètre ETB — migration DESTRUCTIVE.
--
-- Le code (schema.prisma) est déjà aligné : il ne lit plus les colonnes `type`
-- et `box_image_url`, et ne connaît plus que les ETB. Tant que ce script n'est
-- pas passé, les lignes non-ETB restent en base et le site les affichera comme
-- des ETB.
--
-- FAIRE UNE SAUVEGARDE AVANT :
--   pg_dump "$DATABASE_URL" > etbvault-avant-purge.sql
--
-- Puis :
--   psql "$DATABASE_URL" -f backend/prisma/sql/2026-08-07-etb-uniquement.sql

BEGIN;

-- 1. Ce qui va disparaître. Lire la sortie avant d'aller plus loin.
SELECT type, COUNT(*) AS lignes
FROM etbs
GROUP BY type
ORDER BY lignes DESC;

SELECT COUNT(*) AS points_de_prix_supprimes
FROM prix_historique p
JOIN etbs e ON e.id = p.etb_id
WHERE e.type <> 'ETB';

SELECT COUNT(*) AS positions_de_coffre_supprimees
FROM vault_entries v
JOIN etbs e ON e.id = v.etb_id
WHERE e.type <> 'ETB';

-- 2. Purge des produits hors périmètre, dépendances d'abord.
DELETE FROM prix_historique WHERE etb_id IN (SELECT id FROM etbs WHERE type <> 'ETB');
DELETE FROM vault_entries   WHERE etb_id IN (SELECT id FROM etbs WHERE type <> 'ETB');
DELETE FROM cartes          WHERE etb_id IN (SELECT id FROM etbs WHERE type <> 'ETB');
DELETE FROM etbs            WHERE type <> 'ETB';

-- 3. Le modèle n'a plus qu'un type de produit et plus qu'une source d'image.
ALTER TABLE etbs DROP COLUMN IF EXISTS type;
ALTER TABLE etbs DROP COLUMN IF EXISTS box_image_url;
DROP TYPE IF EXISTS "ProduitType";

-- 4. Suppressions en cascade attendues par le schéma Prisma.
ALTER TABLE cartes          DROP CONSTRAINT IF EXISTS cartes_etb_id_fkey;
ALTER TABLE vault_entries   DROP CONSTRAINT IF EXISTS vault_entries_etb_id_fkey;
ALTER TABLE prix_historique DROP CONSTRAINT IF EXISTS prix_historique_etb_id_fkey;

ALTER TABLE cartes
  ADD CONSTRAINT cartes_etb_id_fkey
  FOREIGN KEY (etb_id) REFERENCES etbs(id) ON DELETE CASCADE;
ALTER TABLE vault_entries
  ADD CONSTRAINT vault_entries_etb_id_fkey
  FOREIGN KEY (etb_id) REFERENCES etbs(id) ON DELETE CASCADE;
ALTER TABLE prix_historique
  ADD CONSTRAINT prix_historique_etb_id_fkey
  FOREIGN KEY (etb_id) REFERENCES etbs(id) ON DELETE CASCADE;

-- 5. Index ajoutés par le schéma.
CREATE INDEX IF NOT EXISTS cartes_etb_id_idx        ON cartes(etb_id);
CREATE INDEX IF NOT EXISTS vault_entries_etb_id_idx ON vault_entries(etb_id);

COMMIT;

-- Vérification : ne doit rester que les ETB curées.
-- SELECT COUNT(*) FROM etbs;
-- SELECT COUNT(*) FROM etbs WHERE id LIKE 'cm-%';   -- attendu : 0
