import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { MockPaymentProvider } from "@/server/payments/mock";
import { bonusForOrder, processPaymentNotification } from "@/server/payments/process";

const provider = new MockPaymentProvider("http://localhost");
const created = { users: [] as string[], orders: [] as string[], payments: [] as string[] };

async function makeOrder(opts: { total?: number; withUser?: boolean } = {}) {
  const user = opts.withUser
    ? await db.user.create({ data: { phone: `+7999${randomBytes(4).readUInt32BE() % 10_000_000}`.padEnd(12, "0") } })
    : null;
  if (user) created.users.push(user.id);
  const total = opts.total ?? 138_000;
  const order = await db.order.create({
    data: {
      publicToken: randomBytes(24).toString("base64url"),
      type: "PICKUP",
      status: "AWAITING_PAYMENT",
      customerName: "Тест",
      customerPhone: "+79990000000",
      subtotal: total,
      deliveryFee: 0,
      total,
      paymentMethod: "CARD_ONLINE",
      paymentStatus: "PENDING",
      consentAt: new Date(),
      userId: user?.id ?? null,
    },
  });
  created.orders.push(order.id);
  return { order, user };
}

async function makePayment(orderId: string, amount: number, status: "succeeded" | "canceled") {
  const id = `mock_test_${randomBytes(8).toString("hex")}`;
  await db.mockPayment.create({
    data: { id, orderId, amount, method: "CARD_ONLINE", status, returnUrl: "http://localhost" },
  });
  await db.order.update({ where: { id: orderId }, data: { paymentId: id, paymentProvider: "mock" } });
  created.payments.push(id);
  return id;
}

const notice = (paymentId: string, event = "payment.succeeded", suffix = "") => ({
  eventId: `${event}:${paymentId}${suffix}`,
  event,
  paymentId,
  payload: { event, object: { id: paymentId } },
});

beforeAll(async () => {
  await db.settings.findUniqueOrThrow({ where: { id: 1 } }); // сид должен быть применён
});

afterAll(async () => {
  await db.paymentEvent.deleteMany({ where: { paymentId: { in: created.payments } } });
  await db.mockPayment.deleteMany({ where: { id: { in: created.payments } } });
  await db.bonusTransaction.deleteMany({ where: { orderId: { in: created.orders } } });
  await db.order.deleteMany({ where: { id: { in: created.orders } } });
  await db.user.deleteMany({ where: { id: { in: created.users } } });
  await db.$disconnect();
});

describe("уведомления об оплате", () => {
  it("заказ становится оплаченным только по уведомлению, повтор не дублирует ни заказ, ни бонусы", async () => {
    const { order, user } = await makeOrder({ withUser: true });
    const paymentId = await makePayment(order.id, order.total, "succeeded");
    const ordersBefore = await db.order.count();

    const first = await processPaymentNotification(provider, notice(paymentId));
    expect(first).toMatchObject({ result: "paid", firstTime: true });

    // То же уведомление пришло ещё раз — ничего не меняется.
    const second = await processPaymentNotification(provider, notice(paymentId));
    expect(second).toEqual({ result: "duplicate" });

    // Другое событие по тому же платежу — заказ уже оплачен, бонусы второй раз не начисляются.
    const third = await processPaymentNotification(provider, notice(paymentId, "payment.succeeded", "#retry"));
    expect(third).toMatchObject({ result: "paid", firstTime: false });

    const paid = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paid).toMatchObject({ status: "ACCEPTED", paymentStatus: "SUCCEEDED", paymentProvider: "mock" });
    expect(paid.paidAt).not.toBeNull();
    expect(await db.order.count()).toBe(ordersBefore);

    const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
    const expectedBonus = bonusForOrder(order, settings.bonusEarnPercent);
    expect(expectedBonus).toBeGreaterThan(0);
    const bonuses = await db.bonusTransaction.findMany({ where: { orderId: order.id } });
    expect(bonuses).toHaveLength(1);
    expect(bonuses[0]?.amount).toBe(expectedBonus);
    expect((await db.user.findUniqueOrThrow({ where: { id: user!.id } })).bonusBalance).toBe(expectedBonus);
    expect(await db.paymentEvent.count({ where: { paymentId } })).toBe(2);
  });

  it("параллельные одинаковые уведомления обрабатываются один раз", async () => {
    const { order, user } = await makeOrder({ withUser: true });
    const paymentId = await makePayment(order.id, order.total, "succeeded");
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        processPaymentNotification(provider, notice(paymentId, "payment.succeeded", `#${i}`)),
      ),
    );
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    const firstTimes = results.filter(
      (r) => r.status === "fulfilled" && r.value.result === "paid" && r.value.firstTime,
    );
    expect(firstTimes).toHaveLength(1);
    expect(await db.bonusTransaction.count({ where: { orderId: order.id } })).toBe(1);
    const u = await db.user.findUniqueOrThrow({ where: { id: user!.id } });
    expect(u.bonusBalance).toBe(bonusForOrder(order, 5));
  });

  it("сумма платежа не совпадает с заказом — заказ не помечается оплаченным", async () => {
    const { order } = await makeOrder();
    const paymentId = await makePayment(order.id, order.total - 100, "succeeded");
    const res = await processPaymentNotification(provider, notice(paymentId));
    expect(res).toMatchObject({ result: "ignored" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PENDING");
  });

  it("отменённый платёж: заказ ждёт новую попытку оплаты", async () => {
    const { order } = await makeOrder();
    const paymentId = await makePayment(order.id, order.total, "canceled");
    const res = await processPaymentNotification(provider, notice(paymentId, "payment.canceled"));
    expect(res).toMatchObject({ result: "canceled" });
    const o = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(o).toMatchObject({ status: "AWAITING_PAYMENT", paymentStatus: "CANCELED" });
  });

  it("статус берётся у сервиса, а не из тела уведомления", async () => {
    const { order } = await makeOrder();
    // В базе сервиса платёж ещё pending, а «уведомление» утверждает succeeded.
    const id = `mock_test_${randomBytes(8).toString("hex")}`;
    await db.mockPayment.create({
      data: { id, orderId: order.id, amount: order.total, method: "SBP", status: "pending", returnUrl: "x" },
    });
    created.payments.push(id);
    const res = await processPaymentNotification(provider, notice(id));
    expect(res).toMatchObject({ result: "ignored" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("AWAITING_PAYMENT");
  });
});
