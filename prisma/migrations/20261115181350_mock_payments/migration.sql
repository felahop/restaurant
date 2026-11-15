-- CreateTable
CREATE TABLE "MockPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "returnUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MockPayment_orderId_idx" ON "MockPayment"("orderId");
