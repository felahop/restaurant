import "server-only";
import { MockPaymentProvider } from "./mock";
import type { PaymentProvider } from "./types";
import { YooKassaProvider } from "./yookassa";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** PAYMENT_PROVIDER=yookassa|mock. По умолчанию — заглушка (без ключей платежи не настоящие). */
export function getPaymentProvider(name?: string): PaymentProvider {
  const selected = name ?? process.env.PAYMENT_PROVIDER ?? "mock";
  if (selected === "yookassa") {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secret = process.env.YOOKASSA_SECRET_KEY;
    if (!shopId || !secret) throw new Error("Для ЮKassa задайте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY");
    return new YooKassaProvider(shopId, secret, process.env.YOOKASSA_CHECK_IP !== "false");
  }
  return new MockPaymentProvider(siteUrl());
}

export function isMockPayments(): boolean {
  return (process.env.PAYMENT_PROVIDER ?? "mock") === "mock";
}

export type { PaymentProvider } from "./types";
