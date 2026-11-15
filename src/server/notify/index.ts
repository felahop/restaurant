import "server-only";
import { formatRub } from "@/lib/money";

/**
 * Уведомления ресторану о новых заказах и бронях. Сменный модуль: Telegram или вывод в лог.
 * В сообщения не попадают персональные данные гостя (имя, телефон, адрес) — только номер, сумма и ссылка
 * в админ-панель: так уведомление не становится передачей персональных данных третьей стороне.
 */

export type OrderNotice = {
  number: number;
  type: "DELIVERY" | "PICKUP";
  total: number;
  paymentLabel: string;
  whenLabel: string;
  itemsCount: number;
  adminUrl: string;
};

export type ReservationNotice = { whenLabel: string; guests: number; adminUrl: string };

export interface Notifier {
  newOrder(n: OrderNotice): Promise<void>;
  newReservation(n: ReservationNotice): Promise<void>;
}

function orderText(n: OrderNotice) {
  const kind = n.type === "DELIVERY" ? "Доставка" : "Самовывоз";
  return [
    `🔥 Новый заказ №${n.number}`,
    `${kind} · ${n.whenLabel}`,
    `${n.itemsCount} поз. · ${formatRub(n.total)} · ${n.paymentLabel}`,
    n.adminUrl,
  ].join("\n");
}

function reservationText(n: ReservationNotice) {
  return [`📅 Новая бронь`, `${n.whenLabel} · гостей: ${n.guests}`, n.adminUrl].join("\n");
}

class ConsoleNotifier implements Notifier {
  async newOrder(n: OrderNotice) {
    console.info(`[notify] ${orderText(n).replace(/\n/g, " | ")}`);
  }
  async newReservation(n: ReservationNotice) {
    console.info(`[notify] ${reservationText(n).replace(/\n/g, " | ")}`);
  }
}

/** Telegram Bot API, метод sendMessage. TODO: проверить на реальном боте, когда появятся токен и чат. */
class TelegramNotifier implements Notifier {
  constructor(
    private readonly token: string,
    private readonly chatId: string,
  ) {}

  private async send(text: string) {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: this.chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Telegram ответил ${res.status}`);
  }

  newOrder(n: OrderNotice) {
    return this.send(orderText(n));
  }
  newReservation(n: ReservationNotice) {
    return this.send(reservationText(n));
  }
}

export function getNotifier(): Notifier {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  return token && chatId ? new TelegramNotifier(token, chatId) : new ConsoleNotifier();
}

/** Уведомление не должно ронять оформление заказа: ошибки только в лог. */
export async function notifySafely(fn: (n: Notifier) => Promise<void>) {
  try {
    await fn(getNotifier());
  } catch (e) {
    console.error("[notify] не удалось отправить уведомление", e);
  }
}
