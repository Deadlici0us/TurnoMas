import type { Metadata, Viewport } from "next";
import { Geist_Mono, Mulish, Open_Sans } from "next/font/google";
import Providers from "./providers";
import RevealOnScroll from "@/components/reveal-on-scroll";
import SiteHeader from "@/components/site-header";
import "./globals.css";

const openSans = Open_Sans({ variable: "--font-open-sans", subsets: ["latin"], display: "swap" });
const mulish = Mulish({ variable: "--font-mulish", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

const APP_TITLE = "TurnoMas - Reservas Inteligentes";
const APP_DESCRIPTION = "Sistema B2B de reservas para profesionales independientes. " +
  "Eliminá las inasistencias cobrando señas y automatizando notificaciones.";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://turnomas.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: "TurnoMas",
  title: APP_TITLE,
  description: APP_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "TurnoMas",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#06adef",
};

// El CSP con nonce por request (proxy) exige render dinámico: un HTML
// pregenerado tendría un nonce viejo y bloquearía sus propios scripts.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { readonly children: React.ReactNode })
{
  const common = (await import("../messages/es-AR/common.json")).default;
  const messages = { common };
  const locale = "es-AR";
  return (
    <html
      lang={locale}
      className={`${openSans.variable} ${mulish.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface text-ink">
        <Providers messages={messages} locale={locale}>
          <RevealOnScroll />
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
