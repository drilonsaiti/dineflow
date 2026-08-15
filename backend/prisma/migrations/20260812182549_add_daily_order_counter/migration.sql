-- CreateTable
CREATE TABLE "DailyOrderCounter"
(
    "venueId"   TEXT         NOT NULL,
    "day"       TIMESTAMP(3) NOT NULL,
    "lastValue" INTEGER      NOT NULL DEFAULT 0,

    CONSTRAINT "DailyOrderCounter_pkey" PRIMARY KEY ("venueId", "day")
);
