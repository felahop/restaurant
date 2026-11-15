import { CartAnnouncer } from "@/components/site/CartAnnouncer";
import { Footer } from "@/components/site/Footer";
import { Suspense } from "react";
import { SiteHeader, SiteHeaderFallback, SiteMobileCartBar } from "@/components/site/SiteChrome";
import { TopBar } from "@/components/site/TopBar";

export default function SiteLayout({ children, sheet }: { children: React.ReactNode; sheet: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-paper px-2 py-1 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-1 focus:left-1"
      >
        Перейти к содержимому
      </a>
      <TopBar />
      <Suspense fallback={<SiteHeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <main id="main">{children}</main>
      {sheet}
      <Footer />
      <Suspense fallback={null}>
        <SiteMobileCartBar />
      </Suspense>
      <CartAnnouncer />
    </>
  );
}
