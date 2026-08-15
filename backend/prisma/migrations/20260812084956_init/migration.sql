-- CreateEnum
CREATE TYPE "VenueRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF', 'KITCHEN', 'BAR');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('RECEIVED', 'VIEWED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User"
(
    "id"        UUID         NOT NULL,
    "email"     TEXT         NOT NULL,
    "fullName"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueMembership"
(
    "id"        UUID         NOT NULL,
    "userId"    UUID         NOT NULL,
    "venueId"   UUID         NOT NULL,
    "role"      "VenueRole"  NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue"
(
    "id"                   UUID                 NOT NULL,
    "slug"                 TEXT                 NOT NULL,
    "name"                 TEXT                 NOT NULL,
    "type"                 TEXT,
    "logoUrl"              TEXT,
    "brandColor"           TEXT,
    "currency"             TEXT                 NOT NULL DEFAULT 'USD',
    "timezone"             TEXT                 NOT NULL DEFAULT 'UTC',
    "plan"                 "PlanTier"           NOT NULL DEFAULT 'FREE',
    "subscriptionStatus"   "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "maxTables"            INTEGER              NOT NULL DEFAULT 10,
    "analyticsHistoryDays" INTEGER              NOT NULL DEFAULT 30,
    "createdAt"            TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3)         NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCategory"
(
    "id"           UUID         NOT NULL,
    "venueId"      UUID         NOT NULL,
    "name"         TEXT         NOT NULL,
    "description"  TEXT,
    "displayOrder" INTEGER      NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag"
(
    "id"      UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "label"   TEXT NOT NULL,
    "kind"    TEXT NOT NULL DEFAULT 'dietary',

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem"
(
    "id"           UUID         NOT NULL,
    "venueId"      UUID         NOT NULL,
    "categoryId"   UUID         NOT NULL,
    "name"         TEXT         NOT NULL,
    "description"  TEXT,
    "photoUrl"     TEXT,
    "priceCents"   INTEGER      NOT NULL,
    "isAvailable"  BOOLEAN      NOT NULL DEFAULT true,
    "displayOrder" INTEGER      NOT NULL DEFAULT 0,
    "dineInOnly"   BOOLEAN      NOT NULL DEFAULT false,
    "takeawayOnly" BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemTag"
(
    "menuItemId" UUID NOT NULL,
    "tagId"      UUID NOT NULL,

    CONSTRAINT "MenuItemTag_pkey" PRIMARY KEY ("menuItemId", "tagId")
);

-- CreateTable
CREATE TABLE "ModifierGroup"
(
    "id"           UUID    NOT NULL,
    "menuItemId"   UUID    NOT NULL,
    "name"         TEXT    NOT NULL,
    "isRequired"   BOOLEAN NOT NULL DEFAULT false,
    "minSelect"    INTEGER NOT NULL DEFAULT 0,
    "maxSelect"    INTEGER NOT NULL DEFAULT 1,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierOption"
(
    "id"              UUID    NOT NULL,
    "modifierGroupId" UUID    NOT NULL,
    "name"            TEXT    NOT NULL,
    "priceDeltaCents" INTEGER NOT NULL DEFAULT 0,
    "displayOrder"    INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ModifierOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area"
(
    "id"      UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "name"    TEXT NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Table"
(
    "id"        UUID         NOT NULL,
    "venueId"   UUID         NOT NULL,
    "areaId"    UUID,
    "label"     TEXT         NOT NULL,
    "token"     UUID         NOT NULL,
    "isActive"  BOOLEAN      NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order"
(
    "id"           UUID          NOT NULL,
    "venueId"      UUID          NOT NULL,
    "tableId"      UUID          NOT NULL,
    "dailyNumber"  INTEGER       NOT NULL,
    "status"       "OrderStatus" NOT NULL DEFAULT 'RECEIVED',
    "customerName" TEXT,
    "note"         TEXT,
    "totalCents"   INTEGER       NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)  NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem"
(
    "id"             UUID    NOT NULL,
    "orderId"        UUID    NOT NULL,
    "menuItemId"     UUID    NOT NULL,
    "quantity"       INTEGER NOT NULL DEFAULT 1,
    "note"           TEXT,
    "unitPriceCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemModifier"
(
    "id"               UUID    NOT NULL,
    "orderItemId"      UUID    NOT NULL,
    "modifierOptionId" UUID    NOT NULL,
    "priceDeltaCents"  INTEGER NOT NULL,

    CONSTRAINT "OrderItemModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusEvent"
(
    "id"              UUID          NOT NULL,
    "orderId"         UUID          NOT NULL,
    "status"          "OrderStatus" NOT NULL,
    "changedAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByUserId" UUID,

    CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");

-- CreateIndex
CREATE INDEX "VenueMembership_venueId_idx" ON "VenueMembership" ("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "VenueMembership_userId_venueId_key" ON "VenueMembership" ("userId", "venueId");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue" ("slug");

-- CreateIndex
CREATE INDEX "MenuCategory_venueId_idx" ON "MenuCategory" ("venueId");

-- CreateIndex
CREATE INDEX "Tag_venueId_idx" ON "Tag" ("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_venueId_label_key" ON "Tag" ("venueId", "label");

-- CreateIndex
CREATE INDEX "MenuItem_venueId_idx" ON "MenuItem" ("venueId");

-- CreateIndex
CREATE INDEX "MenuItem_categoryId_idx" ON "MenuItem" ("categoryId");

-- CreateIndex
CREATE INDEX "ModifierGroup_menuItemId_idx" ON "ModifierGroup" ("menuItemId");

-- CreateIndex
CREATE INDEX "ModifierOption_modifierGroupId_idx" ON "ModifierOption" ("modifierGroupId");

-- CreateIndex
CREATE INDEX "Area_venueId_idx" ON "Area" ("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "Table_token_key" ON "Table" ("token");

-- CreateIndex
CREATE INDEX "Table_venueId_idx" ON "Table" ("venueId");

-- CreateIndex
CREATE INDEX "Order_venueId_status_idx" ON "Order" ("venueId", "status");

-- CreateIndex
CREATE INDEX "Order_tableId_idx" ON "Order" ("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_venueId_dailyNumber_createdAt_key" ON "Order" ("venueId", "dailyNumber", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem" ("orderId");

-- CreateIndex
CREATE INDEX "OrderItemModifier_orderItemId_idx" ON "OrderItemModifier" ("orderItemId");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_orderId_idx" ON "OrderStatusEvent" ("orderId");

-- AddForeignKey
ALTER TABLE "VenueMembership"
    ADD CONSTRAINT "VenueMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueMembership"
    ADD CONSTRAINT "VenueMembership_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCategory"
    ADD CONSTRAINT "MenuCategory_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag"
    ADD CONSTRAINT "Tag_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem"
    ADD CONSTRAINT "MenuItem_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem"
    ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemTag"
    ADD CONSTRAINT "MenuItemTag_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemTag"
    ADD CONSTRAINT "MenuItemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierGroup"
    ADD CONSTRAINT "ModifierGroup_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierOption"
    ADD CONSTRAINT "ModifierOption_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area"
    ADD CONSTRAINT "Area_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table"
    ADD CONSTRAINT "Table_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table"
    ADD CONSTRAINT "Table_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemModifier"
    ADD CONSTRAINT "OrderItemModifier_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemModifier"
    ADD CONSTRAINT "OrderItemModifier_modifierOptionId_fkey" FOREIGN KEY ("modifierOptionId") REFERENCES "ModifierOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent"
    ADD CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent"
    ADD CONSTRAINT "OrderStatusEvent_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
