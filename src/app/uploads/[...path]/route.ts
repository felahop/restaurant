import { connection } from "next/server";
import { readLocalUpload } from "@/server/storage";

const TYPES: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", avif: "image/avif" };

/** Раздача загруженных фото из локальной папки (STORAGE_DRIVER=local). Имена файлов уникальны — кэш навсегда. */
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  await connection();
  const { path } = await params;
  const data = await readLocalUpload(path);
  if (!data) return new Response("Not found", { status: 404 });
  const ext = path.at(-1)?.split(".").pop()?.toLowerCase() ?? "";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
