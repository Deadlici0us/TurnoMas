import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !["es-AR", "es-MX", "en-US", "en-UK"].includes(locale as string)) {
    locale = "es-AR";
  }

  return {
    locale,
    messages: { common: (await import(`../messages/${locale}/common.json`)).default },
  };
});
