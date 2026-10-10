"use client";

import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

export default function Providers({ messages, locale, children }: {
  readonly messages: Record<string, unknown>; readonly locale: string; readonly children: ReactNode })
{
  return <NextIntlClientProvider messages={messages} locale={locale}>{children}</NextIntlClientProvider>;
}