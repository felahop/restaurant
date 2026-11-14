import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type StyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
};

const base =
  "inline-flex select-none items-center justify-center gap-1 rounded-full font-semibold whitespace-nowrap " +
  "transition-[background-color,color,border-color,transform] duration-150 ease-out " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-action text-on-action hover:bg-action-hover",
  secondary: "border-2 border-fg text-fg hover:bg-fg hover:text-canvas",
  ghost: "text-fg hover:bg-surface-2",
};

/** Высота: sm 44 px (минимальная область нажатия), md 48 px, lg 56 px. */
const sizes: Record<ButtonSize, string> = {
  sm: "h-5.5 px-2.5 text-sm",
  md: "h-6 px-3 text-base",
  lg: "h-7 px-4 text-base",
};

export function buttonStyles({ variant = "primary", size = "md", block, className }: StyleOptions = {}) {
  return cn(base, variants[variant], sizes[size], block && "w-full", className);
}

type ButtonProps = ComponentProps<"button"> &
  StyleOptions & {
    loading?: boolean;
    icon?: ReactNode;
  };

export function Button({
  variant,
  size,
  block,
  className,
  loading = false,
  icon,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-2.5 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & StyleOptions & { icon?: ReactNode };

export function ButtonLink({ variant, size, block, className, icon, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonStyles({ variant, size, block, className })} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

type IconButtonProps = ComponentProps<"button"> & {
  /** Обязательная подпись для скринридеров. */
  label: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
};

const iconSizes = { sm: "size-5.5", md: "size-6" } as const;

export function IconButton({
  label,
  variant = "ghost",
  size = "sm",
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(base, variants[variant], iconSizes[size], "px-0", className)}
      {...rest}
    >
      {children}
    </button>
  );
}
