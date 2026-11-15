import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { receiptSum } from "@/lib/payments/receipt";
import { db } from "@/server/db";
import type {
  CreatePaymentInput,
  CreatedPayment,
  PaymentProvider,
  PaymentSnapshot,
  VerifiedNotification,
} from "./types";

/**
 * Тестовая заглушка платёжного сервиса для разработки и автотестов.
 * Ведёт себя как настоящий: отдельная страница оплаты, уведомление с подписью, статус по запросу.
 */

export const MOCK_SIGNATURE_HEADER = "x-mock-signature";

function secret() {
  const s = process.env.APP_SECRET;
  if (!s) throw new Error("APP_SECRET не задан");
  return `mock-payments:${s}`;
}

export function signMockBody(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("hex");
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  constructor(private readonly siteUrl: string) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    // Как и ЮKassa, заглушка не примет чек, сумма которого не совпадает с платежом.
    if (input.receipt && receiptSum(input.receipt.lines) !== input.amount) throw new Error("Сумма чека не совпадает с платежом");
    const id = `mock_${randomBytes(12).toString("hex")}`;
    await db.mockPayment.create({
      data: { id, orderId: input.orderId, amount: input.amount, method: input.method, returnUrl: input.returnUrl },
    });
    return { paymentId: id, confirmationUrl: `${this.siteUrl}/pay/mock/${id}` };
  }

  async fetchPayment(paymentId: string): Promise<PaymentSnapshot> {
    const p = await db.mockPayment.findUnique({ where: { id: paymentId } });
    if (!p) throw new Error("Тестовый платёж не найден");
    return {
      id: p.id,
      status: p.status as PaymentSnapshot["status"],
      amount: p.amount,
      currency: "RUB",
      orderId: p.orderId,
    };
  }

  async verifyNotification(request: Request, rawBody: string): Promise<VerifiedNotification | null> {
    const given = request.headers.get(MOCK_SIGNATURE_HEADER) ?? "";
    const expected = signMockBody(rawBody);
    if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return null;
    try {
      const body = JSON.parse(rawBody) as { event?: string; object?: { id?: string } };
      if (!body.event || !body.object?.id) return null;
      return {
        eventId: `${body.event}:${body.object.id}`,
        event: body.event,
        paymentId: body.object.id,
        payload: body,
      };
    } catch {
      return null;
    }
  }
}
