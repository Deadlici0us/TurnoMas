import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TurnoFijo - Reservas Inteligentes",
  description:
    "Sistema B2B de reservas para profesionales independientes. Eliminá las inasistencias cobrando señas y automatizando notificaciones.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const common = (await import("../messages/es-AR/common.json")).default;
  const messages = { common };
  const locale = "es-AR";
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers messages={messages} locale={locale}>
          {children}
        </Providers>
      </body>
    </html>
  );
}