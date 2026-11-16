-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PENDING', 'SUCCEEDED', 'DECLINED', 'FAILED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "refundAmount" INTEGER,
ADD COLUMN     "refundDecidedAt" TIMESTAMP(3),
ADD COLUMN     "refundDecidedBy" TEXT,
ADD COLUMN     "refundId" TEXT,
ADD COLUMN     "refundNote" TEXT,
ADD COLUMN     "refundStatus" "RefundStatus";

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "bookingCapacity" INTEGER NOT NULL DEFAULT 40,
ADD COLUMN     "bookingDurationMinutes" INTEGER NOT NULL DEFAULT 120;

-- CreateIndex
CREATE UNIQUE INDEX "Order_refundId_key" ON "Order"("refundId");

-- CreateIndex
CREATE INDEX "Order_refundStatus_idx" ON "Order"("refundStatus");

