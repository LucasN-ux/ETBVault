CREATE TABLE IF NOT EXISTS etbs (
  id            TEXT PRIMARY KEY,
  nom           TEXT NOT NULL,
  set_id        TEXT NOT NULL,
  image_url     TEXT,
  date_sortie   DATE,
  prix_sortie   DECIMAL(10,2),
  contenu       JSONB
);

CREATE TABLE IF NOT EXISTS prix_historique (
  id              SERIAL PRIMARY KEY,
  etb_id          TEXT REFERENCES etbs(id),
  date            DATE NOT NULL,
  cm_prix_moyen   DECIMAL(10,2),
  cm_prix_bas     DECIMAL(10,2),
  cm_nb_annonces  INT,
  ebay_prix_moyen DECIMAL(10,2),
  origine         TEXT NOT NULL DEFAULT 'collecte',  -- 'collecte' | 'import_cm'
  UNIQUE(etb_id, date)
);
