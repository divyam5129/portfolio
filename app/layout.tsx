import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import Hud from "@/components/Hud";
import Backdrop from "@/components/Backdrop";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${interTight.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body>
        <a href="#main" className="sr-only-focusable mono fixed left-4 top-4 z-[110] bg-[var(--bg)] px-3 py-2">
          Skip to content
        </a>
        <Backdrop />
        <SmoothScroll />
        <Hud />
        {children}
      </body>
    </html>
  );
}
