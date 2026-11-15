import { Clock, Gift, Percent, ShoppingBag, Sparkles, Truck } from "lucide-react";
import { cn } from "@/lib/cn";
import { getSiteInfo } from "@/server/site-info";

/** Значок подбирается по смыслу пункта: тексты плашки владелец пишет сам в настройках. */
function iconFor(text: string) {
  const t = text.toLowerCase();
  if (/бонус|кешбэк|кэшбэк|баллы/.test(t)) return Gift;
  if (/заказ от|минимальн/.test(t)) return ShoppingBag;
  if (/доставк/.test(t)) return Truck;
  if (/мин|час|привез/.test(t)) return Clock;
  if (/скидк|%|промокод/.test(t)) return Percent;
  return Sparkles;
}

/** Числа с единицами («2 500 ₽», «35–60 мин», «5 %») выделяем полужирным. */
function Emphasize({ text }: { text: string }) {
  const parts = text.split(/(\d[\d\s ]*(?:[–-]\s?\d+)?\s?(?:₽|%|мин|руб\.?)?)/u);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <b key={i} className="font-semibold text-fg">
            {part}
          </b>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** На телефоне — первый пункт, с планшета — два, на компьютере — все. */
const VISIBILITY = ["flex", "hidden sm:flex", "hidden lg:flex", "hidden lg:flex"];

function Bar({ children }: { children?: React.ReactNode }) {
  return (
    <aside aria-label="Условия доставки" className="border-b border-line bg-surface">
      <ul className="mx-auto flex h-5 max-w-site items-center justify-center gap-3 px-2 text-xs text-fg-muted md:px-3 lg:justify-between">
        {children}
      </ul>
    </aside>
  );
}

/** Плашка над шапкой: тексты из настроек админ-панели. */
export async function TopBar() {
  const { topBarItems } = await getSiteInfo();
  if (!topBarItems.length) return null;
  return (
    <Bar>
      {topBarItems.slice(0, VISIBILITY.length).map((text, i) => {
        const Icon = iconFor(text);
        return (
          <li key={i} className={cn("items-center gap-1", VISIBILITY[i])}>
            <Icon className="size-2 shrink-0 text-ginger" aria-hidden="true" />
            <span className="whitespace-nowrap">
              <Emphasize text={text} />
            </span>
          </li>
        );
      })}
    </Bar>
  );
}

/** Пустая плашка той же высоты, пока тексты загружаются: вёрстка не прыгает. */
export function TopBarFallback() {
  return <Bar />;
}
