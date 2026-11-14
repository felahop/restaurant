import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/design/contrast";
import { palette, surfaces, type PaletteToken } from "@/design/tokens";

const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");

function cssColor(token: string): string | undefined {
  const m = new RegExp(`--color-${token}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(css);
  return m?.[1]?.toLowerCase();
}

describe("дизайн-токены", () => {
  it("зеркало в tokens.ts совпадает с globals.css", () => {
    for (const [token, hex] of Object.entries(palette)) {
      expect(cssColor(token), token).toBe(hex);
    }
  });

  it("исходная палитра из брифа не изменена", () => {
    expect(palette).toMatchObject({
      ink: "#14110f",
      coal: "#1f1b18",
      ash: "#332d28",
      paper: "#f4ede1",
      sesame: "#a39b90",
      cinnabar: "#d9381e",
      ginger: "#e0a43a",
      matcha: "#7a9a5b",
    });
  });
});

describe("контраст WCAG AA", () => {
  const ratio = (fg: PaletteToken, bg: PaletteToken) => contrastRatio(palette[fg], palette[bg]);

  for (const [name, s] of Object.entries(surfaces)) {
    const backgrounds = [s.canvas, s.surface] as const;
    const texts = [s.fg, s["fg-muted"], s.eyebrow, s.accent, s.success] as const;
    for (const bg of backgrounds) {
      for (const fg of texts) {
        it(`${name}: ${fg} на ${bg} ≥ 4.5`, () => {
          expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
    for (const bg of backgrounds) {
      it(`${name}: обводка полей ${s["line-strong"]} на ${bg} ≥ 3`, () => {
        expect(ratio(s["line-strong"], bg)).toBeGreaterThanOrEqual(3);
      });
    }
  }

  it.each([
    ["white", "cinnabar"],
    ["white", "cinnabar-deep"],
    ["ink", "ginger"],
    ["ink", "matcha"],
    ["ink", "paper"],
    ["paper", "ash"],
    ["sesame", "ash"],
    ["ink", "linen"],
    ["stone", "linen"],
  ] as const)("%s на %s ≥ 4.5", (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
