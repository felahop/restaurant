"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleAlert, LoaderCircle, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { fieldControlStyles } from "@/components/ui/Field";

export type ResolvedZone = {
  id: string;
  name: string;
  fee: number;
  minOrder: number;
  freeFrom: number | null;
  etaMinutes: number;
};

export type AddressState = {
  text: string;
  /** Подписанный сервером токен адреса; null — адрес не выбран из подсказок или не проверен. */
  token: string | null;
  zone: ResolvedZone | null;
  error: string | null;
  outOfZone: boolean;
};

export const EMPTY_ADDRESS: AddressState = { text: "", token: null, zone: null, error: null, outOfZone: false };

type Suggestion = { value: string; title: string; subtitle?: string; ref?: string };

type Props = {
  value: AddressState;
  onChange: (next: AddressState) => void;
  /** Внешняя ошибка (например, «Укажите адрес» при отправке). */
  error?: string | null;
};

/** Адрес с подсказками (combobox по WAI-ARIA): ввод → подсказки → выбор → проверка зоны на сервере. */
export function AddressField({ value, onChange, error }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const skipNextFetch = useRef(false);

  // Подсказки с задержкой 250 мс после ввода.
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const q = value.text.trim();
    if (value.token || q.length < 3) return;
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`/api/geo/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { suggestions?: Suggestion[]; error?: string };
        setSuggestions(data.suggestions ?? []);
        setOpen(true);
        setActive(-1);
      } catch {
        // Сеть пропала или запрос отменён — подсказки просто не показываем.
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [value.text, value.token]);

  const choose = async (s: Suggestion) => {
    setOpen(false);
    setSuggestions([]);
    skipNextFetch.current = true;
    onChange({ ...EMPTY_ADDRESS, text: s.value });
    setResolving(true);
    try {
      const res = await fetch("/api/geo/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: s.value, ref: s.ref }),
      });
      const data = (await res.json()) as {
        address?: { value: string };
        token?: string;
        zone?: ResolvedZone | null;
        error?: string;
      };
      if (!res.ok || !data.token || !data.address) {
        onChange({ ...EMPTY_ADDRESS, text: s.value, error: data.error ?? "Не получилось проверить адрес" });
        return;
      }
      skipNextFetch.current = true;
      onChange({
        text: data.address.value,
        token: data.token,
        zone: data.zone ?? null,
        error: null,
        outOfZone: !data.zone,
      });
    } catch {
      onChange({ ...EMPTY_ADDRESS, text: s.value, error: "Нет связи. Проверьте интернет и выберите адрес ещё раз." });
    } finally {
      setResolving(false);
    }
  };

  const query = value.text.trim();
  const visible = value.token || query.length < 3 ? [] : suggestions;
  const shownError = value.error ?? error ?? null;
  const describedBy = [shownError ? `${id}-error` : null, `${id}-hint`].filter(Boolean).join(" ");
  const expanded = open && visible.length > 0;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        Адрес доставки
      </label>
      <div className="relative">
        <MapPin
          className="pointer-events-none absolute top-1/2 left-2 size-2.5 -translate-y-1/2 text-fg-muted"
          aria-hidden="true"
        />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-describedby={describedBy}
          aria-invalid={shownError ? true : undefined}
          autoComplete="street-address"
          placeholder="Улица и дом, например «Покровка, 12»"
          value={value.text}
          onChange={(e) => onChange({ ...EMPTY_ADDRESS, text: e.target.value })}
          onFocus={() => visible.length && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!expanded) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % visible.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i <= 0 ? visible.length - 1 : i - 1));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              const s = visible[active];
              if (s) void choose(s);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={cn(fieldControlStyles, "h-6 pr-5 pl-6")}
        />
        {loading || resolving ? (
          <LoaderCircle
            className="absolute top-1/2 right-2 size-2.5 -translate-y-1/2 animate-spin text-fg-muted"
            aria-hidden="true"
          />
        ) : null}
        {expanded ? (
          <ul
            id={listId}
            role="listbox"
            aria-label="Подсказки адресов"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-field border border-line-strong bg-surface py-1 shadow-pop"
          >
            {visible.map((s, i) => (
              <li
                key={`${s.value}-${i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void choose(s)}
                className={cn(
                  "flex min-h-5.5 cursor-pointer flex-col justify-center px-2 py-1",
                  i === active ? "bg-surface-2" : "hover:bg-surface-2",
                )}
              >
                <span className="text-base text-fg">{s.title}</span>
                {s.subtitle ? <span className="text-sm text-fg-muted">{s.subtitle}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {shownError ? (
        <p id={`${id}-error`} className="flex items-start gap-1 text-sm text-accent" role="alert">
          <CircleAlert className="mt-px size-2 shrink-0" aria-hidden="true" />
          <span>{shownError}</span>
        </p>
      ) : null}
      <p id={`${id}-hint`} className="text-sm text-fg-muted">
        {resolving ? "Проверяем адрес…" : "Выберите адрес из подсказок — так мы точно поймём, куда ехать."}
      </p>
    </div>
  );
}
