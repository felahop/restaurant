import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { ArrowRight, CalendarDays, CloudOff, CreditCard, MapPin, MoonStar, ShoppingBag } from "lucide-react";
import { BrushStroke } from "@/components/brand/BrushStroke";
import { Hanko } from "@/components/brand/Hanko";
import { KanjiBackdrop } from "@/components/brand/KanjiBackdrop";
import { Logo } from "@/components/brand/Logo";
import { Footer, SiteFooter } from "@/components/site/Footer";
import { TopBar, TopBarFallback } from "@/components/site/TopBar";
import { Badge, DishBadge, SpiceLevel } from "@/components/ui/Badge";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Checkbox, Radio } from "@/components/ui/Choice";
import { EmptyState } from "@/components/ui/EmptyState";
import { SelectField, TextareaField, TextField } from "@/components/ui/Input";
import { Eyebrow, Price, SectionHeading } from "@/components/ui/Typography";
import { contrastRatio } from "@/design/contrast";
import { palette, surfaces, type PaletteToken } from "@/design/tokens";
import { cn } from "@/lib/cn";
import { ControlsDemo, DishCardsDemo } from "./StyleguideInteractive";

export const metadata: Metadata = {
  title: "Витрина компонентов",
  robots: { index: false, follow: false },
};

const sections = [
  ["colors", "Цвета"],
  ["type", "Типографика"],
  ["brand", "Знаки"],
  ["buttons", "Кнопки"],
  ["fields", "Поля"],
  ["badges", "Метки"],
  ["dish", "Карточка блюда"],
  ["chrome", "Плашка и подвал"],
  ["states", "Пустые состояния"],
] as const;

const swatches: { token: PaletteToken; role: string; textOn: PaletteToken }[] = [
  { token: "ink", role: "Основной фон", textOn: "paper" },
  { token: "coal", role: "Карточки, корзина, поля", textOn: "paper" },
  { token: "ash", role: "Разделители, обводки", textOn: "paper" },
  { token: "paper", role: "Текст на тёмном, светлые секции", textOn: "ink" },
  { token: "sesame", role: "Вторичный текст на тёмном", textOn: "ink" },
  { token: "cinnabar", role: "Только действия", textOn: "white" },
  { token: "ginger", role: "Хит, бонусы, метки", textOn: "ink" },
  { token: "matcha", role: "Веган, успех", textOn: "ink" },
  { token: "cinnabar-glow", role: "Акцентный текст на тёмном", textOn: "ink" },
  { token: "cinnabar-deep", role: "Акцентный текст на светлом, hover", textOn: "white" },
  { token: "ginger-deep", role: "Метки на светлом", textOn: "white" },
  { token: "matcha-deep", role: "Успех на светлом", textOn: "white" },
  { token: "stone", role: "Вторичный текст на светлом", textOn: "white" },
  { token: "smoke", role: "Обводка полей на тёмном", textOn: "white" },
  { token: "sand", role: "Обводка полей на светлом", textOn: "ink" },
  { token: "linen", role: "Вторичная светлая поверхность", textOn: "ink" },
];

/** Классы фона для образцов; перечислены явно, чтобы Tailwind их сгенерировал. */
const swatchBg: Record<PaletteToken, string> = {
  ink: "bg-ink",
  coal: "bg-coal",
  ash: "bg-ash",
  paper: "bg-paper",
  sesame: "bg-sesame",
  cinnabar: "bg-cinnabar",
  ginger: "bg-ginger",
  matcha: "bg-matcha",
  white: "bg-white",
  "cinnabar-glow": "bg-cinnabar-glow",
  "cinnabar-deep": "bg-cinnabar-deep",
  "ginger-deep": "bg-ginger-deep",
  "matcha-deep": "bg-matcha-deep",
  stone: "bg-stone",
  smoke: "bg-smoke",
  sand: "bg-sand",
  linen: "bg-linen",
};
const swatchText: Partial<Record<PaletteToken, string>> = { paper: "text-paper", ink: "text-ink", white: "text-white" };

function Section({
  id,
  title,
  children,
  light = false,
}: {
  id: string;
  title: string;
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-10 border-t border-line", light && "theme-light bg-canvas text-fg")}
    >
      <div className="mx-auto flex max-w-site flex-col gap-4 px-2 py-6 md:px-3 md:py-8">
        <h2 id={`${id}-title`} className="font-display text-h2">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function Panel({ title, children, light = false }: { title: string; children: ReactNode; light?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-card border border-line p-2 md:p-3",
        light ? "theme-light bg-canvas" : "bg-canvas",
      )}
    >
      <Eyebrow>{title}</Eyebrow>
      {children}
    </div>
  );
}

