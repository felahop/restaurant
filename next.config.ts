import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка для сервера (Dockerfile задаёт BUILD_STANDALONE=1): .next/standalone с минимальным набором файлов.
  // Локально остаётся обычная сборка, чтобы работал `npm start`.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [{ pathname: "/uploads/**" }, { pathname: "/images/**" }],
    // Фото из S3-хранилища (STORAGE_DRIVER=s3): разрешаем домен из S3_PUBLIC_URL.
    remotePatterns: process.env.S3_PUBLIC_URL ? [new URL(`${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/**`)] : [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
