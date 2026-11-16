import { ImageResponse } from "next/og";
import { palette } from "@/design/tokens";
import { Seal } from "@/server/brand-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Иконка для «На экран Домой» на iPhone и iPad. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: palette.ink,
      }}
    >
      <Seal size={150} />
    </div>,
    size,
  );
}
