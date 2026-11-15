"use client";

import { useEffect } from "react";

export function AutoPrint() {
  useEffect(() => {
    const t = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <button type="button" onClick={() => window.print()} className="print:hidden mb-1 rounded-full border px-2 py-1 text-sm">
      Напечатать ещё раз
    </button>
  );
}
