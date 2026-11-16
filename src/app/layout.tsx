import type { Metadata, Viewport } from "next";
import { restaurant } from "@/config/restaurant";
import { palette } from "@/design/tokens";
import { delaGothic, golos, notoSerifJp } from "./fonts";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${restaurant.name} — ${restaurant.tagline.toLowerCase()}`,
    template: `%s — ${restaurant.name}`,
  },
  description: restaurant.description,
  applicationName: restaurant.name,
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: restaurant.name,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: palette.ink,
  colorScheme: "dark",
};

/** Включает анимацию появления только при поддержке IntersectionObserver и без reduced-motion. */
const revealBootstrap = `(function(){try{if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('js-reveal')}}catch(e){}})();`;

const revealObserver = `(function(){var d=document.documentElement;if(!d.classList.contains('js-reveal'))return;var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.setAttribute('data-revealed','');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'});function scan(){document.querySelectorAll('[data-reveal]:not([data-revealed])').forEach(function(el){io.observe(el)})}scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true})})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      className={`${delaGothic.variable} ${golos.variable} ${notoSerifJp.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: revealBootstrap }} />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: revealObserver }} />
      </body>
    </html>
  );
}
