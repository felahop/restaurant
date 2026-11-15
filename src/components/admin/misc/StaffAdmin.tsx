"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/Choice";
import { Input, TextField } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { createStaffAction, resetStaffPasswordAction, updateStaffAction } from "@/app/admin/(panel)/staff/actions";

type Staff = { id: string; login: string; name: string; role: "OWNER" | "MANAGER"; isActive: boolean; lastLoginAt: string | null; isMe: boolean };

export function StaffAdmin({ rows }: { rows: Staff[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ login: "", name: "", role: "MANAGER" as "OWNER" | "MANAGER", password: "" });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const show = (r: { ok: boolean; message?: string; error?: string }) => setMessage({ ok: r.ok, text: r.ok ? (r.message ?? "Готово") : (r.error ?? "Ошибка") });

  return (
    <div className="flex flex-col gap-3">
      {message ? (
        <p role="status" className={message.ok ? "text-sm text-success" : "text-sm text-accent"}>
          {message.text}
        </p>
      ) : null}
      <ul className="flex flex-col gap-1">
        {rows.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-1.5 rounded-card border border-line bg-surface p-2">
            <div className="flex min-w-30 flex-col">
              <span className="font-semibold">
                {s.name} {s.isMe ? <Badge tone="neutral">это вы</Badge> : null}
              </span>
              <span className="text-sm text-fg-muted">
                {s.login} · вход: {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString("ru-RU") : "не входил"}
              </span>
            </div>
            <SegmentedControl
              name={`role-${s.id}`}
              legend={`Роль ${s.name}`}
              value={s.role}
              onChange={(role) => start(async () => { show(await updateStaffAction(s.id, { role, isActive: s.isActive })); router.refresh(); })}
              options={[{ value: "MANAGER", label: "Менеджер" }, { value: "OWNER", label: "Владелец" }]}
            />
            <Switch
              checked={s.isActive}
              disabled={s.isMe || pending}
              label={s.isActive ? "Доступ есть" : "Доступ закрыт"}
              onCheckedChange={(isActive) => start(async () => { show(await updateStaffAction(s.id, { role: s.role, isActive })); router.refresh(); })}
            />
            <form
              className="ml-auto flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  show(await resetStaffPasswordAction(s.id, passwords[s.id] ?? ""));
                  setPasswords((p) => ({ ...p, [s.id]: "" }));
                });
              }}
            >
              <Input
                type="password"
                autoComplete="new-password"
                aria-label={`Новый пароль для ${s.name}`}
                placeholder="Новый пароль"
                className="h-5.5 w-25"
                value={passwords[s.id] ?? ""}
                onChange={(e) => setPasswords((p) => ({ ...p, [s.id]: e.target.value }))}
              />
              <Button type="submit" size="sm" variant="secondary" disabled={!passwords[s.id]}>
                Сменить
              </Button>
            </form>
          </li>
        ))}
      </ul>

      <form
        className="grid gap-1.5 rounded-card border border-line bg-surface p-2 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await createStaffAction(form);
            show(r);
            if (r.ok) {
              setForm({ login: "", name: "", role: "MANAGER", password: "" });
              router.refresh();
            }
          });
        }}
      >
        <h2 className="text-title font-semibold sm:col-span-2 lg:col-span-4">Новый сотрудник</h2>
        <TextField id="staff-name" label="Имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextField id="staff-login" label="Логин" autoCapitalize="none" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
        <TextField id="staff-password" label="Пароль" type="password" autoComplete="new-password" hint="От 10 символов, буквы и цифры" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Роль</span>
          <SegmentedControl name="staff-role" legend="Роль" value={form.role} onChange={(role) => setForm({ ...form, role })} options={[{ value: "MANAGER", label: "Менеджер" }, { value: "OWNER", label: "Владелец" }]} />
        </div>
        <Button type="submit" loading={pending} className="sm:col-span-2 lg:col-span-4 lg:justify-self-end">
          Добавить сотрудника
        </Button>
      </form>
    </div>
  );
}
