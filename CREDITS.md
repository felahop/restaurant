# Источники и лицензии

## Шрифты

| Шрифт | Где используется | Лицензия |
|---|---|---|
| Dela Gothic One | крупные заголовки | SIL Open Font License 1.1 |
| Golos Text | текст и интерфейс | SIL Open Font License 1.1 |
| Noto Serif JP (подмножество 600) | декоративные иероглифы и знак 炭 в печати | SIL Open Font License 1.1 |

Dela Gothic One и Golos Text подключаются через `next/font/google`: файлы скачиваются при сборке и раздаются с нашего домена.

Noto Serif JP хранится локально в `src/fonts/noto-serif-jp-kanji-600.woff2` — это подмножество из 24 знаков
(炭火麺鍋味旬宴道縁食店包点心巻辛甘酒茶家餃飯湯煙), 8 КБ. Чтобы добавить знак, скачайте подмножество заново:

```
https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@600&text=<все нужные знаки>
```

Иероглиф 炭 в печати-ханко (`src/components/brand/Hanko.tsx`) — контур глифа Noto Serif JP 600.

## Иконки

- [Lucide](https://lucide.dev) — интерфейсные иконки, лицензия ISC.
- [Simple Icons](https://simpleicons.org) — значки Telegram, WhatsApp, ВКонтакте, лицензия CC0 1.0.
  Товарные знаки принадлежат их владельцам.

## Фото

Пока фото нет: вместо них заглушки в палитре сайта с названием блюда.
Список фото со свободной лицензией появится здесь на этапе 2.
