/**
 * Создать или обновить сотрудника админ-панели из командной строки:
 *   ADMIN_PASSWORD='…' npm run admin:create -- <логин> "<Имя>" [OWNER|MANAGER]
 * Пароль берётся из переменной ADMIN_PASSWORD, чтобы не оставлять его в истории команд.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword, passwordProblem } from "../src/server/admin/password";

async function main() {
  const [login, name, roleArg = "MANAGER"] = process.argv.slice(2);
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!login || !name) throw new Error('Использование: ADMIN_PASSWORD=… npm run admin:create -- login "Имя" [OWNER|MANAGER]');
  const role = roleArg === "OWNER" ? "OWNER" : "MANAGER";
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const passwordHash = await hashPassword(password);
  await prisma.adminUser.upsert({
    where: { login },
    create: { login, name, role, passwordHash },
    update: { name, role, passwordHash, isActive: true },
  });
  await prisma.$disconnect();
  console.log(`Готово: ${login} (${role})`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
