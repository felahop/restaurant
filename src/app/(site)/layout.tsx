import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { MobileCartBar } from "@/components/site/MobileCartBar";
import { TopBar } from "@/components/site/TopBar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  // TODO(этап 2): корзина из клиентского хранилища вместо нулей.
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-paper px-2 py-1 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-1 focus:left-1"
      >
        Перейти к содержимому
      </a>
      <TopBar />
      <Header cartCount={0} cartTotal={0} />
      <main id="main">{children}</main>
      <Footer />
      <MobileCartBar count={0} total={0} />
    </>
  );
}
