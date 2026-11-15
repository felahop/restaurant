import "server-only";
import { clientIp } from "@/server/http";
import { ipInAny } from "./ip";
import {
  toMajorString,
  toMinorUnits,
  type CreatePaymentInput,
  type CreatedPayment,
  type PaymentProvider,
  type PaymentSnapshot,
  type VerifiedNotification,
} from "./types";

/**
 * ЮKassa, API v3. Сверено с официальной документацией:
 *  - создание платежа: https://yookassa.ru/developers/payment-acceptance/getting-started/quick-start
 *  - СБП: https://yookassa.ru/developers/payment-acceptance/integration-scenarios/manual-integration/other/sbp
 *  - уведомления и проверка подлинности: https://yookassa.ru/developers/using-api/webhooks
 *  - формат и идемпотентность: https://yookassa.ru/developers/using-api/interaction-format
 *  - спецификация OpenAPI (GET /payments/{payment_id}).
 * Ключи: YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY. URL для уведомлений в личном кабинете:
 *   https://<ваш-домен>/api/payments/webhook/yookassa
 */

const API = "https://api.yookassa.ru/v3";
const TIMEOUT_MS = 10_000;

/** IP-адреса, с которых ЮKassa присылает уведомления (из документации). */
export const YOOKASSA_IPS = [
  "185.71.76.0/27",
  "185.71.77.0/27",
  "77.75.153.0/25",
  "77.75.156.11",
  "77.75.156.35",
  "77.75.154.128/25",
  "2a02:5180::/32",
] as const;

type ApiPayment = {
  id: string;
  status: PaymentSnapshot["status"];
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url?: string };
  metadata?: Record<string, string | null>;
};

export class YooKassaProvider implements PaymentProvider {
  readonly name = "yookassa";

  constructor(
    private readonly shopId: string,
    private readonly secretKey: string,
    private readonly checkIp = true,
  ) {}

  private authHeader() {
    return `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString("base64")}`;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    const body = {
      amount: { value: toMajorString(input.amount), currency: "RUB" },
      capture: true,
      confirmation: { type: "redirect", return_url: input.returnUrl },
      description: input.description.slice(0, 128),
      metadata: { orderId: input.orderId, orderNumber: String(input.orderNumber) },
      payment_method_data: { type: input.method === "SBP" ? "sbp" : "bank_card" },
      // TODO(54-ФЗ): если чеки отправляет ЮKassa, добавить объект receipt (позиции, НДС, контакт покупателя).
    };
    const res = await fetch(`${API}/payments`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Idempotence-Key": input.idempotenceKey.slice(0, 64),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`ЮKassa: создание платежа, ответ ${res.status}`);
    const payment = (await res.json()) as ApiPayment;
    const url = payment.confirmation?.confirmation_url;
    if (!url) throw new Error("ЮKassa не вернула ссылку на оплату");
    return { paymentId: payment.id, confirmationUrl: url };
  }

  async fetchPayment(paymentId: string): Promise<PaymentSnapshot> {
    const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: this.authHeader() },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`ЮKassa: статус платежа, ответ ${res.status}`);
    const p = (await res.json()) as ApiPayment;
    return {
      id: p.id,
      status: p.status,
      amount: toMinorUnits(p.amount.value),
      currency: p.amount.currency,
      orderId: p.metadata?.orderId ?? null,
    };
  }

  async verifyNotification(request: Request, rawBody: string): Promise<VerifiedNotification | null> {
    // 1) IP из списка ЮKassa (за обратным прокси — первый адрес X-Forwarded-For, см. README).
    if (this.checkIp && !ipInAny(clientIp(request), YOOKASSA_IPS)) return null;
    // 2) Формат уведомления.
    let body: { type?: string; event?: string; object?: { id?: string } };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }
    if (body.type !== "notification" || !body.event || !body.object?.id) return null;
    // 3) Статус всё равно перепроверяем запросом к API при обработке (fetchPayment).
    return { eventId: `${body.event}:${body.object.id}`, event: body.event, paymentId: body.object.id, payload: body };
  }
}
