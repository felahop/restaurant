import "server-only";
import { receiptSum } from "@/lib/payments/receipt";
import { clientIp } from "@/server/http";
import { ipInAny } from "./ip";
import {
  toMajorString,
  toMinorUnits,
  type CreatePaymentInput,
  type CreatedPayment,
  type PaymentProvider,
  type PaymentSnapshot,
  type ReceiptInput,
  type VerifiedNotification,
} from "./types";

/**
 * ЮKassa, API v3. Сверено с официальной документацией:
 *  - создание платежа: https://yookassa.ru/developers/payment-acceptance/getting-started/quick-start
 *  - СБП: https://yookassa.ru/developers/payment-acceptance/integration-scenarios/manual-integration/other/sbp
 *  - уведомления и проверка подлинности: https://yookassa.ru/developers/using-api/webhooks
 *  - формат и идемпотентность: https://yookassa.ru/developers/using-api/interaction-format
 *  - спецификация OpenAPI (GET /payments/{payment_id}, объект receipt в POST /payments).
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

/**
 * Настройки чеков (54-ФЗ) для «Чеков от ЮKassa». Значения зависят от налогового режима ресторана —
 * их выбирает бухгалтер по справочнику ЮKassa (parameters-values), сайт их не угадывает.
 *   YOOKASSA_RECEIPTS=true — передавать чек с каждым платежом;
 *   YOOKASSA_VAT_CODE — ставка НДС (vat_code, 1–12), обязательна;
 *   YOOKASSA_TAX_SYSTEM_CODE — система налогообложения (tax_system_code, 1–6), если требует касса;
 *   YOOKASSA_RECEIPT_PAYMENT_SUBJECT — признак предмета расчёта для блюд (по умолчанию commodity);
 *   YOOKASSA_RECEIPT_PAYMENT_MODE — признак способа расчёта (по умолчанию full_prepayment: оплата до получения).
 */
export function receiptConfig() {
  if (process.env.YOOKASSA_RECEIPTS !== "true") return null;
  const vat = Number(process.env.YOOKASSA_VAT_CODE);
  if (!Number.isInteger(vat) || vat < 1 || vat > 12) {
    throw new Error("Включены чеки ЮKassa, но не задан YOOKASSA_VAT_CODE (1–12)");
  }
  const tax = Number(process.env.YOOKASSA_TAX_SYSTEM_CODE);
  return {
    vatCode: vat,
    taxSystemCode: Number.isInteger(tax) && tax >= 1 && tax <= 6 ? tax : null,
    paymentSubject: process.env.YOOKASSA_RECEIPT_PAYMENT_SUBJECT || "commodity",
    paymentMode: process.env.YOOKASSA_RECEIPT_PAYMENT_MODE || "full_prepayment",
  };
}

/** Объект receipt по схеме ReceiptData из спецификации ЮKassa. */
export function receiptBody(amount: number, receipt: ReceiptInput, cfg: NonNullable<ReturnType<typeof receiptConfig>>) {
  if (receiptSum(receipt.lines) !== amount) throw new Error("Сумма позиций чека не совпадает с суммой платежа");
  const customer: Record<string, string> = {};
  if (receipt.email) customer.email = receipt.email;
  // Телефон — в формате E.164 без «+», как в примере документации (79000000000).
  if (receipt.phone) customer.phone = receipt.phone.replace(/^\+/, "");
  return {
    customer,
    items: receipt.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      amount: { value: toMajorString(l.unitPrice), currency: "RUB" },
      vat_code: cfg.vatCode,
      payment_subject: l.kind === "delivery" ? "service" : cfg.paymentSubject,
      payment_mode: cfg.paymentMode,
      measure: "piece",
    })),
    ...(cfg.taxSystemCode ? { tax_system_code: cfg.taxSystemCode } : {}),
  };
}

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
      ...(input.receipt ? { receipt: receiptBody(input.amount, input.receipt, receiptConfig()!) } : {}),
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
