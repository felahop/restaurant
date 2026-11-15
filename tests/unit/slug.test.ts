import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it.each([
    ["Вок с говядиной и чёрным перцем", "vok-s-govyadinoy-i-chernym-pertsem"],
    ["Тонкоцу рамен", "tonkotsu-ramen"],
    ["Хар гоу с креветкой", "khar-gou-s-krevetkoy"],
    ["Бабл-ти (600 мл)!", "babl-ti-600-ml"],
    ["Café Latte", "cafe-latte"],
    ["Қазы", "kazy"],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});
