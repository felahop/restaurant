import { describe, expect, it } from "vitest";
import { alertAt, isOrderDue } from "@/lib/order/preorder";

describe("сигнал о предзаказе", () => {
  const now = new Date("2026-11-16T07:00:00Z"); // 10:00 по Москве

  it("заказ «как можно скорее» — сразу", () => {
    expect(isOrderDue({ status: "ACCEPTED", scheduledFor: null }, 120, now)).toBe(true);
  });

  it("предзаказ — за 2 часа до времени, не раньше", () => {
    expect(isOrderDue({ status: "ACCEPTED", scheduledFor: "2026-11-16T09:00:00Z" }, 120, now)).toBe(true); // к 12:00
    expect(isOrderDue({ status: "ACCEPTED", scheduledFor: "2026-11-16T09:01:00Z" }, 120, now)).toBe(false);
    expect(isOrderDue({ status: "ACCEPTED", scheduledFor: "2026-11-17T09:00:00Z" }, 120, now)).toBe(false); // завтра
    expect(alertAt("2026-11-16T09:00:00Z", 120).toISOString()).toBe("2026-11-16T07:00:00.000Z");
  });

  it("неоплаченный и отменённый заказ не тревожат кухню", () => {
    expect(isOrderDue({ status: "AWAITING_PAYMENT", scheduledFor: null }, 120, now)).toBe(false);
    expect(isOrderDue({ status: "CANCELED", scheduledFor: null }, 120, now)).toBe(false);
  });
});
