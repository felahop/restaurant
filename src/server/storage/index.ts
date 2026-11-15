import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/** Хранилище файлов: локальная папка (разработка, один сервер) или S3-совместимое (Yandex Object Storage и др.). */
export interface FileStorage {
  put(key: string, body: Buffer, contentType: string): Promise<string>;
}

/**
 * Папка загрузок задаётся во время работы (UPLOAD_DIR), поэтому сборщику не нужно отслеживать её содержимое:
 * комментарии turbopackIgnore не дают ему утащить весь проект в серверную сборку.
 */
export function uploadDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./uploads");
}

class LocalStorage implements FileStorage {
  async put(key: string, body: Buffer): Promise<string> {
    const file = path.join(/*turbopackIgnore: true*/ uploadDir(), key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    return `/uploads/${key}`;
  }
}

class S3Storage implements FileStorage {
  private client: S3Client;
  constructor(
    private readonly bucket: string,
    private readonly publicUrl: string,
  ) {
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || undefined,
      region: process.env.S3_REGION || "ru-central1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
    });
  }
  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${this.publicUrl.replace(/\/$/, "")}/${key}`;
  }
}

export function getStorage(): FileStorage {
  if (process.env.STORAGE_DRIVER === "s3") {
    const bucket = process.env.S3_BUCKET;
    const publicUrl = process.env.S3_PUBLIC_URL;
    if (!bucket || !publicUrl) throw new Error("Для S3 задайте S3_BUCKET и S3_PUBLIC_URL");
    return new S3Storage(bucket, publicUrl);
  }
  return new LocalStorage();
}

/** Чтение локального файла для маршрута /uploads/… с защитой от выхода за пределы папки. */
export async function readLocalUpload(parts: string[]): Promise<Buffer | null> {
  if (parts.some((p) => !/^[A-Za-z0-9._-]+$/.test(p) || p === ".." || p === ".")) return null;
  const root = uploadDir();
  const file = path.join(/*turbopackIgnore: true*/ root, ...parts);
  if (!file.startsWith(root + path.sep)) return null;
  try {
    return await readFile(file);
  } catch {
    return null;
  }
}
