-- AlterTable
ALTER TABLE "specimens" ADD COLUMN     "dateIdentified" VARCHAR(50),
ADD COLUMN     "identifiedBy" VARCHAR(200),
ADD COLUMN     "otherCollectors" VARCHAR(500);
