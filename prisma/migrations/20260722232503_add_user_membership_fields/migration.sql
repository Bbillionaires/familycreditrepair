-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isComped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "membershipStatus" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

