import type { ReactNode } from "react";

export function AdminPageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-0.5">
        <h1 className="font-display text-h2 text-fg">{title}</h1>
        {description ? <p className="text-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-1">{actions}</div> : null}
    </div>
  );
}
