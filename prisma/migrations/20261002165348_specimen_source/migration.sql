-- AlterTable
ALTER TABLE "specimens" ADD COLUMN     "source" VARCHAR(20) NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "specimens_source_idx" ON "specimens"("source");

-- Las muestras ya importadas del Excel del jardín botánico (catálogos "jb...", con otros recolectores en texto)
UPDATE "specimens" SET "source" = 'IMPORT'
WHERE "catalogNumber" LIKE 'jb%' AND "otherCollectors" IS NOT NULL AND "createdAt" >= '2026-10-02';
