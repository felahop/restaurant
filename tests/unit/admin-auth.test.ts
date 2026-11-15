import { describe, expect, it } from "vitest";
import { hashPassword, passwordProblem, verifyPassword } from "@/server/admin/password";
import { canAccess } from "@/server/admin/roles";

describe("пароли сотрудников", () => {
  it("хэш проверяется и не совпадает с другим паролем", async () => {
    const hash = await hashPassword("Огонь-2026-кухня");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("Огонь-2026-кухня", hash)).toBe(true);
    expect(await verifyPassword("огонь-2026-кухня", hash)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });

  it("соль у каждого хэша своя", async () => {
    expect(await hashPassword("pass12345678")).not.toBe(await hashPassword("pass12345678"));
  });

  it("требования к паролю", () => {
    expect(passwordProblem("short1")).toMatch(/не короче/);
    expect(passwordProblem("onlyletterspass")).toMatch(/цифры/);
    expect(passwordProblem("kitchen2026tablet")).toBeNull();
  });
});

describe("роли", () => {
  it("менеджер: заказы, меню, брони", () => {
    expect(canAccess("MANAGER", "orders")).toBe(true);
    expect(canAccess("MANAGER", "menu")).toBe(true);
    expect(canAccess("MANAGER", "reservations")).toBe(true);
    for (const s of ["settings", "analytics", "marketing", "delivery", "staff", "reviews"] as const) {
      expect(canAccess("MANAGER", s)).toBe(false);
    }
  });
  it("владелец: всё", () => {
    expect(canAccess("OWNER", "settings")).toBe(true);
    expect(canAccess("OWNER", "staff")).toBe(true);
  });
});
