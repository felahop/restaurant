# Сумиби — сайт ресторана с доставкой

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4. Подробный README с базой, оплатой и выкладкой — на этапе 8.

## Быстрый старт

```bash
npm install                  # заодно сгенерирует Prisma Client (postinstall)
cp .env.example .env         # DATABASE_URL и прочие переменные
docker compose up -d         # PostgreSQL 16 на localhost:5432
npm run db:migrate           # применить миграции
npm run db:seed              # демо-меню: 6 категорий, 30 блюд, добавки; настройки ресторана
npm run dev                  # http://localhost:3000, витрина компонентов — /styleguide
```

Полный сброс базы с демо-данными: `npm run db:reset`. Повторный `db:seed` безопасен: записи обновляются по slug,
настройки, изменённые в админке, не затираются.

## Оформление заказа и доставка

- Суммы, скидки и доставку считает сервер (`src/lib/order/calc.ts`) по ценам из базы. Браузер присылает только id блюд,
  добавок и количество.
- Адрес: подсказки и координаты через сменный модуль (`src/server/geo`): Яндекс (Геосаджест + Геокодер), DaData или
  демо-справочник без ключей (`GEO_PROVIDER=mock`). Сервер подписывает найденную точку (`APP_SECRET`), поэтому подменить
  координаты при оформлении нельзя.
- Зоны доставки — многоугольники в таблице `DeliveryZone`. При пересечении действует зона с меньшим `sortOrder`.
- Время: часы приёма заказов и слоты «ко времени» в часовом поясе ресторана (`Settings.timezone`).
- Демо-промокоды: `ОГОНЬ10` (10 %), `WELCOME300` (300 ₽ от 1 500 ₽).
- Уведомления о заказах: Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`), иначе запись в лог. В сообщения не попадают
  персональные данные гостя.

## Проверки

```bash
npm run lint         # ESLint + проверка, что цвета и размеры шрифтов идут только из токенов
npm run typecheck    # TypeScript, строгий режим
npm test             # Vitest: деньги, телефон, токены и контраст WCAG
npm run build
npx playwright install chromium   # один раз
npm run test:e2e     # Playwright на 375 и 1440 px (сам запустит npm start с RATE_LIMIT_SCALE=50; нужна база с сидом)
```

## Где что лежит

- `prisma/schema.prisma` — модель данных; `prisma/seed-data/menu.ts` — демо-меню.
- `src/server/menu.ts` — чтение меню из базы с кэшем (тег `menu`, сбрасывается из админки).
- `src/config/restaurant.ts` — **все демо-данные ресторана** (название, адрес, телефоны, часы, условия доставки). Вымышленные, помечены TODO.
- `src/app/globals.css` — дизайн-токены «Тушь и огонь». Единственное место с «сырыми» цветами и размерами.
- `src/design/tokens.ts` — зеркало цветов для TS (тест сверяет его с CSS).
- `src/components/ui` — кнопки, поля, метки; `src/components/site` — шапка, подвал, карточка блюда; `src/components/brand` — печать, мазок кисти, иероглифы.
