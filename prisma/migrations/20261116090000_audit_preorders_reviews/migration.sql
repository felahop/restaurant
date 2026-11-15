-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "notifiedAt" TIMESTAMP(3);

-- Старые заказы считаем уже отправленными: напоминания по ним не нужны.
UPDATE "Order" SET "notifiedAt" = "createdAt" WHERE "status" <> 'AWAITING_PAYMENT';

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "preorderAlertMinutes" INTEGER NOT NULL DEFAULT 120;

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT,
    "adminName" TEXT NOT NULL,
    "adminLogin" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_createdAt_idx" ON "AdminAuditLog"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_section_createdAt_idx" ON "AdminAuditLog"("section", "createdAt");

-- CreateIndex
CREATE INDEX "Order_scheduledFor_idx" ON "Order"("scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderId_key" ON "Review"("orderId");

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

