import "server-only";

/**
 * Отправка SMS — сменный модуль. Сейчас есть только демо-режим (каркас): SMS не отправляются,
 * код показывается на экране входа. Подключение сервиса: добавьте класс с методом send()
 * (например, для SMSC, SMS.ru, Mobizon — по их документации) и верните его из getSms() для SMS_PROVIDER=<имя>.
 */
export interface SmsProvider {
  readonly name: string;
  send(phoneE164: string, text: string): Promise<void>;
}

class DemoSms implements SmsProvider {
  readonly name = "demo";
  async send(phoneE164: string) {
    // Телефон в лог — только последние цифры.
    console.info(`[sms:demo] код входа для …${phoneE164.slice(-4)} не отправлен — демо-режим`);
  }
}

export function smsProviderName(): string {
  return process.env.SMS_PROVIDER || "demo";
}

/**
 * Демо-режим допустим при разработке или явно (ALLOW_DEMO_SMS=true — для показа и автотестов).
 * В продакшене без SMS-сервиса вход по коду выключен: иначе войти в чужой кабинет мог бы кто угодно.
 */
export function demoSmsAllowed(): boolean {
  return smsProviderName() === "demo" && (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_SMS === "true");
}

export function getSms(): SmsProvider | null {
  const name = smsProviderName();
  if (name === "demo") return demoSmsAllowed() ? new DemoSms() : null;
  // TODO: реальный SMS-сервис. До подключения вход по коду недоступен.
  return null;
}
