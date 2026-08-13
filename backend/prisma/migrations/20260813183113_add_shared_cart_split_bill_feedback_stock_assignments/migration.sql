/*
  Warnings:

  - The `orderId` column on the `NotificationLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `venueId` on the `NotificationLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "lowStockThreshold" INTEGER,
ADD COLUMN     "stockCount" INTEGER;

-- AlterTable
ALTER TABLE "NotificationLog" DROP COLUMN "venueId",
ADD COLUMN     "venueId" UUID NOT NULL,
DROP COLUMN "orderId",
ADD COLUMN     "orderId" UUID;

-- AlterTable
ALTER TABLE "TableRequest" ADD COLUMN     "guestCount" INTEGER,
ADD COLUMN     "perPersonCentsAtRequest" INTEGER,
ADD COLUMN     "totalCentsAtRequest" INTEGER;

-- CreateTable
CREATE TABLE "TableCartItem" (
    "id" TEXT NOT NULL,
    "venueId" UUID NOT NULL,
    "tableId" UUID NOT NULL,
    "menuItemId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "addedByLabel" TEXT,
    "modifierOptionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TableCartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderFeedback" (
    "id" TEXT NOT NULL,
    "orderId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffTableAssignment" (
    "id" TEXT NOT NULL,
    "venueId" UUID NOT NULL,
    "tableId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffTableAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TableCartItem_tableId_idx" ON "TableCartItem"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderFeedback_orderId_key" ON "OrderFeedback"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffTableAssignment_tableId_key" ON "StaffTableAssignment"("tableId");

-- CreateIndex
CREATE INDEX "NotificationLog_venueId_idx" ON "NotificationLog"("venueId");

-- CreateIndex
CREATE INDEX "NotificationLog_orderId_idx" ON "NotificationLog"("orderId");

-- AddForeignKey
ALTER TABLE "TableCartItem" ADD CONSTRAINT "TableCartItem_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableCartItem" ADD CONSTRAINT "TableCartItem_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableCartItem" ADD CONSTRAINT "TableCartItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderFeedback" ADD CONSTRAINT "OrderFeedback_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTableAssignment" ADD CONSTRAINT "StaffTableAssignment_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTableAssignment" ADD CONSTRAINT "StaffTableAssignment_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTableAssignment" ADD CONSTRAINT "StaffTableAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
