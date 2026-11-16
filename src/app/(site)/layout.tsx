import { Suspense } from "react";
import { CartAnnouncer } from "@/components/site/CartAnnouncer";
import { CartSync } from "@/components/site/CartSync";
import { SiteMobileCartBar } from "@/components/site/SiteChrome";
import { SiteBottom, SiteTop } from "@/components/site/SiteFrame";

export default function SiteLayout({ children, sheet }: { children: React.ReactNode; sheet: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-paper px-2 py-1 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-1 focus:left-1"
      >
        Перейти к содержимому
      </a>
      <SiteTop />
      <main id="main">{children}</main>
      {sheet}
      <SiteBottom />
      <Suspense fallback={null}>
        <SiteMobileCartBar />
      </Suspense>
      <CartAnnouncer />
      <CartSync />
    </>
  );
}
