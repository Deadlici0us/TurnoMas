import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "./providers";
import AnimatedBackground from "@/components/animated-background";
import SiteHeader from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TurnoMas - Reservas Inteligentes",
  description:
    "Sistema B2B de reservas para profesionales independientes. Eliminá las inasistencias cobrando señas y automatizando notificaciones.",
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
    <html lang={locale} className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <Providers messages={messages} locale={locale}>
          <AnimatedBackground />
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}