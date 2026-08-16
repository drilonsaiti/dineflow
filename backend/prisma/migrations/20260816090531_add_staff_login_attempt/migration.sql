-- CreateTable
CREATE TABLE "StaffLoginAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,

    CONSTRAINT "StaffLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffLoginAttempt_email_createdAt_idx" ON "StaffLoginAttempt"("email", "createdAt");
