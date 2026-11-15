import { describe, expect, it } from "vitest";
import { canTransition, nextStatus, statusLabel } from "@/lib/order/status";

describe("статусы заказа", () => {
  it("следующий шаг для доставки и самовывоза", () => {
    expect(nextStatus("ACCEPTED", "DELIVERY")).toBe("COOKING");
    expect(nextStatus("COOKING", "DELIVERY")).toBe("DELIVERING");
    expect(nextStatus("COOKING", "PICKUP")).toBe("READY");
    expect(nextStatus("COMPLETED", "PICKUP")).toBeNull();
    expect(nextStatus("AWAITING_PAYMENT", "PICKUP")).toBeNull();
  });

  it("только вперёд или отмена", () => {
    expect(canTransition("ACCEPTED", "COMPLETED", "DELIVERY")).toBe(true);
    expect(canTransition("COOKING", "ACCEPTED", "DELIVERY")).toBe(false);
    expect(canTransition("COOKING", "READY", "DELIVERY")).toBe(false);
    expect(canTransition("COMPLETED", "CANCELED", "DELIVERY")).toBe(false);
    expect(canTransition("AWAITING_PAYMENT", "COOKING", "DELIVERY")).toBe(false);
    expect(canTransition("AWAITING_PAYMENT", "CANCELED", "DELIVERY")).toBe(true);
  });

  it("подписи", () => {
    expect(statusLabel("COMPLETED", "DELIVERY")).toBe("Доставлен");
    expect(statusLabel("COMPLETED", "PICKUP")).toBe("Выдан");
  });
});
