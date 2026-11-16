/**
 * Демо-данные ресторана. ВСЁ в этом файле вымышленное и подлежит замене (TODO).
 *
 * На этапе 3 эти значения станут начальным наполнением таблицы Settings,
 * после чего владелец меняет их в админ-панели (/admin/settings) без программиста.
 * Деньги — в копейках.
 */

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** Интервал работы в формате "HH:MM". Закрытие после полуночи допустимо: ["12:00", "02:00"]. */
export type OpeningInterval = { open: string; close: string };

export const restaurant = {
  name: "Сумиби", // TODO: название ресторана
  nameLatin: "Sumibi", // TODO
  tagline: "Паназиатская кухня на углях и воке", // TODO
  description:
    "Рамен на костном бульоне, вок с открытого огня, бао и димсамы ручной лепки. Готовим при вас и привозим горячим.", // TODO
  legalName: "ООО «Демо Ресторан»", // TODO: юрлицо для оферты и подвала
  inn: "0000000000", // TODO

  city: "Москва", // TODO
  /** Код страны для разметки schema.org (RU, KZ…). */
  country: "RU", // TODO при смене страны
  /** Кухни для разметки schema.org (servesCuisine). */
  cuisines: ["Паназиатская", "Японская", "Китайская", "Рамен", "Вок"], // TODO
  address: {
    full: "Москва, Чистопрудный бульвар, 99", // TODO: адрес вымышленный
    short: "Чистопрудный бульвар, 99", // TODO
    metro: "Чистые пруды, 4 минуты пешком", // TODO
    parking: "Городская платная парковка вдоль бульвара, первые 15 минут бесплатно.", // TODO
    /** Координаты для карты и расчёта зон. TODO: заменить на точку ресторана. */
    lat: 55.7647,
    lng: 37.6406,
  },
  /** Часовой пояс ресторана: от него считаются часы работы и время заказа. */
  timezone: "Europe/Moscow", // TODO при смене города

  contacts: {
    phoneDisplay: "+7 (495) 000-00-00", // TODO
    phoneE164: "+74950000000", // TODO
    email: "hello@example.com", // TODO
    telegram: "https://t.me/sumibi_demo", // TODO
    whatsapp: "https://wa.me/74950000000", // TODO
    vk: "https://vk.com/sumibi_demo", // TODO
  },

  /** Часы работы зала и кухни. */
  hours: {
    mon: [{ open: "11:00", close: "23:00" }],
    tue: [{ open: "11:00", close: "23:00" }],
    wed: [{ open: "11:00", close: "23:00" }],
    thu: [{ open: "11:00", close: "23:00" }],
    fri: [{ open: "11:00", close: "00:00" }],
    sat: [{ open: "12:00", close: "00:00" }],
    sun: [{ open: "12:00", close: "23:00" }],
  } satisfies Record<WeekdayKey, OpeningInterval[]>, // TODO
  /** Часы для вывода на сайте, по строке на группу дней. */
  hoursLines: ["Пн–Чт 11:00–23:00", "Пт 11:00–00:00", "Сб 12:00–00:00", "Вс 12:00–23:00"], // TODO

  /** Часы приёма заказов на доставку и самовывоз: кухня закрывается за 30 минут до зала. */
  orderHours: {
    mon: [{ open: "11:00", close: "22:30" }],
    tue: [{ open: "11:00", close: "22:30" }],
    wed: [{ open: "11:00", close: "22:30" }],
    thu: [{ open: "11:00", close: "22:30" }],
    fri: [{ open: "11:00", close: "23:30" }],
    sat: [{ open: "12:00", close: "23:30" }],
    sun: [{ open: "12:00", close: "22:30" }],
  } satisfies Record<WeekdayKey, OpeningInterval[]>, // TODO

  delivery: {
    minOrder: 90_000, // 900 ₽ — TODO
    freeFrom: 250_000, // 2 500 ₽ — TODO
    etaMinutes: { from: 35, to: 60 }, // TODO
  },

  /** Бонусы: меняются в админ-панели. */
  bonus: {
    earnPercent: 5, // начисление от оплаченного заказа
    maxSpendPercent: 30, // максимум суммы блюд, который можно оплатить бонусами
  },

  /** Заказ ко времени. */
  scheduling: {
    stepMinutes: 15,
    leadMinutes: 45,
    daysAhead: 2, // сегодня и завтра
  },
} as const;

export type RestaurantConfig = typeof restaurant;
