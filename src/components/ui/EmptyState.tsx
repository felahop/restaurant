import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  tone?: "neutral" | "error";
  className?: string;
};

/** Пустые состояния и ошибки: коротко, тепло, с понятным следующим шагом. */
export function EmptyState({ icon, title, children, action, tone = "neutral", className }: EmptyStateProps) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "flex flex-col items-center gap-2 rounded-card border border-line bg-surface px-3 py-5 text-center",
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-full bg-surface-2",
            tone === "error" ? "text-accent" : "text-ginger",
          )}
        >
          {icon}
        </span>
      ) : null}
      <p className="text-h3 font-semibold text-fg">{title}</p>
      {children ? <div className="max-w-narrow text-base text-fg-muted">{children}</div> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
