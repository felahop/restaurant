import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { AdminAccessError, assertAdmin } from "@/server/admin/auth";
import { isSameOrigin, jsonError } from "@/server/http";
import { getStorage } from "@/server/storage";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Загрузка фото блюда или акции. Браузер уже обрезал кадр до 4:3; здесь — поворот по EXIF,
 * приведение к 1600×1200, сжатие в WebP и удаление метаданных (EXIF с геометкой не сохраняется).
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Запрос с другого сайта");
  try {
    await assertAdmin("menu");
  } catch (e) {
    if (e instanceof AdminAccessError) return jsonError(401, e.message);
    throw e;
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError(400, "Файл не получен");
  if (!ALLOWED.includes(file.type)) return jsonError(415, "Нужна картинка JPEG, PNG, WebP или AVIF");
  if (file.size > MAX_BYTES) return jsonError(413, "Файл больше 10 МБ");

  const folder = form?.get("folder") === "promotions" ? "promotions" : "dishes";
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const output = await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(1600, 1200, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
    const url = await getStorage().put(`${folder}/${randomUUID()}.webp`, output, "image/webp");
    return Response.json({ url }, { status: 201 });
  } catch (e) {
    console.error("[upload]", e);
    return jsonError(422, "Не получилось обработать картинку. Попробуйте другой файл.");
  }
}
