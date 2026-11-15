/** Сменный модуль приёма онлайн-оплаты. Данные карт сайт не видит: гость вводит их на стороне сервиса. */

import type { ReceiptLine } from "@/lib/payments/receipt";

export type OnlineMethod = "CARD_ONLINE" | "SBP";

/** Данные для электронного чека (54-ФЗ), если чеки формирует платёжный сервис. */
export type ReceiptInput = { email: string | null; phone: string | null; lines: ReceiptLine[] };

export type CreatePaymentInput = {
  orderId: string;
  orderNumber: number;
  /** Сумма в копейках. */
  amount: number;
  method: OnlineMethod;
  returnUrl: string;
  description: string;
  /** Ключ идемпотентности: повтор запроса не создаст второй платёж. */
  idempotenceKey: string;
  /** Чек: передаётся, только если включены чеки через сервис (YOOKASSA_RECEIPTS=true). */
  receipt?: ReceiptInput;
};

export type CreatedPayment = { paymentId: string; confirmationUrl: string };

export type PaymentStatus = "pending" | "waiting_for_capture" | "succeeded" | "canceled";

/** Состояние платежа, полученное от сервиса напрямую (источник правды). */
export type PaymentSnapshot = {
  id: string;
  status: PaymentStatus;
  /** Копейки. */
  amount: number;
  currency: string;
  orderId: string | null;
};

/** Уведомление, прошедшее проверку подлинности. */
export type VerifiedNotification = {
  /** Уникален для пары «платёж + событие»: повтор того же уведомления распознаётся. */
  eventId: string;
  event: string;
  paymentId: string;
  payload: unknown;
};

export interface PaymentProvider {
  readonly name: "mock" | "yookassa";
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>;
  fetchPayment(paymentId: string): Promise<PaymentSnapshot>;
  /** Проверяет подлинность уведомления. null — уведомление поддельное или чужое. */
  verifyNotification(request: Request, rawBody: string): Promise<VerifiedNotification | null>;
}

export function toMinorUnits(value: string): number {
  const [rub, kop = ""] = value.split(".");
  return Number(rub) * 100 + Number((kop + "00").slice(0, 2));
}

export function toMajorString(kopecks: number): string {
  return (kopecks / 100).toFixed(2);
}
