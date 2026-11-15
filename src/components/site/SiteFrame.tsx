import { Suspense } from "react";
import { Footer, SiteFooter } from "./Footer";
import { HeaderDrawerContacts, HeaderPhone, HeaderPhonePlaceholder } from "./HeaderContacts";
import { SiteHeader, SiteHeaderFallback } from "./SiteChrome";
import { TopBar, TopBarFallback } from "./TopBar";

/**
 * Плашка и шапка сайта. Тексты плашки и контакты — из настроек админ-панели:
 * они приходят потоком, а до этого на их месте заглушки той же высоты.
 */
export function SiteTop() {
  return (
    <>
      <Suspense fallback={<TopBarFallback />}>
        <TopBar />
      </Suspense>
      <Suspense fallback={<SiteHeaderFallback phone={<HeaderPhonePlaceholder />} />}>
        <SiteHeader
          phone={
            <Suspense fallback={<HeaderPhonePlaceholder />}>
              <HeaderPhone />
            </Suspense>
          }
          drawerContacts={
            <Suspense fallback={null}>
              <HeaderDrawerContacts />
            </Suspense>
          }
        />
      </Suspense>
    </>
  );
}

export function SiteBottom() {
  return (
    <Suspense fallback={<Footer info={null} />}>
      <SiteFooter />
    </Suspense>
  );
}
