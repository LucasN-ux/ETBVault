-- AlterTable
ALTER TABLE "cartes" ADD COLUMN     "langue" TEXT NOT NULL DEFAULT 'fr';

-- AlterTable
ALTER TABLE "etbs" ADD COLUMN     "era" TEXT,
ADD COLUMN     "set_id_jap" TEXT;
