import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import Loader from "@/components/Loader";
import Cursor from "@/components/Cursor";
import Hud from "@/components/Hud";
import SceneRoot from "@/components/Scene/SceneRoot";
import { site } from "@/data/site";

// Self-hosted (from @fontsource) so builds never depend on Google Fonts being reachable.
const interTight = localFont({
  src: "../node_modules/@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2",
  variable: "--font-inter-tight",
  weight: "100 900",
  display: "swap",
});

const jetbrains = localFont({
  src: [
    { path: "../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2", weight: "400" },
    { path: "../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2", weight: "500" },
  ],
  variable: "--font-jetbrains",
  display: "swap",
});

const description = `${site.name}: ${site.tagline}. A journey across a contour-line landscape.`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: `${site.name} // Portfolio`,
  description,
  openGraph: {
    title: `${site.name} // Portfolio`,
    description,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: `${site.name}: The Trail` }],
    type: "website",
  },
  twitter: { card: "summary_large_image", title: site.name, description, images: ["/og.jpg"] },
};

export const viewport: Viewport = {
  themeColor: "#0b0d0e",
  colorScheme: "dark",
};

// Runs before paint: skip the loader on repeat visits / reduced motion.
const preLoaderScript = `try{var r=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(r||sessionStorage.getItem('trail:loader-seen')==='1'){document.documentElement.classList.add('skip-loader')}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${interTight.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preLoaderScript }} />
        <style>{`html.skip-loader #loader{display:none}`}</style>
        <noscript>
          <style>{`#loader{display:none!important}`}</style>
        </noscript>
      </head>
      <body>
        <a href="#main" className="sr-only-focusable mono fixed left-4 top-4 z-[110] bg-[var(--bg)] px-3 py-2">
          Skip to content
        </a>
        <SceneRoot />
        <SmoothScroll />
        <Hud />
        {children}
        <Cursor />
        <Loader />
      </body>
    </html>
  );
}
