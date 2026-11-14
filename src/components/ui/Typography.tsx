import type { ReactNode } from "react";
import { BrushStroke } from "@/components/brand/BrushStroke";
import { cn } from "@/lib/cn";
import { formatRub } from "@/lib/money";

/** Метка над заголовком: 13 px, прописные, разрядка 0.12em, цвет ginger. */
export function Eyebrow({
  children,
  className,
  as: Tag = "p",
}: {
  children: ReactNode;
  className?: string;
  as?: "p" | "span";
}) {
  return (
    <Tag className={cn("text-xs font-semibold tracking-eyebrow text-eyebrow uppercase", className)}>{children}</Tag>
  );
}

type SectionHeadingProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  as?: "h1" | "h2";
  align?: "start" | "center";
  id?: string;
  className?: string;
};

/** Метка → крупный заголовок Dela Gothic One → мазок кисти → короткий лид. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  as: Tag = "h2",
  align = "start",
  id,
  className,
}: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <div className={cn("flex flex-col gap-2", centered && "items-center text-center", className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <div className={cn("flex flex-col gap-1.5", centered && "items-center")}>
        <Tag id={id} className={cn("font-display text-fg", Tag === "h1" ? "text-h1" : "text-h2")}>
          {title}
        </Tag>
        <BrushStroke />
      </div>
      {lead ? <p className="max-w-prose text-lead text-fg-muted">{lead}</p> : null}
    </div>
  );
}

/** Цена; при старой цене новая подсвечивается акцентом, старая зачёркнута. */
export function Price({ value, oldValue, className }: { value: number; oldValue?: number | null; className?: string }) {
  const discounted = oldValue != null && oldValue > value;
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span className={cn("text-price font-semibold tabular-nums", discounted ? "text-accent" : "text-fg")}>
        {discounted ? <span className="sr-only">Цена со скидкой: </span> : null}
        {formatRub(value)}
      </span>
      {discounted ? (
        <s className="text-sm text-fg-muted tabular-nums">
          <span className="sr-only">Старая цена: </span>
          {formatRub(oldValue)}
        </s>
      ) : null}
    </span>
  );
}
