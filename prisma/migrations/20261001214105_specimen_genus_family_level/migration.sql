-- AlterTable
ALTER TABLE "specimens" ADD COLUMN     "familyId" TEXT,
ADD COLUMN     "genusId" TEXT;

-- CreateIndex
CREATE INDEX "specimens_genusId_idx" ON "specimens"("genusId");

-- CreateIndex
CREATE INDEX "specimens_familyId_idx" ON "specimens"("familyId");

-- AddForeignKey
ALTER TABLE "specimens" ADD CONSTRAINT "specimens_genusId_fkey" FOREIGN KEY ("genusId") REFERENCES "genera"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specimens" ADD CONSTRAINT "specimens_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;
