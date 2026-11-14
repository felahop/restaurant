import { CartAnnouncer } from "@/components/site/CartAnnouncer";
import { Footer } from "@/components/site/Footer";
import { SiteHeader, SiteMobileCartBar } from "@/components/site/SiteChrome";
import { TopBar } from "@/components/site/TopBar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-paper px-2 py-1 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-1 focus:left-1"
      >
        Перейти к содержимому
      </a>
      <TopBar />
      <SiteHeader />
      <main id="main">{children}</main>
      <Footer />
      <SiteMobileCartBar />
      <CartAnnouncer />
    </>
  );
}
