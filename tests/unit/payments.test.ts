import { describe, expect, it } from "vitest";
import { ipInAny, ipInCidr } from "@/server/payments/ip";
import { toMajorString, toMinorUnits } from "@/server/payments/types";

const YOOKASSA = [
  "185.71.76.0/27",
  "185.71.77.0/27",
  "77.75.153.0/25",
  "77.75.156.11",
  "77.75.156.35",
  "77.75.154.128/25",
  "2a02:5180::/32",
];

describe("IP-адреса уведомлений ЮKassa", () => {
  it("принимает адреса из списка", () => {
    expect(ipInAny("185.71.76.5", YOOKASSA)).toBe(true);
    expect(ipInAny("77.75.156.11", YOOKASSA)).toBe(true);
    expect(ipInAny("77.75.154.200", YOOKASSA)).toBe(true);
    expect(ipInAny("2a02:5180:0:1::5", YOOKASSA)).toBe(true);
    expect(ipInAny("::ffff:185.71.77.10", YOOKASSA)).toBe(true);
  });
  it("отклоняет остальные", () => {
    expect(ipInAny("185.71.76.40", YOOKASSA)).toBe(false);
    expect(ipInAny("77.75.156.12", YOOKASSA)).toBe(false);
    expect(ipInAny("127.0.0.1", YOOKASSA)).toBe(false);
    expect(ipInAny("2a03::1", YOOKASSA)).toBe(false);
    expect(ipInCidr("not-an-ip", "10.0.0.0/8")).toBe(false);
  });
});

describe("суммы для платёжного сервиса", () => {
  it("копейки ↔ строка с двумя знаками", () => {
    expect(toMajorString(219_300)).toBe("2193.00");
    expect(toMajorString(5)).toBe("0.05");
    expect(toMinorUnits("2193.00")).toBe(219_300);
    expect(toMinorUnits("10.5")).toBe(1050);
    expect(toMinorUnits("7")).toBe(700);
  });
});
