// Конфигурация Prisma ORM 7 (имя prisma7.config.ts — по документации 7.10+, чтобы не путать с форматом Prisma 8).
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
