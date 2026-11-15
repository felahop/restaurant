"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/Button";

/**
 * Шторка блюда поверх меню: снизу на телефоне, по центру на планшете и десктопе.
 * Закрывается кнопкой, Escape, касанием фона и жестом «назад» — URL при этом возвращается к меню.
 */
export function DishSheet({ children, titleId }: { children: ReactNode; titleId: string }) {
  const pathname = usePathname();
  // Ушли со страницы блюда (например, в корзину) — шторка закрывается сама.
  if (!pathname.startsWith("/menu/")) return null;
  return <SheetDialog titleId={titleId}>{children}</SheetDialog>;
}

function SheetDialog({ children, titleId }: { children: ReactNode; titleId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prevOverflow;
      if (dialog.open) dialog.close();
    };
  }, []);

  const close = () => router.back();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="sheet-dialog m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-card bg-canvas p-0 text-fg backdrop:bg-shade md:m-auto md:max-h-[88dvh] md:max-w-85 md:rounded-card"
    >
      <div className="sticky top-0 z-20 flex h-0 justify-end">
        <IconButton label="Закрыть" variant="primary" className="mt-1 mr-1 shadow-pop" onClick={close}>
          <X className="size-2.5" aria-hidden="true" />
        </IconButton>
      </div>
      <div className="mx-auto mt-1 h-0.5 w-5 rounded-full bg-line-strong md:hidden" aria-hidden="true" />
      {children}
    </dialog>
  );
}
