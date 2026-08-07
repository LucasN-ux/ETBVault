-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mot_de_passe_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etbs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "nom_fr" TEXT,
    "set_id" TEXT,
    "era" TEXT,
    "image_url" TEXT,
    "date_sortie" DATE,
    "prix_sortie" DECIMAL(10,2),
    "contenu" JSONB,
    "cm_url" TEXT,
    "cm_id_products" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "etbs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cartes" (
    "id" TEXT NOT NULL,
    "etb_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "numero" TEXT,
    "image_url" TEXT,
    "rarete" TEXT,
    "prix_marche" DECIMAL(10,2),
    "mis_a_jour" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cartes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vault_entries" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "etb_id" TEXT NOT NULL,
    "prix_achat" DECIMAL(10,2) NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "date_achat" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vault_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prix_historique" (
    "id" SERIAL NOT NULL,
    "etb_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "cm_prix_moyen" DECIMAL(10,2),
    "cm_prix_bas" DECIMAL(10,2),
    "cm_nb_annonces" INTEGER,
    "ebay_prix_moyen" DECIMAL(10,2),
    "origine" TEXT NOT NULL DEFAULT 'collecte',

    CONSTRAINT "prix_historique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "cartes_etb_id_idx" ON "cartes"("etb_id");

-- CreateIndex
CREATE INDEX "vault_entries_user_id_idx" ON "vault_entries"("user_id");

-- CreateIndex
CREATE INDEX "vault_entries_etb_id_idx" ON "vault_entries"("etb_id");

-- CreateIndex
CREATE UNIQUE INDEX "prix_historique_etb_id_date_key" ON "prix_historique"("etb_id", "date");

-- AddForeignKey
ALTER TABLE "cartes" ADD CONSTRAINT "cartes_etb_id_fkey" FOREIGN KEY ("etb_id") REFERENCES "etbs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_entries" ADD CONSTRAINT "vault_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_entries" ADD CONSTRAINT "vault_entries_etb_id_fkey" FOREIGN KEY ("etb_id") REFERENCES "etbs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prix_historique" ADD CONSTRAINT "prix_historique_etb_id_fkey" FOREIGN KEY ("etb_id") REFERENCES "etbs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

