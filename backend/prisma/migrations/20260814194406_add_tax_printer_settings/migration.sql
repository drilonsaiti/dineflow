-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "autoPrintTickets" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "printerBridgeUrl" TEXT,
ADD COLUMN     "taxInclusive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "taxRatePercent" DOUBLE PRECISION;
