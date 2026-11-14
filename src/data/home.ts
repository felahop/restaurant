/**
 * Контент главной до подключения базы и админки. ВСЁ — демо (TODO):
 * тексты, акции и отзывы вымышленные, фото пока нет (image: null → заглушка).
 * Чтобы поставить фото, положите файл в public/images/ и укажите { src: "/images/…", alt: "…" }.
 * Акции и отзывы на этапах 6–7 переедут в базу и будут редактироваться в админ-панели.
 */
import type { FrameImage } from "@/components/site/PhotoFrame";
import { restaurant } from "@/config/restaurant";
import { formatRub } from "@/lib/money";

export const hero = {
  eyebrow: `Паназиатская кухня · ${restaurant.city}`,
  title: "Горячее с\u00A0открытого огня",
  lead: `Рамен на бульоне, который варится 12 часов, вок за полторы минуты и бао ручной лепки. Привезём за ${restaurant.delivery.etaMinutes.from}–${restaurant.delivery.etaMinutes.to} минут или ждём в зале.`,
  /** 16:9 на десктопе, 4:5 на телефоне — кадрируется автоматически (object-cover). */
  image: null as FrameImage,
};

export const hitsIntro = {
  eyebrow: "С открытого огня",
  title: "Хиты",
  lead: "Четыре блюда, ради которых возвращаются. Добавляйте в корзину прямо отсюда.",
};

export type Promotion = {
  id: string;
  badge: string;
  title: string;
  text: string;
  period: string;
  kanji: string;
  cta: { label: string; href: string };
};

export const promotions: Promotion[] = [
  {
    id: "lunch",
    badge: "−20%",
    title: "Обед с огня",
    text: "Любой вок и напиток со скидкой 20\u00A0% — в\u00A0зале и на доставку.",
    period: "Пн–Пт, 12:00–16:00",
    kanji: "鍋",
    cta: { label: "Выбрать вок", href: "/menu" },
  },
  {
    id: "duo",
    badge: "Сет",
    title: "Ужин на двоих",
    text: `Два рамена, бао и шесть димсамов за ${formatRub(299_000)} вместо ${formatRub(356_000)}.`,
    period: "Каждый день после 18:00",
    kanji: "宴",
    cta: { label: "Заказать сет", href: "/menu" },
  },
  {
    id: "bonus",
    badge: "Бонусы",
    title: `${restaurant.bonus.earnPercent}\u00A0% возвращаем бонусами`,
    text: `С каждого оплаченного заказа. Списывайте при следующем — до\u00A0${restaurant.bonus.maxSpendPercent}\u00A0% суммы.`,
    period: "Для гостей с личным кабинетом",
    kanji: "味",
    cta: { label: "Войти по номеру", href: "/account" },
  },
];

export const story = {
  eyebrow: "Наша история",
  title: "Начинали с\u00A0одного вока",
  paragraphs: [
    "В 2019 году у нас была кухня на четыре конфорки, один вок и большая кастрюля бульона, которую мы не выключали всю ночь. Гости приходили на запах.",
    "Теперь у нас открытая кухня и угли бинчотан, но правила те же: бульон варим 12 часов, тесто для бао и димсамов лепим руками каждое утро, вок разогреваем так, чтобы овощи успели обжариться и остались хрусткими.",
  ],
  facts: [
    { value: "12 ч", label: "варим костный бульон" },
    { value: "90 сек", label: "на вок от огня до тарелки" },
    { value: "6 утра", label: "начинаем лепить димсамы" },
  ],
  image: null as FrameImage,
  imageCaption: "Открытая кухня и вок на огне",
};

export type GalleryItem = { id: string; caption: string; kanji: string; image: FrameImage; span?: "wide" | "tall" };

export const gallery: GalleryItem[] = [
  { id: "hall", caption: "Зал вечером", kanji: "宴", image: null, span: "wide" },
  { id: "fire", caption: "Вок на огне", kanji: "火", image: null, span: "tall" },
  { id: "ramen", caption: "Тонкоцу рамен", kanji: "麺", image: null },
  { id: "dimsum", caption: "Лепка димсамов", kanji: "点", image: null },
  { id: "coal", caption: "Угли бинчотан", kanji: "炭", image: null },
  { id: "bao", caption: "Бао на пару", kanji: "包", image: null, span: "tall" },
  { id: "bar", caption: "Бар и саке", kanji: "酒", image: null },
  { id: "tea", caption: "Чай после ужина", kanji: "茶", image: null },
  { id: "gyoza", caption: "Гёдза со сковороды", kanji: "餃", image: null, span: "wide" },
  { id: "soup", caption: "Мисо-суп", kanji: "湯", image: null },
  { id: "terrace", caption: "Веранда летом", kanji: "家", image: null, span: "wide" },
];

export type Review = { id: string; author: string; date: string; rating: 1 | 2 | 3 | 4 | 5; text: string };

export const reviewsIntro = {
  eyebrow: "Отзывы",
  title: "Что говорят гости",
};

export const reviews: Review[] = [
  {
    id: "r1",
    author: "Анна",
    date: "октябрь 2026",
    rating: 5,
    text: "Тонкоцу как в Фукуоке: бульон густой, яйцо идеальное. Привезли за 40 минут, всё горячее.",
  },
  {
    id: "r2",
    author: "Дмитрий",
    date: "сентябрь 2026",
    rating: 5,
    text: "Сидели у открытой кухни и смотрели, как работает вок. Мапо тофу честно острое — спасибо, что предупредили.",
  },
  {
    id: "r3",
    author: "Мария",
    date: "сентябрь 2026",
    rating: 4,
    text: "Бао с грудинкой — любовь. Сет на двоих большой, двоим хватило с запасом. Хочется ещё десертов в меню.",
  },
];
