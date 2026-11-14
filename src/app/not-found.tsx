import type { Metadata } from "next";
import { Suspense } from "react";
import { Footer } from "@/components/site/Footer";
import { NotFoundContent } from "@/components/site/NotFoundContent";
import { SiteHeader, SiteHeaderFallback } from "@/components/site/SiteChrome";
import { TopBar } from "@/components/site/TopBar";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false },
};

/** 404 для адресов вне разделов сайта: рисуем шапку и подвал сами, т. к. макет (site) сюда не применяется. */
export default function NotFound() {
  return (
    <>
      <TopBar />
      <Suspense fallback={<SiteHeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <main id="main">
        <NotFoundContent />
      </main>
      <Footer />
    </>
  );
}