function ContrastTable({ surface }: { surface: "dark" | "light" }) {
  const s = surfaces[surface];
  const bgs = [s.canvas, s.surface, s["surface-2"]] as const;
  const fgs = [
    ["Основной текст", s.fg],
    ["Вторичный текст", s["fg-muted"]],
    ["Метка над заголовком", s.eyebrow],
    ["Акцентный текст", s.accent],
    ["Успех", s.success],
  ] as const;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-70 border-collapse text-left text-sm">
        <caption className="sr-only">
          Контраст текста на {surface === "dark" ? "тёмной" : "светлой"} поверхности
        </caption>
        <thead>
          <tr className="border-b border-line text-fg-muted">
            <th scope="col" className="py-1 pr-2 font-medium">
              Текст
            </th>
            {bgs.map((bg) => (
              <th key={bg} scope="col" className="py-1 pr-2 font-medium">
                на {bg}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fgs.map(([label, fg]) => (
            <tr key={label} className="border-b border-line">
              <th scope="row" className="py-1 pr-2 font-medium text-fg">
                {label} <span className="text-fg-muted">({fg})</span>
              </th>
              {bgs.map((bg) => {
                const ratio = contrastRatio(palette[fg], palette[bg]);
                const ok = ratio >= 4.5;
                return (
                  <td key={bg} className={cn("py-1 pr-2 tabular-nums", ok ? "text-fg" : "text-accent")}>
                    {ratio.toFixed(2)} {ok ? "AA" : "не проходит"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ButtonsShowcase() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm">Маленькая · 44</Button>
        <Button>Основная · 48</Button>
        <Button size="lg">Крупная · 56</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary">Вторичная</Button>
        <Button variant="ghost">Тихая</Button>
        <ButtonLink href="#buttons" variant="secondary" icon={<CalendarDays className="size-2.5" aria-hidden="true" />}>
          Забронировать стол
        </ButtonLink>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button loading>Оформляем…</Button>
        <Button disabled>Недоступна</Button>
        <Button variant="secondary" disabled>
          Недоступна
        </Button>
        <IconButton label="Корзина" variant="secondary">
          <ShoppingBag className="size-2.5" aria-hidden="true" />
        </IconButton>
        <IconButton label="Дальше" variant="primary" size="md">
          <ArrowRight className="size-2.5" aria-hidden="true" />
        </IconButton>
      </div>
      <Button block size="lg">
        На всю ширину · Оплатить 1 870 ₽
      </Button>
    </div>
  );
}

function FieldsShowcase({ prefix }: { prefix: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <TextField id={`${prefix}-name`} label="Имя" placeholder="Как к вам обращаться" autoComplete="given-name" />
      <TextField
        id={`${prefix}-address`}
        label="Адрес"
        defaultValue="ул. Мясницкая, 99"
        error="Этот адрес вне зоны доставки. Заберите заказ сами — будет готов через 25 минут."
      />
      <TextField id={`${prefix}-flat`} label="Квартира" optional hint="Подъезд и домофон можно указать в комментарии" />
      <TextField id={`${prefix}-disabled`} label="Промокод" disabled placeholder="Недоступно" />
      <SelectField id={`${prefix}-time`} label="Время доставки" defaultValue="asap">
        <option value="asap">Как можно скорее</option>
        <option value="19:00">Сегодня к 19:00</option>
        <option value="19:15">Сегодня к 19:15</option>
      </SelectField>
      <TextareaField
        id={`${prefix}-comment`}
        label="Комментарий"
        optional
        placeholder="Например: без кинзы, позвонить за 5 минут"
      />
      <fieldset className="flex flex-col">
        <legend className="mb-1 text-sm font-medium">Оплата</legend>
        <Radio name={`${prefix}-pay`} label="Картой онлайн" defaultChecked />
        <Radio name={`${prefix}-pay`} label="СБП" description="Откроем приложение банка" />
        <Radio name={`${prefix}-pay`} label="Наличными курьеру" disabled description="Временно недоступно" />
      </fieldset>
      <div className="flex flex-col">
        <Checkbox label="Нужны приборы" defaultChecked />
        <Checkbox
          label="Согласен на обработку персональных данных"
          description="Подробнее в политике конфиденциальности"
        />
        <Checkbox label="Недоступно" disabled />
      </div>
    </div>
  );
}

const textScale = [
  ["text-display", "Display · Dela Gothic One", "font-display text-display", "Приходите голодными"],
  ["text-h1", "H1 · Dela Gothic One", "font-display text-h1", "Кухня на углях и воке"],
  ["text-h2", "H2 · Dela Gothic One", "font-display text-h2", "Хиты недели"],
  ["text-h3", "H3 · Golos 600", "text-h3 font-semibold", "Доставка по центру за 35 минут"],
  [
    "text-lead",
    "Лид · Golos 400",
    "text-lead text-fg-muted",
    "Рамен на костном бульоне, вок с открытого огня и бао ручной лепки.",
  ],
  ["text-title", "Название блюда · Golos 600", "text-title font-semibold", "Тонкоцу рамен"],
  ["text-base", "Текст · Golos 400", "text-base", "До бесплатной доставки осталось 350 ₽ — добавьте пару димсамов."],
  ["text-sm", "Подпись · Golos 400", "text-sm text-fg-muted", "Свиной бульон, чашу, яйцо, нори · 480 г"],
  [
    "text-xs",
    "Метка · Golos 600, 0.12em",
    "text-xs font-semibold tracking-eyebrow text-eyebrow uppercase",
    "С открытого огня",
  ],
  ["text-2xs", "Бейдж · Golos 600", "text-2xs font-semibold", "Новинка"],
] as const;

export default function StyleguidePage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-site flex-col gap-3 px-2 py-4 md:px-3">
          <div className="flex items-center justify-between gap-2">
            <Logo />
            <Badge tone="neutral">Служебная страница</Badge>
          </div>
          <h1 className="font-display text-h1">Тушь и огонь</h1>
          <p className="max-w-prose text-lead text-fg-muted">
            Витрина дизайн-системы: токены, шрифты, компоненты и их состояния. Страница закрыта от индексации.
          </p>
          <nav aria-label="Разделы витрины">
            <ul className="flex flex-wrap gap-1">
              {sections.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="inline-flex h-5.5 items-center rounded-full border border-line-strong px-2 text-sm hover:border-fg"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <Section id="colors" title="Цвета">
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {swatches.map(({ token, role, textOn }) => (
            <li key={token} className="overflow-hidden rounded-card border border-line bg-surface">
              <div
                className={cn("flex h-10 items-end p-1.5 text-sm font-semibold", swatchBg[token], swatchText[textOn])}
              >
                {token}
              </div>
              <div className="flex flex-col p-1.5">
                <span className="text-sm text-fg tabular-nums">{palette[token]}</span>
                <span className="text-sm text-fg-muted">{role}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel title="Контраст на тёмном">
            <ContrastTable surface="dark" />
          </Panel>
          <Panel title="Контраст на светлом" light>
            <ContrastTable surface="light" />
          </Panel>
        </div>
        <p className="max-w-prose text-sm text-fg-muted">
          Белый текст на кнопке cinnabar: {contrastRatio(palette.white, palette.cinnabar).toFixed(2)} : 1. Исходные
          cinnabar, ginger и matcha не проходят AA как мелкий текст на paper, а cinnabar — и на ink, поэтому для текста
          используются оттенки -glow и -deep.
        </p>
      </Section>

      <Section id="type" title="Типографика">
        <ul className="flex flex-col divide-y divide-line">
          {textScale.map(([token, name, cls, sample]) => (
            <li key={token} className="grid gap-1 py-2 md:grid-cols-[220px_1fr] md:gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-fg">{token}</span>
                <span className="text-sm text-fg-muted">{name}</span>
              </div>
              <p className={cls}>{sample}</p>
            </li>
          ))}
        </ul>
        <Panel title="Секционный заголовок">
          <SectionHeading
            eyebrow="С открытого огня"
            title="Хиты недели"
            lead="Четыре блюда, ради которых возвращаются. Добавляйте в корзину прямо отсюда."
          />
        </Panel>
        <Panel title="То же на светлой секции" light>
          <SectionHeading
            eyebrow="Наша история"
            title="Огонь, тушь и терпение"
            lead="Начинали с маленькой кухни на четыре конфорки и одного вока."
          />
        </Panel>
      </Section>

      <Section id="brand" title="Знаки">
        <div className="grid gap-3 md:grid-cols-3">
          <Panel title="Печать-ханко">
            <div className="flex items-end gap-2">
              <Hanko className="size-12" title="Печать Сумиби" />
              <Hanko className="size-7" />
              <Hanko className="size-4" />
            </div>
          </Panel>
          <Panel title="Логотип и мазок кисти">
            <Logo withTagline />
            <BrushStroke />
            <BrushStroke className="w-30 text-paper opacity-20" />
          </Panel>
          <Panel title="Иероглиф на фоне, 6 %">
            <div className="relative h-24 overflow-hidden rounded-card bg-surface">
              <KanjiBackdrop char="麺" className="-bottom-4 -left-2" />
              <p className="relative p-2 text-sm text-fg-muted">
                Иероглиф лежит под контентом и не читается скринридером.
              </p>
            </div>
          </Panel>
        </div>
      </Section>

      <Section id="buttons" title="Кнопки">
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel title="На тёмном">
            <ButtonsShowcase />
          </Panel>
          <Panel title="На светлом" light>
            <ButtonsShowcase />
          </Panel>
        </div>
      </Section>

      <Section id="fields" title="Поля">
        <Panel title="Интерактивные">
          <ControlsDemo />
        </Panel>
        <Panel title="На тёмном">
          <FieldsShowcase prefix="dark" />
        </Panel>
        <Panel title="На светлом (админка)" light>
          <FieldsShowcase prefix="light" />
        </Panel>
      </Section>

      <Section id="badges" title="Метки и цены">
        <div className="grid gap-3 md:grid-cols-2">
          <Panel title="Метки блюд">
            <div className="flex flex-wrap gap-1">
              <DishBadge.Hit />
              <DishBadge.New />
              <DishBadge.Vegan />
              <DishBadge.GlutenFree />
              <DishBadge.SoldOut />
              <Badge tone="promo">−20%</Badge>
              <Badge tone="success">Доставлен</Badge>
            </div>
            <div className="flex flex-col gap-1">
              <SpiceLevel level={0} showZero withLabel />
              <SpiceLevel level={1} withLabel />
              <SpiceLevel level={2} withLabel />
              <SpiceLevel level={3} withLabel />
            </div>
          </Panel>
          <Panel title="Цены">
            <Price value={69_000} />
            <Price value={49_000} oldValue={56_000} />
            <Price value={187_050} />
          </Panel>
          <Panel title="На светлом" light>
            <div className="flex flex-wrap gap-1">
              <DishBadge.Hit />
              <DishBadge.New />
              <DishBadge.Vegan />
              <DishBadge.GlutenFree />
              <DishBadge.SoldOut />
            </div>
            <Price value={49_000} oldValue={56_000} />
          </Panel>
        </div>
      </Section>

      <Section id="dish" title="Карточка блюда и шапка">
        <DishCardsDemo />
      </Section>

      <Section id="chrome" title="Плашка и подвал">
        <div className="overflow-hidden rounded-card border border-line">
          <Suspense fallback={<TopBarFallback />}>
            <TopBar />
          </Suspense>
        </div>
        <div className="overflow-hidden rounded-card border border-line">
          <Suspense fallback={<Footer info={null} />}>
            <SiteFooter />
          </Suspense>
        </div>
      </Section>

      <Section id="states" title="Пустые состояния и ошибки">
        <div className="grid gap-2 md:grid-cols-2">
          <EmptyState
            icon={<ShoppingBag className="size-3" aria-hidden="true" />}
            title="В корзине пока пусто"
            action={<ButtonLink href="#dish">Выбрать блюда</ButtonLink>}
          >
            Загляните в меню: рамен, вок и бао уже ждут.
          </EmptyState>
          <EmptyState
            icon={<MapPin className="size-3" aria-hidden="true" />}
            title="Сюда пока не доставляем"
            action={<Button variant="secondary">Заберу сам</Button>}
          >
            Адрес за границей наших зон. Заберите заказ в ресторане — приготовим к вашему приходу.
          </EmptyState>
          <EmptyState
            icon={<MoonStar className="size-3" aria-hidden="true" />}
            title="Кухня уже отдыхает"
            action={<Button>Заказать ко времени</Button>}
          >
            Мы открываемся в 11:00. Оформите заказ сейчас — привезём к удобному часу.
          </EmptyState>
          <EmptyState
            tone="error"
            icon={<CreditCard className="size-3" aria-hidden="true" />}
            title="Оплата не прошла"
            action={<Button>Попробовать ещё раз</Button>}
          >
            Деньги не списаны. Проверьте карту или выберите СБП — заказ мы сохранили.
          </EmptyState>
          <EmptyState
            tone="error"
            icon={<CloudOff className="size-3" aria-hidden="true" />}
            title="Не получилось загрузить"
            action={<Button variant="secondary">Обновить</Button>}
          >
            Похоже, пропала связь. Обновите страницу — корзина на месте.
          </EmptyState>
        </div>
      </Section>
    </div>
  );
}
