-- AlterTable
ALTER TABLE "User" ADD COLUMN     "chatCreditBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ChatUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatPackPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionsGranted" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatPackPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "dailyFreeQuestions" INTEGER NOT NULL DEFAULT 3,
    "packQuestionCount" INTEGER NOT NULL DEFAULT 10,
    "packPriceCents" INTEGER NOT NULL DEFAULT 200,
    "hardDailyCap" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatUsage_userId_createdAt_idx" ON "ChatUsage"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatPackPurchase_stripeSessionId_key" ON "ChatPackPurchase"("stripeSessionId");

-- CreateIndex
CREATE INDEX "ChatPackPurchase_userId_idx" ON "ChatPackPurchase"("userId");

-- AddForeignKey
ALTER TABLE "ChatUsage" ADD CONSTRAINT "ChatUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPackPurchase" ADD CONSTRAINT "ChatPackPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

