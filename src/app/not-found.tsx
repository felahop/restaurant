import type { Metadata } from "next";
import { NotFoundContent } from "@/components/site/NotFoundContent";
import { SiteBottom, SiteTop } from "@/components/site/SiteFrame";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false },
};

/** 404 для адресов вне разделов сайта: рисуем шапку и подвал сами, т. к. макет (site) сюда не применяется. */
export default function NotFound() {
  return (
    <>
      <SiteTop />
      <main id="main">
        <NotFoundContent />
      </main>
      <SiteBottom />
    </>
  );
}
