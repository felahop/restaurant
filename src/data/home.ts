/**
 * Тексты главной. ВСЁ — демо (TODO): тексты вымышленные, фото пока нет (image: null → заглушка).
 * Чтобы поставить фото, положите файл в public/images/ и укажите { src: "/images/…", alt: "…" }.
 * Акции, баннеры и отзывы хранятся в базе и редактируются в админ-панели (Маркетинг, Отзывы).
 */
import type { FrameImage } from "@/components/site/PhotoFrame";

export const hero = {
  eyebrow: "Паназиатская кухня · угли и вок",
  title: "Горячее с\u00A0открытого огня",
  lead: "Рамен на бульоне, который варится 12 часов, вок за полторы минуты и бао ручной лепки. Привезём горячим или ждём в зале.",
  /** 16:9 на десктопе, 4:5 на телефоне — кадрируется автоматически (object-cover). */
  image: null as FrameImage,
};

export const hitsIntro = {
  eyebrow: "С открытого огня",
  title: "Хиты",
  lead: "Четыре блюда, ради которых возвращаются. Добавляйте в корзину прямо отсюда.",
};

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

export const reviewsIntro = {
  eyebrow: "Отзывы",
  title: "Что говорят гости",
};

