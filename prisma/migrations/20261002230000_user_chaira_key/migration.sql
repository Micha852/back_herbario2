-- AlterTable
ALTER TABLE "users" ADD COLUMN     "chairaKeyHash" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "users_chairaKeyHash_key" ON "users"("chairaKeyHash");

