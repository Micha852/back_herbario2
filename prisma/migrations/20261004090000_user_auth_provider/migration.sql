-- AlterTable
ALTER TABLE "users" ADD COLUMN     "authProvider" VARCHAR(20) NOT NULL DEFAULT 'LOCAL';


-- Las cuentas de Chairá existentes (las que aún tienen el correo ficticio)
UPDATE "users" SET "authProvider" = 'CHAIRA' WHERE "email" LIKE '%@chaira.local';
