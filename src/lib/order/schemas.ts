import { z } from "zod";
import { toE164 } from "@/lib/phone";

/** Входные данные расчёта и оформления. Цен здесь нет: сервер берёт их из базы. */

export const quoteItemSchema = z.object({
  dishId: z.string().min(1).max(64),
  modifierIds: z.array(z.string().min(1).max(64)).max(20).default([]),
  qty: z.number().int().min(1).max(99),
});

export const orderTypeSchema = z.enum(["DELIVERY", "PICKUP"]);
export const paymentMethodSchema = z.enum(["CARD_ONLINE", "SBP", "CARD_ON_DELIVERY", "CASH"]);
export type PaymentMethodValue = z.infer<typeof paymentMethodSchema>;

export const quoteRequestSchema = z.object({
  items: z.array(quoteItemSchema).max(50),
  type: orderTypeSchema,
  addressToken: z.string().max(4000).nullish(),
  promoCode: z.string().trim().max(40).nullish(),
  /** Списать бонусы (сколько — решает сервер: не больше баланса и лимита в процентах). */
  useBonus: z.boolean().default(false),
});
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

const shortText = z.string().trim().max(20).optional();

export const orderRequestSchema = quoteRequestSchema.extend({
  addressDetails: z
    .object({ apartment: shortText, entrance: shortText, floor: shortText, intercom: shortText })
    .optional(),
  when: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("asap") }),
    z.object({ kind: z.literal("slot"), slot: z.iso.datetime() }),
  ]),
  customer: z.object({
    name: z.string().trim().min(1, "Как к вам обращаться?").max(60),
    phone: z
      .string()
      .max(30)
      .refine((v) => toE164(v) !== null, "Проверьте номер телефона: нужно 10 цифр после +7"),
    comment: z.string().trim().max(500).optional(),
    cutlery: z.number().int().min(0).max(20),
    email: z.email("Проверьте почту").max(120).optional(),
  }),
  payment: paymentMethodSchema,
  consent: z.literal(true, { error: "Нужно согласие на обработку персональных данных" }),
});
export type OrderRequest = z.infer<typeof orderRequestSchema>;

export const paymentLabels: Record<PaymentMethodValue, string> = {
  CARD_ONLINE: "Картой онлайн",
  SBP: "СБП",
  CARD_ON_DELIVERY: "Картой при получении",
  CASH: "Наличными",
};

export const ONLINE_METHODS: readonly PaymentMethodValue[] = ["CARD_ONLINE", "SBP"];
