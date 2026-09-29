"use client";

import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

export default function Providers({ messages, locale, children }: { messages: Record<string, unknown>; locale: string; children: ReactNode }) {
  return <NextIntlClientProvider messages={messages} locale={locale}>{children}</NextIntlClientProvider>;
}