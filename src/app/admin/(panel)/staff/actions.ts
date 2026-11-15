"use server";

import { z } from "zod";
import { fail, ok, zodFields, type ActionResult } from "@/lib/admin/result";
import { guardAction } from "@/server/admin/guard";
import { hashPassword, passwordProblem } from "@/server/admin/password";
import { db } from "@/server/db";

const staffSchema = z.object({
  login: z.string().trim().min(3, "Логин — от 3 символов").max(32).regex(/^[a-z0-9._-]+$/i, "Латиница, цифры, точка, дефис"),
  name: z.string().trim().min(2).max(60),
  role: z.enum(["OWNER", "MANAGER"]),
  password: z.string().max(200),
});

export async function createStaffAction(input: z.input<typeof staffSchema>): Promise<ActionResult> {
  const g = await guardAction("staff");
  if ("denied" in g) return g.denied;
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Проверьте поля", zodFields(parsed.error.issues));
  const problem = passwordProblem(parsed.data.password);
  if (problem) return fail(problem, { password: problem });
  if (await db.adminUser.findUnique({ where: { login: parsed.data.login } })) return fail("Такой логин уже есть", { login: "Занят" });
  const { password, ...rest } = parsed.data;
  await db.adminUser.create({ data: { ...rest, passwordHash: await hashPassword(password) } });
  return ok("Сотрудник добавлен");
}

export async function updateStaffAction(id: string, input: { role: "OWNER" | "MANAGER"; isActive: boolean }): Promise<ActionResult> {
  const g = await guardAction("staff");
  if ("denied" in g) return g.denied;
  if (id === g.admin.id) return fail("Свою роль и доступ менять нельзя — попросите другого владельца");
  const role = input.role === "OWNER" ? "OWNER" : "MANAGER";
  if (!input.isActive || role !== "OWNER") {
    const owners = await db.adminUser.count({ where: { role: "OWNER", isActive: true, id: { not: id } } });
    if (owners === 0) return fail("Должен остаться хотя бы один активный владелец");
  }
  await db.$transaction([
    db.adminUser.update({ where: { id }, data: { role, isActive: Boolean(input.isActive) } }),
    // Выключенный сотрудник сразу теряет доступ.
    ...(input.isActive ? [] : [db.adminSession.deleteMany({ where: { adminUserId: id } })]),
  ]);
  return ok("Сохранено");
}

export async function resetStaffPasswordAction(id: string, password: string): Promise<ActionResult> {
  const g = await guardAction("staff");
  if ("denied" in g) return g.denied;
  const problem = passwordProblem(password);
  if (problem) return fail(problem);
  await db.$transaction([
    db.adminUser.update({ where: { id }, data: { passwordHash: await hashPassword(password) } }),
    db.adminSession.deleteMany({ where: { adminUserId: id } }),
  ]);
  return ok("Пароль изменён, сотрудник войдёт заново");
}
