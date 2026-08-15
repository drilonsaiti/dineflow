-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('CUSTOMER_ORDER_READY', 'STAFF_ORDER_LATE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'WEBHOOK', 'EMAIL');

-- AlterTable
ALTER TABLE "Order"
    ADD COLUMN "customerPhone" TEXT;

-- AlterTable
ALTER TABLE "Venue"
    ADD COLUMN "lateOrderThresholdMinutes" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "staffAlertWebhookUrl" TEXT;

-- CreateTable
CREATE TABLE "NotificationLog"
(
    "id"        TEXT                  NOT NULL,
    "venueId"   TEXT                  NOT NULL,
    "orderId"   TEXT,
    "kind"      "NotificationKind"    NOT NULL,
    "channel"   "NotificationChannel" NOT NULL,
    "recipient" TEXT                  NOT NULL,
    "status"    TEXT                  NOT NULL,
    "detail"    TEXT,
    "createdAt" TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationLog_venueId_idx" ON "NotificationLog" ("venueId");

-- CreateIndex
CREATE INDEX "NotificationLog_orderId_idx" ON "NotificationLog" ("orderId");
