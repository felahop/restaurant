"use server";

import { z } from "zod";
import { fail, ok, zodFields, type ActionResult } from "@/lib/admin/result";
import type { CartLine } from "@/lib/cart/core";
import { repeatOrderLines } from "@/server/account";
import { getUser } from "@/server/auth/user";
import { db } from "@/server/db";

const profileSchema = z.object({
  name: z.string().trim().max(60),
  email: z.union([z.literal(""), z.email("Проверьте почту").max(120)]),
});

export async function saveProfileAction(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Войдите заново");
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail("Проверьте поля", zodFields(parsed.error.issues));
  await db.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name || null, email: parsed.data.email || null },
  });
  return ok("Сохранили");
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Войдите заново");
  await db.address.deleteMany({ where: { id, userId: user.id } });
  return ok("Адрес удалён");
}

export async function repeatOrderAction(orderId: string): Promise<ActionResult<{ lines: CartLine[]; skipped: string[] }>> {
  const user = await getUser();
  if (!user) return fail("Войдите заново");
  const res = await repeatOrderLines(user.id, orderId);
  if (!res) return fail("Заказ не найден");
  if (!res.lines.length) return fail("Этих блюд сейчас нет в меню");
  return ok(undefined, res);
}
