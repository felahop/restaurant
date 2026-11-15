import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Админ-панель", template: "%s · Админ-панель" },
  robots: { index: false, follow: false },
};

/** Админка — светлая, плотная, удобная на планшете. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="theme-light min-h-dvh bg-canvas text-fg">{children}</div>;
}
