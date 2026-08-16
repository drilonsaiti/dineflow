-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "supportedLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[];
