import type { Metadata } from "next";
import { Hanko } from "@/components/brand/Hanko";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Вход" };

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-2 py-6">
      <div className="flex w-full max-w-narrow flex-col gap-3 rounded-card bg-surface p-3 shadow-soft md:p-4">
        <div className="flex items-center gap-1.5">
          <Hanko className="size-5" />
          <div>
            <h1 className="font-display text-h3 text-fg">Админ-панель</h1>
            <p className="text-sm text-fg-muted">Вход для сотрудников</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
