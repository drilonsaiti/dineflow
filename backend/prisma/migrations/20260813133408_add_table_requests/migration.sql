-- CreateEnum
CREATE TYPE "TableRequestType" AS ENUM ('CALL_WAITER', 'REQUEST_BILL_CASH');

-- CreateEnum
CREATE TYPE "TableRequestStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "TableRequest" (
    "id" UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "tableId" UUID NOT NULL,
    "type" "TableRequestType" NOT NULL,
    "status" "TableRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedByUserId" UUID,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "TableRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TableRequest_venueId_status_idx" ON "TableRequest"("venueId", "status");

-- AddForeignKey
ALTER TABLE "TableRequest" ADD CONSTRAINT "TableRequest_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableRequest" ADD CONSTRAINT "TableRequest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
