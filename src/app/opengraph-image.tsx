import { ImageResponse } from "next/og";
import { restaurant } from "@/config/restaurant";
import { palette } from "@/design/tokens";
import { brandFonts, KanjiBackdrop, Seal } from "@/server/brand-image";

export const alt = `${restaurant.name} — ${restaurant.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Шрифты читаются один раз при сборке (как в примере документации Next.js).
const fonts = await brandFonts();

/** Картинка для ссылок в мессенджерах и соцсетях: собирается при сборке из фирменных шрифтов и печати. */
export default async function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: palette.ink,
        color: palette.paper,
        position: "relative",
        fontFamily: "Golos Text",
      }}
    >
      <KanjiBackdrop size={620} />
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Seal size={96} />
        <span style={{ fontFamily: "Dela Gothic One", fontSize: 56 }}>{restaurant.name}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 860 }}>
        <span
          style={{ fontSize: 22, fontWeight: 600, letterSpacing: 3, color: palette.ginger, textTransform: "uppercase" }}
        >
          Доставка и бронь · {restaurant.city}
        </span>
        <span style={{ fontFamily: "Dela Gothic One", fontSize: 76, lineHeight: 1.05 }}>Горячее с открытого огня</span>
        <span style={{ fontSize: 30, color: palette.sesame }}>{restaurant.tagline}</span>
      </div>
    </div>,
    { ...size, fonts },
  );
}
