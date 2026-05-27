-- CreateTable
CREATE TABLE "etbs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "set_id" TEXT NOT NULL,
    "image_url" TEXT,
    "date_sortie" DATE,
    "prix_sortie" DECIMAL(10,2),
    "contenu" JSONB,

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
CREATE TABLE "prix_historique" (
    "id" SERIAL NOT NULL,
    "etb_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "cm_prix_moyen" DECIMAL(10,2),
    "cm_prix_bas" DECIMAL(10,2),
    "cm_nb_annonces" INTEGER,
    "ebay_prix_moyen" DECIMAL(10,2),
    "score" INTEGER,
    "score_detail" JSONB,

    CONSTRAINT "prix_historique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prix_historique_etb_id_date_key" ON "prix_historique"("etb_id", "date");

-- AddForeignKey
ALTER TABLE "cartes" ADD CONSTRAINT "cartes_etb_id_fkey" FOREIGN KEY ("etb_id") REFERENCES "etbs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prix_historique" ADD CONSTRAINT "prix_historique_etb_id_fkey" FOREIGN KEY ("etb_id") REFERENCES "etbs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
