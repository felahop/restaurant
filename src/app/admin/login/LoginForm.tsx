"use client";

import { useActionState } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";
import { loginAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <TextField id="login" name="login" label="Логин" autoComplete="username" required autoCapitalize="none" />
      <TextField id="password" name="password" type="password" label="Пароль" autoComplete="current-password" required />
      {state.error ? (
        <p role="alert" className="flex items-center gap-1 text-sm text-accent">
          <CircleAlert className="size-2" aria-hidden="true" />
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" block loading={pending}>
        Войти
      </Button>
    </form>
  );
}
