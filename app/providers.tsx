"use client";

import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

import ToastProvider from "@/components/ui/toast-provider";

export default function Providers({ messages, locale, children }: {
  readonly messages: Record<string, unknown>; readonly locale: string; readonly children: ReactNode })
{
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <ToastProvider>{children}</ToastProvider>
    </NextIntlClientProvider>
  );
}
