import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ locale }) =>
{
  const resolved = locale ?? "es-AR";
  const active = ["es-AR", "es-MX", "en-US", "en-UK"].includes(resolved) ? resolved : "es-AR";

  return {
    locale: active,
    messages: { common: (await import(`../messages/${active}/common.json`)).default },
  };
});
