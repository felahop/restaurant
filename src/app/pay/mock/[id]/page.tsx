import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { FlaskConical } from "lucide-react";
import { formatRub } from "@/lib/money";
import { db } from "@/server/db";
import { isMockPayments } from "@/server/payments";
import { MockPayButtons } from "./MockPayButtons";

export const metadata: Metadata = { title: "Тестовая оплата", robots: { index: false, follow: false } };

/** Имитация страницы платёжного сервиса. Работает только при PAYMENT_PROVIDER=mock. */
async function MockPayment({ id }: { id: string }) {
  await connection();
  if (!isMockPayments()) notFound();
  const payment = await db.mockPayment.findUnique({ where: { id } });
  if (!payment) notFound();
  const order = await db.order.findUnique({ where: { id: payment.orderId }, select: { number: true } });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 text-sm text-fg-muted">
        <FlaskConical className="size-2.5" aria-hidden="true" />
        Тестовый платёжный сервис · деньги не списываются
      </div>
      <h1 className="text-h2 font-semibold text-fg">Оплата заказа №{order?.number ?? "—"}</h1>
      <p className="text-price font-semibold text-fg tabular-nums">{formatRub(payment.amount)}</p>
      <p className="text-sm text-fg-muted">
        Способ: {payment.method === "SBP" ? "СБП" : "банковская карта"}. Здесь настоящий сервис попросил бы данные
        карты.
      </p>
      {payment.status === "pending" ? (
        <MockPayButtons id={payment.id} />
      ) : (
        <p className="text-base text-fg">Платёж уже обработан: {payment.status}.</p>
      )}
    </div>
  );
}

export default function MockPayPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="theme-light flex min-h-dvh items-center justify-center bg-canvas px-2 py-6">
      <div className="w-full max-w-narrow rounded-card bg-surface p-3 shadow-soft md:p-4">
        <Suspense fallback={<div className="h-30 animate-pulse rounded-card bg-surface-2" />}>
          {params.then(({ id }) => (
            <MockPayment id={id} />
          ))}
        </Suspense>
      </div>
    </main>
  );
}
